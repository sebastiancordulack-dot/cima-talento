'use client';

// Brand-client account management (Brief §14 — admin only): create accounts,
// edit company/brands/login email, reset the shared password, toggle portal
// access. Generated passwords display ONCE in the credentials box.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, buttonClasses, controlClasses } from '@cima/ui';
import {
  createBrandClient,
  resetClientPassword,
  setClientActive,
  updateBrandClient,
  type BrandClientInput,
} from '@/modules/activaciones/client-actions';
import type { BrandClientRow } from '@/modules/activaciones/queries';

const input = controlClasses('w-full');
const label = 'mb-1 block text-xs font-medium text-stone-600';

interface FormState {
  company_name: string;
  brands: string; // comma-separated in the form
  portal_email: string;
  contact_name: string;
  contact_phone: string;
}

const EMPTY: FormState = {
  company_name: '',
  brands: '',
  portal_email: '',
  contact_name: '',
  contact_phone: '',
};

function toInput(f: FormState): BrandClientInput {
  return {
    company_name: f.company_name,
    brands: f.brands.split(/[,\n]/).map((b) => b.trim()).filter(Boolean),
    portal_email: f.portal_email,
    contact_name: f.contact_name,
    contact_phone: f.contact_phone,
  };
}

function ClientForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  submitLabel: string;
  pending: boolean;
  onSubmit: (f: FormState) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(initial);
  const set = (k: keyof FormState, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={label}>Empresa *</label>
        <input className={input} value={f.company_name}
          onChange={(e) => set('company_name', e.target.value)} />
      </div>
      <div>
        <label className={label}>Correo de acceso *</label>
        <input type="email" className={input} value={f.portal_email}
          onChange={(e) => set('portal_email', e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Marcas (separadas por coma)</label>
        <input className={input} placeholder="Raptor Energy, Raptor Zero" value={f.brands}
          onChange={(e) => set('brands', e.target.value)} />
      </div>
      <div>
        <label className={label}>Contacto</label>
        <input className={input} value={f.contact_name}
          onChange={(e) => set('contact_name', e.target.value)} />
      </div>
      <div>
        <label className={label}>Teléfono</label>
        <input className={input} value={f.contact_phone}
          onChange={(e) => set('contact_phone', e.target.value)} />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button onClick={() => onSubmit(f)} loading={pending}>
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function ClientsPanel({ clients }: { clients: BrandClientRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Algo salió mal.');
      else router.refresh();
    });
  }

  function create(f: FormState) {
    setError(null);
    setCredentials(null);
    start(async () => {
      const res = await createBrandClient(toInput(f));
      if (!res.ok) {
        setError(res.error ?? 'No se pudo crear el cliente.');
        return;
      }
      setCredentials({ email: f.portal_email.trim().toLowerCase(), password: res.password! });
      setShowAdd(false);
      router.refresh();
    });
  }

  function reset(client: BrandClientRow) {
    if (!window.confirm(`¿Generar una nueva contraseña para ${client.company_name}? La actual dejará de funcionar.`)) return;
    setError(null);
    setCredentials(null);
    start(async () => {
      const res = await resetClientPassword(client.id);
      if (!res.ok) {
        setError(res.error ?? 'No se pudo restablecer la contraseña.');
        return;
      }
      setCredentials({ email: client.portal_email, password: res.password! });
    });
  }

  return (
    <div className="space-y-4">
      {credentials && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900">
            Credenciales del portal — cópialas ahora, no se volverán a mostrar
          </p>
          <div className="mt-2 rounded-xl bg-white p-3 font-mono text-sm text-stone-800">
            <p>{credentials.email}</p>
            <p className="mt-1 font-semibold">{credentials.password}</p>
          </div>
          <button
            onClick={() => setCredentials(null)}
            className="mt-2 text-xs text-green-700 underline"
          >
            Listo, las guardé
          </button>
        </div>
      )}

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {showAdd ? (
        <section className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Nuevo cliente</h2>
          <ClientForm
            initial={EMPTY}
            submitLabel={pending ? 'Creando…' : 'Crear cuenta'}
            pending={pending}
            onSubmit={create}
            onCancel={() => setShowAdd(false)}
          />
        </section>
      ) : (
        <button onClick={() => setShowAdd(true)} className={buttonClasses('primary')}>
          + Agregar cliente
        </button>
      )}

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-stone-900">Sin clientes aún</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Crea la primera cuenta para que un cliente de marca pueda entrar al portal y enviar
            solicitudes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200/70 bg-white shadow-card">
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-stone-400">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Acceso</th>
                <th className="px-4 py-3">Marcas</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Solicitudes</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {clients.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  editing={editingId === c.id}
                  pending={pending}
                  onEdit={() => setEditingId(c.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(f) =>
                    run(async () => {
                      const res = await updateBrandClient(c.id, toInput(f));
                      if (res.ok) setEditingId(null);
                      return res;
                    })
                  }
                  onReset={() => reset(c)}
                  onToggle={() => {
                    const q = c.active
                      ? `¿Desactivar el acceso de ${c.company_name} al portal?`
                      : `¿Reactivar el acceso de ${c.company_name}?`;
                    if (window.confirm(q)) run(() => setClientActive(c.id, !c.active));
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClientRow({
  client: c,
  editing,
  pending,
  onEdit,
  onCancelEdit,
  onSave,
  onReset,
  onToggle,
}: {
  client: BrandClientRow;
  editing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (f: FormState) => void;
  onReset: () => void;
  onToggle: () => void;
}) {
  if (editing) {
    return (
      <tr>
        <td colSpan={7} className="bg-stone-50/60 px-4 py-4">
          <ClientForm
            initial={{
              company_name: c.company_name,
              brands: c.brands.join(', '),
              portal_email: c.portal_email,
              contact_name: c.contact_name ?? '',
              contact_phone: c.contact_phone ?? '',
            }}
            submitLabel={pending ? 'Guardando…' : 'Guardar'}
            pending={pending}
            onSubmit={onSave}
            onCancel={onCancelEdit}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className={c.active ? '' : 'opacity-60'}>
      <td className="px-4 py-3 font-medium text-stone-900">{c.company_name}</td>
      <td className="px-4 py-3 text-stone-600">{c.portal_email}</td>
      <td className="px-4 py-3">
        <span className="flex flex-wrap gap-1">
          {c.brands.map((b) => (
            <span key={b} className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
              {b}
            </span>
          ))}
        </span>
      </td>
      <td className="px-4 py-3 text-stone-600">
        {[c.contact_name, c.contact_phone].filter(Boolean).join(' · ') || '—'}
      </td>
      <td className="px-4 py-3 tabular-nums text-stone-600">{c.solicitud_count}</td>
      <td className="px-4 py-3">
        <Badge tone={c.active ? 'green' : 'gray'} dot>
          {c.active ? 'Activo' : 'Inactivo'}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
        <button onClick={onEdit} disabled={pending} className="font-medium text-brand-700 hover:underline disabled:opacity-50">
          Editar
        </button>
        <button onClick={onReset} disabled={pending} className="ml-3 font-medium text-stone-500 hover:underline disabled:opacity-50">
          Nueva contraseña
        </button>
        <button onClick={onToggle} disabled={pending} className="ml-3 font-medium text-stone-500 hover:underline disabled:opacity-50">
          {c.active ? 'Desactivar' : 'Reactivar'}
        </button>
      </td>
    </tr>
  );
}
