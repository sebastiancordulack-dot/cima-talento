import { PageHeader } from '@cima/ui';
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
      <PageHeader
        title="Clientes"
        description="Cuentas del Client Portal: una cuenta compartida por empresa. Al crear una cuenta o restablecer su contraseña, cópiala y envíala al cliente — no se guarda en ningún lado."
      />
      <div className="mt-6">
        <ClientsPanel clients={clients} />
      </div>
    </div>
  );
}
