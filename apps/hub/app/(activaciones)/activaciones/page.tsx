// Solicitudes queue (Activaciones Brief §12.1) — placeholder until build-order
// Step 3 lands the tabbed queue (Nuevas / En revisión / Pendiente de cliente /
// Confirmadas / Historial).
export default function SolicitudesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Solicitudes</h1>
      <p className="mt-1 text-sm text-gray-500">
        Cola de solicitudes de activación enviadas por los clientes.
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">Aún no hay solicitudes</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
          Cuando un cliente envíe una solicitud desde el Client Portal, aparecerá aquí para
          revisión, cotización y confirmación.
        </p>
      </div>
    </div>
  );
}
