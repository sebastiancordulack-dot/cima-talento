'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { geoAlbersUsa } from 'd3-geo';
import type { MetroCount } from '@/lib/talent/queries';

// Viewport + projection. The HTML dot/popup overlay reuses this exact
// projection so the dots line up with the SVG state outlines below them.
const WIDTH = 800;
const HEIGHT = 500;
const SCALE = 900;
const projection = geoAlbersUsa().scale(SCALE).translate([WIDTH / 2, HEIGHT / 2]);

const GEO_URL = '/us-states-10m.json';

// Dot radius (px) scales with headcount so area ≈ count. Clamped so a single
// person is still tappable and a big metro doesn't swallow its neighbors.
function radiusFor(total: number): number {
  return Math.max(7, Math.min(24, 5 + Math.sqrt(total) * 4));
}

interface Plotted extends MetroCount {
  x: number; // percent of width
  y: number; // percent of height
}

export function TalentMap({
  metros,
  activeMetro,
}: {
  metros: MetroCount[];
  activeMetro?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  // Project each metro to a percentage position within the viewBox. Anything
  // geoAlbersUsa can't place (shouldn't happen for our metros) is dropped.
  const plotted: Plotted[] = [];
  for (const m of metros) {
    const xy = projection(m.coords);
    if (!xy) continue;
    plotted.push({ ...m, x: (xy[0] / WIDTH) * 100, y: (xy[1] / HEIGHT) * 100 });
  }

  function onDotClick(metro: string) {
    // First click reveals the popup; clicking the same dot again jumps to the
    // metro-filtered pool below.
    if (selected === metro) {
      router.push(`/dashboard?tab=talento&metro=${encodeURIComponent(metro)}`);
      return;
    }
    setSelected(metro);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Mapa de la Red de Talento</h3>
        <p className="hidden text-xs text-gray-400 sm:block">
          Clic en un punto para ver el conteo · clic de nuevo para abrir la red
        </p>
      </div>

      {/* relative wrapper: the SVG sets the height (width:100%, height:auto) and
          the absolute overlay matches it exactly, so percentage-positioned dots
          align with the projected outlines. */}
      <div className="relative" onClick={() => setSelected(null)}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: SCALE }}
          width={WIDTH}
          height={HEIGHT}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: '#e2e8f0' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
        </ComposableMap>

        <div className="pointer-events-none absolute inset-0">
          {plotted.map((m) => {
            const r = radiusFor(m.total);
            const isActive = m.metro === activeMetro;
            const isOpen = m.metro === selected;
            return (
              <div
                key={m.metro}
                className="absolute"
                style={{ left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {/* Dot */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDotClick(m.metro);
                  }}
                  aria-label={`${m.metro}: ${m.active} activos de ${m.total}`}
                  className={`pointer-events-auto block rounded-full ring-2 ring-white transition-transform hover:scale-110 ${
                    isActive || isOpen ? 'bg-blue-600' : 'bg-blue-500/80'
                  }`}
                  style={{ width: r * 2, height: r * 2 }}
                />

                {/* Popup */}
                {isOpen && (
                  <div
                    className="pointer-events-auto absolute left-1/2 z-10 w-44 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-lg"
                    style={{ bottom: r * 2 + 8 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm font-semibold text-gray-900">{m.metro}</p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      <span className="font-semibold text-green-700">{m.active} activos</span>
                      {' / '}
                      {m.total} en total
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard?tab=talento&metro=${encodeURIComponent(m.metro)}`
                        )
                      }
                      className="mt-2 w-full rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Ver la red aquí →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {plotted.length === 0 && (
        <p className="mt-3 text-center text-sm text-gray-400">
          Aún no hay personas con metro asignado para mostrar en el mapa.
        </p>
      )}
    </div>
  );
}
