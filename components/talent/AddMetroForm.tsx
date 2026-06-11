'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addMetro } from '@/lib/metros/actions';

// Splits a comma/line-separated free-text list into trimmed values.
function splitList(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function AddMetroForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [showCoords, setShowCoords] = useState(false);

  const [f, setF] = useState({
    metro: '',
    state: '',
    cities: '',
    zip3: '',
    lat: '',
    lng: '',
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const input =
    'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400';

  function submit() {
    setError(null);
    setDone(null);
    const lat = f.lat.trim() ? Number(f.lat) : undefined;
    const lng = f.lng.trim() ? Number(f.lng) : undefined;
    if ((lat != null && Number.isNaN(lat)) || (lng != null && Number.isNaN(lng))) {
      setError('Las coordenadas deben ser números (p. ej. 39.74 y -104.99).');
      return;
    }

    start(async () => {
      const res = await addMetro({
        metro: f.metro,
        state: f.state,
        cities: splitList(f.cities),
        zip3: splitList(f.zip3),
        lat,
        lng,
      });
      if (res.ok) {
        setDone(`«${f.metro.trim()}» se agregó. Aparecerá en el mapa cuando haya personas asignadas.`);
        router.refresh();
        setF({ metro: '', state: '', cities: '', zip3: '', lat: '', lng: '' });
        setShowCoords(false);
      } else {
        setError(res.error ?? 'No se pudo agregar.');
        // Couldn't auto-locate → reveal manual coordinate fields.
        if (res.error?.includes('ubicar')) setShowCoords(true);
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-1 text-sm font-semibold text-gray-700">Agregar un metro</h3>
      <p className="mb-3 text-xs text-gray-400">
        La ubicación en el mapa se detecta automáticamente a partir del nombre y el estado.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Nombre del metro *</label>
          <input
            className={input}
            value={f.metro}
            onChange={(e) => set('metro', e.target.value)}
            placeholder="Denver"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Estado *</label>
          <input
            className={input}
            value={f.state}
            onChange={(e) => set('state', e.target.value)}
            placeholder="CO"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-500">
            Ciudades (opcional — separa con comas)
          </label>
          <input
            className={input}
            value={f.cities}
            onChange={(e) => set('cities', e.target.value)}
            placeholder="denver, aurora, lakewood, boulder"
          />
          <p className="mt-1 text-xs text-gray-400">
            Permite asignar automáticamente nuevas solicitudes de estas ciudades a este metro.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-500">
            Códigos postales (opcional — primeros 3 dígitos, separa con comas)
          </label>
          <input
            className={input}
            value={f.zip3}
            onChange={(e) => set('zip3', e.target.value)}
            placeholder="800, 801, 802"
          />
        </div>
      </div>

      {/* Manual coordinates — optional, and auto-revealed if auto-locate fails. */}
      <button
        type="button"
        onClick={() => setShowCoords((s) => !s)}
        className="mt-3 text-xs font-medium text-blue-700 hover:underline"
      >
        {showCoords ? 'Ocultar' : 'Ingresar'} coordenadas manualmente (opcional)
      </button>
      {showCoords && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Latitud</label>
            <input
              className={input}
              value={f.lat}
              onChange={(e) => set('lat', e.target.value)}
              placeholder="39.74"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Longitud</label>
            <input
              className={input}
              value={f.lng}
              onChange={(e) => set('lng', e.target.value)}
              placeholder="-104.99"
            />
          </div>
          <p className="col-span-2 text-xs text-gray-400">
            Busca «[ciudad] lat long» en Google. Latitud primero, longitud (negativa en EE. UU.) después.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {done && <p className="mt-3 text-sm text-green-700">{done}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Agregando…' : 'Agregar metro'}
        </button>
        <button
          onClick={onDone}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {done ? 'Cerrar' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
}
