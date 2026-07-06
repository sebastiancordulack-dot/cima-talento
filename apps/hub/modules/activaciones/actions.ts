'use server';

// Solicitud workspace server actions (Activaciones Brief §12.2). Any active
// staff member may review/quote/manage (Brief §10 — only client provisioning
// is admin-gated). Writes go through the service-role client after the
// assertUser guard, matching the Talento actions pattern.
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@cima/db/admin';
import { assertUser, AuthError } from '@/lib/auth/session';
import { quoteTotal, type QuoteData } from '@cima/activaciones/quote';
import { TransitionError, transitionSolicitud } from '@cima/activaciones/transitions';
import type { Database, SolicitudStatus } from '@cima/db';

type SolicitudPatch = Database['public']['Tables']['solicitudes']['Update'];

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError || err instanceof TransitionError) {
    return { ok: false, error: err.message };
  }
  console.error('[activaciones/actions]', err);
  return { ok: false, error: 'Algo salió mal. Intenta de nuevo.' };
}

function revalidate(solicitudId: string) {
  revalidatePath('/activaciones');
  revalidatePath(`/activaciones/solicitudes/${solicitudId}`);
}

/** Trimmed string or null — internal text fields store null, not ''. */
function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

// ---- Internal fields (§7) ----------------------------------------------------

export interface InternalFieldsInput {
  internal_notes?: string | null;
  verification_notes?: string | null;
  // In-store
  store_condition?: string | null;
  product_location_in_store?: string | null;
  // Field event
  coi_required?: boolean | null;
  coi_named_insured?: string | null;
  coi_status?: 'pending' | 'submitted' | 'approved' | null;
  participation_agreement_required?: boolean | null;
  participation_agreement_payment?: boolean | null;
  participation_agreement_amount?: number | null;
  third_party_vendors?: string | null;
  fabrication_notes?: string | null;
  logistics_notes?: string | null;
  asset_delivery_status?: string | null;
  content_creation_brief?: string | null;
}

const TEXT_FIELDS = [
  'internal_notes',
  'verification_notes',
  'store_condition',
  'product_location_in_store',
  'coi_named_insured',
  'third_party_vendors',
  'fabrication_notes',
  'logistics_notes',
  'asset_delivery_status',
  'content_creation_brief',
] as const;

export async function updateInternalFields(
  solicitudId: string,
  input: InternalFieldsInput
): Promise<ActionResult> {
  try {
    await assertUser();

    // Whitelist: only §7 internal fields, only keys actually provided.
    const patch: SolicitudPatch = {};
    for (const key of TEXT_FIELDS) {
      if (key in input) patch[key] = clean(input[key]);
    }
    if ('coi_required' in input) patch.coi_required = input.coi_required ?? null;
    if ('coi_status' in input) patch.coi_status = input.coi_status ?? null;
    if ('participation_agreement_required' in input) {
      patch.participation_agreement_required = input.participation_agreement_required ?? null;
    }
    if ('participation_agreement_payment' in input) {
      patch.participation_agreement_payment = input.participation_agreement_payment ?? null;
    }
    if ('participation_agreement_amount' in input) {
      const amount = input.participation_agreement_amount;
      if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
        return { ok: false, error: 'El monto del acuerdo debe ser un número positivo.' };
      }
      patch.participation_agreement_amount = amount ?? null;
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await createAdminClient()
      .from('solicitudes')
      .update(patch)
      .eq('id', solicitudId);
    if (error) throw error;

    revalidate(solicitudId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Take/releasse ownership of the request (queue "Asignada a" — §12.1). */
export async function setReviewer(solicitudId: string, take: boolean): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const { error } = await createAdminClient()
      .from('solicitudes')
      .update({ reviewed_by: take ? user.hm!.id : null })
      .eq('id', solicitudId);
    if (error) throw error;
    revalidate(solicitudId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---- Quote (§12.2) -------------------------------------------------------------

/** IDs covered by a quote: the whole batch for multi-location submissions
 *  (one quote, itemized per location — §6A), else just the row itself. */
async function quoteMemberIds(solicitudId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from('solicitudes')
    .select('id,batch_id')
    .eq('id', solicitudId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new TransitionError('Solicitud no encontrada.');
  if (!row.batch_id) return [row.id];

  const { data: members, error: mErr } = await supabase
    .from('solicitudes')
    .select('id')
    .eq('batch_id', row.batch_id);
  if (mErr) throw mErr;
  return (members ?? []).map((m) => m.id);
}

export async function saveQuoteDraft(
  solicitudId: string,
  quote: QuoteData,
  notes: string | null
): Promise<ActionResult> {
  try {
    await assertUser();

    for (const section of quote.sections) {
      for (const item of section.items) {
        if (!item.concept.trim()) return { ok: false, error: 'Cada concepto necesita una descripción.' };
        if (!Number.isFinite(item.amount) || item.amount < 0) {
          return { ok: false, error: `Monto inválido en “${item.concept}”.` };
        }
      }
    }

    const total = quoteTotal(quote.sections);
    const payload: QuoteData = { sections: quote.sections, total };
    const ids = await quoteMemberIds(solicitudId);

    // The same quote object lives on every batch row, so the portal sees the
    // full itemization no matter which location record it opens.
    const { error } = await createAdminClient()
      .from('solicitudes')
      .update({
        quote_line_items: payload as unknown as Record<string, unknown>,
        quote_amount: total,
        quote_notes: clean(notes),
      })
      .in('id', ids);
    if (error) throw error;

    revalidate(solicitudId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** "Send Quote" — flips the whole quote scope (batch or single) to quote_sent.
 *  The client-facing email fires from the transition hook (Step 5). */
export async function sendQuote(solicitudId: string): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const supabase = createAdminClient();

    const { data: row, error } = await supabase
      .from('solicitudes')
      .select('id,quote_amount')
      .eq('id', solicitudId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false, error: 'Solicitud no encontrada.' };
    if (!row.quote_amount || row.quote_amount <= 0) {
      return { ok: false, error: 'Guarda una cotización con monto antes de enviarla.' };
    }

    // Send the whole batch, tolerating divergent rows (e.g. one location was
    // individually cancelled): only in_review members transition. The client
    // is nudged exactly once — from the row the staff member acted on.
    const ids = await quoteMemberIds(solicitudId);
    const { data: members, error: mError } = await supabase
      .from('solicitudes')
      .select('id,status')
      .in('id', ids);
    if (mError) throw mError;

    const target = (members ?? []).find((m) => m.id === solicitudId);
    if (!target || target.status !== 'in_review') {
      return { ok: false, error: 'La solicitud debe estar en revisión para enviar la cotización.' };
    }

    for (const m of members ?? []) {
      if (m.status !== 'in_review') continue;
      await transitionSolicitud(m.id, 'quote_sent', {
        actorId: user.hm!.id,
        actorType: 'cima_staff',
        suppressNotify: m.id !== solicitudId,
      });
    }

    revalidate(solicitudId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---- Propose change (§12.2) ----------------------------------------------------

export interface ProposeChangeInput {
  change_type: string;
  original_value: string;
  proposed_value: string;
  reason: string;
}

export async function proposeChange(
  solicitudId: string,
  input: ProposeChangeInput
): Promise<ActionResult> {
  try {
    const user = await assertUser();
    if (!input.change_type.trim()) return { ok: false, error: 'Indica el tipo de cambio.' };
    if (!input.proposed_value.trim()) return { ok: false, error: 'Indica el valor propuesto.' };

    const { error } = await createAdminClient().from('solicitud_changes').insert({
      solicitud_id: solicitudId,
      proposed_by: user.hm!.id,
      change_type: input.change_type.trim(),
      original_value: clean(input.original_value),
      proposed_value: input.proposed_value.trim(),
      reason: clean(input.reason),
    });
    if (error) throw error;

    await transitionSolicitud(solicitudId, 'changes_proposed', {
      actorId: user.hm!.id,
      actorType: 'cima_staff',
      note: `Cambio propuesto: ${input.change_type.trim()}`,
    });

    revalidate(solicitudId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---- Talent assignment (§16) -----------------------------------------------------

export async function assignTalent(
  solicitudId: string,
  talentPoolId: string
): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const { error } = await createAdminClient().from('solicitud_assignments').insert({
      solicitud_id: solicitudId,
      talent_pool_id: talentPoolId,
      assigned_by: user.hm!.id,
    });
    if (error) {
      // 23P01 = the DB date-conflict guard (same person, overlapping dates).
      if (error.code === '23P01') {
        return {
          ok: false,
          error: 'Esta persona ya está asignada a otra activación en esa fecha. Nadie puede estar en dos lugares a la vez.',
        };
      }
      if (error.code === '23505') {
        return { ok: false, error: 'Esta persona ya está asignada a esta solicitud.' };
      }
      throw error;
    }

    revalidate(solicitudId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function unassignTalent(
  solicitudId: string,
  assignmentId: string
): Promise<ActionResult> {
  try {
    await assertUser();
    const { error } = await createAdminClient()
      .from('solicitud_assignments')
      .delete()
      .eq('id', assignmentId);
    if (error) throw error;
    revalidate(solicitudId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---- Manual status progression (§12.2) ---------------------------------------------

export async function setSolicitudStatus(
  solicitudId: string,
  to: SolicitudStatus
): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await transitionSolicitud(solicitudId, to, {
      actorId: user.hm!.id,
      actorType: 'cima_staff',
    });
    revalidate(solicitudId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
