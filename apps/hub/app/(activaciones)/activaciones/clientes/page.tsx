import { ClientsPanel } from '@/components/activaciones/ClientsPanel';
import { requireAdmin } from '@/lib/auth/session';
import { listBrandClients } from '@/modules/activaciones/queries';

export const dynamic = 'force-dynamic';

// Brand-client account management (Activaciones Brief §14) — admin only.
export default async function ClientesPage() {
  await requireAdmin();
  const clients = await listBrandClients();

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
      <p className="mt-1 text-sm text-gray-500">
        Cuentas del Client Portal: una cuenta compartida por empresa. Al crear una cuenta o
        restablecer su contraseña, cópiala y envíala al cliente — no se guarda en ningún lado.
      </p>
      <div className="mt-6">
        <ClientsPanel clients={clients} />
      </div>
    </div>
  );
}
