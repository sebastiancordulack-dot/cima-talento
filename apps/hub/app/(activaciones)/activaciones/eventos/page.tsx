import Link from 'next/link';
import {
  PageHeader,
  buttonClasses,
  segmentedContainerClasses,
  segmentedItemClasses,
} from '@cima/ui';
import { EventQuickAction } from '@/components/activaciones/EventQuickAction';
import {
  ActivationTypeBadge,
  SolicitudStatusBadge,
} from '@/components/activaciones/SolicitudBadges';
import { fullName } from '@/lib/format';
import { formatSolicitudDates } from '@cima/activaciones/dates';
import {
  addDays,
  addMonths,
  buildMonthGrid,
  dayLabel,
  eventDays,
  isDateKey,
  monthLabel,
  shortDayLabel,
  todayKey,
  weekLabel,
  weekOf,
} from '@/modules/activaciones/calendar';
import { listConfirmedEvents, type EventRow } from '@/modules/activaciones/queries';

export const dynamic = 'force-dynamic';

// Confirmed Events Tracker (Brief §12.3), Google-Calendar style: Día /
// Semana / Mes views, «Hoy» + arrow navigation — all URL-driven so the page
// stays a server component.

type Vista = 'dia' | 'semana' | 'mes';
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const href = (vista: Vista, fecha: string) => `/activaciones/eventos?vista=${vista}&fecha=${fecha}`;

function eventTime(e: EventRow): string | null {
  const start = e.activation_type === 'in_store' ? e.time_start : e.activation_time_start;
  const end = e.activation_type === 'in_store' ? e.time_end : e.activation_time_end;
  return start && end ? `${start.slice(0, 5)} – ${end.slice(0, 5)}` : null;
}

function startTime(e: EventRow): string {
  const t = e.activation_type === 'in_store' ? e.time_start : e.activation_time_start;
  return t ? t.slice(0, 5) : '';
}

function talentNames(e: EventRow): string[] {
  return e.solicitud_assignments
    .map((a) => a.talent?.candidates)
    .filter((c): c is { first_name: string; last_name: string | null } => !!c)
    .map((c) => fullName(c.first_name, c.last_name));
}

function placeOf(e: EventRow): string | null {
  return e.activation_type === 'in_store' ? e.store_name : e.event_name;
}

export default async function EventosPage({
  searchParams,
}: {
  searchParams: { vista?: string; fecha?: string };
}) {
  const vista: Vista = ['dia', 'semana', 'mes'].includes(searchParams.vista ?? '')
    ? (searchParams.vista as Vista)
    : 'mes';
  const today = todayKey();
  const fecha = isDateKey(searchParams.fecha) ? searchParams.fecha : today;
  const events = await listConfirmedEvents();

  // day → events (multi-day field events occupy every day of their range).
  const byDay = new Map<string, EventRow[]>();
  for (const e of events) {
    for (const day of eventDays(e)) {
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(e);
    }
  }

  const month = fecha.slice(0, 7);
  const prevFecha =
    vista === 'dia' ? addDays(fecha, -1) : vista === 'semana' ? addDays(fecha, -7) : `${addMonths(month, -1)}-01`;
  const nextFecha =
    vista === 'dia' ? addDays(fecha, 1) : vista === 'semana' ? addDays(fecha, 7) : `${addMonths(month, 1)}-01`;
  const label =
    vista === 'dia' ? dayLabel(fecha) : vista === 'semana' ? weekLabel(weekOf(fecha)) : monthLabel(month);

  return (
    <div>
      <PageHeader
        title="Eventos Confirmados"
        description="Activaciones confirmadas y en ejecución, con su equipo asignado."
      />

      {/* ---- Toolbar: Hoy · ‹ › · label ······ view switcher ---- */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={href(vista, today)} className={buttonClasses('secondary')}>
            Hoy
          </Link>
          <Link
            href={href(vista, prevFecha)}
            aria-label="Anterior"
            className={buttonClasses('secondary', 'md', 'px-3')}
          >
            ‹
          </Link>
          <Link
            href={href(vista, nextFecha)}
            aria-label="Siguiente"
            className={buttonClasses('secondary', 'md', 'px-3')}
          >
            ›
          </Link>
          <span className="ml-1 text-base font-semibold text-stone-900">{label}</span>
        </div>

        <nav className={segmentedContainerClasses()}>
          {(
            [
              ['dia', 'Día'],
              ['semana', 'Semana'],
              ['mes', 'Mes'],
            ] as [Vista, string][]
          ).map(([v, l]) => (
            <Link key={v} href={href(v, fecha)} className={segmentedItemClasses(vista === v)}>
              {l}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {vista === 'mes' && <MonthView month={month} byDay={byDay} today={today} />}
        {vista === 'semana' && <WeekView days={weekOf(fecha)} byDay={byDay} today={today} />}
        {vista === 'dia' && <DayView events={byDay.get(fecha) ?? []} />}
      </div>

      <UpcomingList events={events} today={today} />
    </div>
  );
}

// ---- Mes -----------------------------------------------------------------------

function MonthView({
  month,
  byDay,
  today,
}: {
  month: string;
  byDay: Map<string, EventRow[]>;
  today: string;
}) {
  const weeks = buildMonthGrid(month);
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-card">
      <div className="grid grid-cols-7 border-b border-stone-200/70 bg-stone-50/60">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-stone-400"
          >
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 divide-x divide-stone-100 border-b border-stone-100 last:border-b-0">
          {week.map((day) => {
            const dayEvents = byDay.get(day.date) ?? [];
            const isToday = day.date === today;
            return (
              <div
                key={day.date}
                className={`min-h-28 p-1.5 ${day.inMonth ? 'bg-white' : 'bg-stone-50/50'}`}
              >
                <div className="flex justify-end">
                  <Link
                    href={href('dia', day.date)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors ${
                      isToday
                        ? 'bg-brand-700 font-semibold text-white'
                        : day.inMonth
                          ? 'text-stone-600 hover:bg-stone-100'
                          : 'text-stone-300'
                    }`}
                  >
                    {Number(day.date.slice(8))}
                  </Link>
                </div>
                <div className="mt-0.5 space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <EventChip key={`${day.date}-${e.id}`} event={e} />
                  ))}
                  {dayEvents.length > 3 && (
                    <Link
                      href={href('dia', day.date)}
                      className="block px-1.5 text-[11px] font-medium text-stone-400 hover:text-stone-600"
                    >
                      +{dayEvents.length - 3} más
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---- Semana --------------------------------------------------------------------

function WeekView({
  days,
  byDay,
  today,
}: {
  days: string[];
  byDay: Map<string, EventRow[]>;
  today: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-card">
      <div className="grid grid-cols-7 divide-x divide-stone-100 border-b border-stone-200/70 bg-stone-50/60">
        {days.map((day) => (
          <Link
            key={day}
            href={href('dia', day)}
            className="px-2 py-2 text-center text-xs font-medium text-stone-500 hover:bg-stone-100"
          >
            <span
              className={
                day === today
                  ? 'rounded-full bg-brand-700 px-2 py-0.5 font-semibold text-white'
                  : ''
              }
            >
              {shortDayLabel(day)}
            </span>
          </Link>
        ))}
      </div>
      <div className="grid min-h-72 grid-cols-7 divide-x divide-stone-100">
        {days.map((day) => {
          const dayEvents = byDay.get(day) ?? [];
          return (
            <div key={day} className={`space-y-1.5 p-1.5 ${day === today ? 'bg-brand-50/40' : ''}`}>
              {dayEvents.map((e) => (
                <Link
                  key={`${day}-${e.id}`}
                  href={`/activaciones/solicitudes/${e.id}`}
                  className={`block rounded-md px-2 py-1.5 text-[11px] leading-tight transition-opacity hover:opacity-80 ${
                    e.status === 'in_progress'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-900'
                  }`}
                >
                  {startTime(e) && <span className="font-medium opacity-75">{startTime(e)}</span>}
                  <span className="block truncate font-semibold">{e.brand}</span>
                  <span className="block truncate opacity-75">{placeOf(e)}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Día -----------------------------------------------------------------------

function DayView({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <p className="text-sm text-stone-400">Sin eventos este día.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}

// ---- Shared pieces ---------------------------------------------------------------

function EventChip({ event: e }: { event: EventRow }) {
  return (
    <Link
      href={`/activaciones/solicitudes/${e.id}`}
      title={`${e.brand} — ${placeOf(e) ?? ''}`}
      className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${
        e.status === 'in_progress' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-900'
      }`}
    >
      {startTime(e) && <span className="mr-1 font-normal opacity-75">{startTime(e)}</span>}
      {e.brand}
    </Link>
  );
}

function EventCard({ event: e }: { event: EventRow }) {
  const names = talentNames(e);
  const time = eventTime(e);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white p-4 shadow-card">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/activaciones/solicitudes/${e.id}`}
            className="font-medium text-stone-900 hover:underline"
          >
            {e.brand} — {placeOf(e)}
          </Link>
          <ActivationTypeBadge type={e.activation_type} />
          <SolicitudStatusBadge status={e.status} />
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {formatSolicitudDates(e)}
          {time && <> · {time}</>}
          {' · '}
          {e.activation_type === 'in_store' ? e.store_address : e.event_address}
        </p>
        <p className="mt-1 text-xs text-stone-400">
          {names.length > 0 ? (
            <>
              Equipo: <span className="text-stone-600">{names.join(', ')}</span>
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
}

function UpcomingList({ events, today }: { events: EventRow[]; today: string }) {
  // Operational list: everything current or upcoming (multi-day events still
  // running today included), soonest first — with staffing + quick actions.
  const upcoming = events.filter((e) => {
    const days = eventDays(e);
    return days.length === 0 || days[days.length - 1] >= today;
  });
  if (upcoming.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-stone-900">Sin eventos próximos</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
          Cuando confirmes una solicitud aprobada por el cliente, aparecerá aquí y en el calendario.
        </p>
      </div>
    );
  }
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-stone-400">
        Próximos eventos · {upcoming.length}
      </h2>
      <div className="space-y-3">
        {upcoming.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}
