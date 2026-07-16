// Admin-only, one-off: classify pre-existing Meta-lead candidates by form name
// (see lib/candidates/backfill-roles.ts). Lives as a route so it runs on
// Vercel, where the sensitive META_PAGE_ACCESS_TOKEN is available — it can't
// be viewed or exported for a local run.
//
//   GET /api/admin/backfill-roles              dry run (default 40 candidates)
//   GET /api/admin/backfill-roles?limit=100    bigger batch
//   GET /api/admin/backfill-roles?apply=1      write role + form provenance
//
// Requires a signed-in admin (Julia/admin) — open it in the browser while
// logged into the hub. Batched and resumable: re-invoke until remaining=0.
// Safe to remove after the backfill is done.
import { NextResponse } from 'next/server';
import { backfillRoles } from '@/lib/candidates/backfill-roles';
import { assertAdmin, AuthError } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    await assertAdmin();
  } catch (err) {
    const message = err instanceof AuthError ? err.message : 'No autorizado.';
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const apply = params.get('apply') === '1';
  const limit = Math.min(Math.max(Number(params.get('limit')) || 40, 1), 100);

  try {
    const report = await backfillRoles({ apply, limit });
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[backfill-roles] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
