import { requireAdmin } from '@/lib/auth/session';

// Brand-client account management (Activaciones Brief §14) — admin only.
// Placeholder until build-order Step 8 lands provisioning (create account,
// set brands, generate/reset portal password).
export default async function ClientesPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
      <p className="mt-1 text-sm text-gray-500">
        Cuentas de clientes de marca con acceso al Client Portal.
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">Sin clientes aún</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
          Desde aquí se crearán y administrarán las cuentas del portal: empresa, marcas, correo de
          acceso y contraseña.
        </p>
      </div>
    </div>
  );
}
