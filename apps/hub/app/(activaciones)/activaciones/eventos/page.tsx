import Link from 'next/link';
import { EventQuickAction } from '@/components/activaciones/EventQuickAction';
import {
  ActivationTypeBadge,
  SolicitudStatusBadge,
} from '@/components/activaciones/SolicitudBadges';
import { fullName } from '@/lib/format';
import { formatSolicitudDates } from '@cima/activaciones/dates';
import {
  addMonths,
  buildMonthGrid,
  currentMonthKey,
  eventDays,
  isMonthKey,
  monthLabel,
  todayKey,
} from '@/modules/activaciones/calendar';
import { listConfirmedEvents, type EventRow } from '@/modules/activaciones/queries';

export const dynamic = 'force-dynamic';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function eventTime(e: EventRow): string | null {
  const start = e.activation_type === 'in_store' ? e.time_start : e.activation_time_start;
  const end = e.activation_type === 'in_store' ? e.time_end : e.activation_time_end;
  return start && end ? `${start.slice(0, 5)} – ${end.slice(0, 5)}` : null;
}

function talentNames(e: EventRow): string[] {
  return e.solicitud_assignments
    .map((a) => a.talent?.candidates)
    .filter((c): c is { first_name: string; last_name: string | null } => !!c)
    .map((c) => fullName(c.first_name, c.last_name));
}

// Confirmed Events Tracker (Brief §12.3): month calendar + detail list of
// confirmed and in-progress activations, with the quick forward action.
export default async function EventosPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const month = isMonthKey(searchParams.mes) ? searchParams.mes : currentMonthKey();
  const today = todayKey();
  const events = await listConfirmedEvents();

  // day → events (multi-day field events occupy every day of their range).
  const byDay = new Map<string, EventRow[]>();
  for (const e of events) {
    for (const day of eventDays(e)) {
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(e);
    }
  }
  const weeks = buildMonthGrid(month);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Eventos Confirmados</h1>
          <p className="mt-1 text-sm text-gray-500">
            Activaciones confirmadas y en ejecución, con su equipo asignado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/activaciones/eventos?mes=${addMonths(month, -1)}`}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            aria-label="Mes anterior"
          >
            ←
          </Link>
          <span className="min-w-36 text-center text-sm font-semibold text-gray-900">
            {monthLabel(month)}
          </span>
          <Link
            href={`/activaciones/eventos?mes=${addMonths(month, 1)}`}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            aria-label="Mes siguiente"
          >
            →
          </Link>
        </div>
      </div>

      {/* ---- Calendar ---- */}
      <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
              {week.map((day) => {
                const dayEvents = byDay.get(day.date) ?? [];
                return (
                  <div
                    key={day.date}
                    className={`min-h-20 border-r border-gray-50 p-1.5 last:border-r-0 ${
                      day.inMonth ? '' : 'bg-gray-50/60'
                    }`}
                  >
                    <p
                      className={`text-right text-xs ${
                        day.date === today
                          ? 'ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-green-600 font-semibold text-white'
                          : day.inMonth
                            ? 'text-gray-500'
                            : 'text-gray-300'
                      }`}
                    >
                      {Number(day.date.slice(8))}
                    </p>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <Link
                          key={`${day.date}-${e.id}`}
                          href={`/activaciones/solicitudes/${e.id}`}
                          className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium hover:opacity-80 ${
                            e.status === 'in_progress'
                              ? 'bg-green-600 text-white'
                              : 'bg-green-100 text-green-800'
                          }`}
                          title={`${e.brand} — ${e.activation_type === 'in_store' ? e.store_name : e.event_name}`}
                        >
                          {e.brand}
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="px-1.5 text-[11px] text-gray-400">+{dayEvents.length - 3} más</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ---- List ---- */}
      {events.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-900">Sin eventos confirmados</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Cuando confirmes una solicitud aprobada por el cliente, aparecerá aquí y en el
            calendario.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {events.map((e) => {
            const names = talentNames(e);
            const time = eventTime(e);
            return (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/activaciones/solicitudes/${e.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {e.brand} — {e.activation_type === 'in_store' ? e.store_name : e.event_name}
                    </Link>
                    <ActivationTypeBadge type={e.activation_type} />
                    <SolicitudStatusBadge status={e.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatSolicitudDates(e)}
                    {time && <> · {time}</>}
                    {' · '}
                    {e.activation_type === 'in_store' ? e.store_address : e.event_address}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {names.length > 0 ? (
                      <>
                        Equipo:{' '}
                        <span className="text-gray-600">{names.join(', ')}</span>
                        {e.num_brand_ambassadors != null && names.length < e.num_brand_ambassadors && (
                          <span className="ml-1 text-amber-600">
                            ({names.length}/{e.num_brand_ambassadors} asignados)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-600">Sin talento asignado todavía</span>
                    )}
                    {e.brand_clients && <> · {e.brand_clients.company_name}</>}
                  </p>
                </div>
                <EventQuickAction solicitudId={e.id} status={e.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
