// Confirmed events tracker (Activaciones Brief §12.3) — placeholder until
// build-order Step 9 lands the calendar + list view.
export default function EventosConfirmadosPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Eventos Confirmados</h1>
      <p className="mt-1 text-sm text-gray-500">
        Calendario y listado de activaciones confirmadas y en ejecución.
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">Sin eventos confirmados</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
          Los eventos aparecerán aquí cuando una solicitud aprobada por el cliente sea confirmada
          por el equipo CiMA.
        </p>
      </div>
    </div>
  );
}
