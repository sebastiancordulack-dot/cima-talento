// Quote data shape stored in solicitudes.quote_line_items (Activaciones Brief
// §6A, §12.2). Shared by the Hub quote builder and (read-only, once sent) the
// Client Portal. No server-only imports — used in client components.
//
// Multi-location batches carry one section per location and the SAME quote
// object is written to every row in the batch: one quote covering all
// locations, itemized per store, grand total at the bottom (Brief §6A).

export interface QuoteItem {
  concept: string; // e.g. "Brand ambassadors (2) × 4h", "Management fee"
  amount: number;  // USD
}

export interface QuoteSection {
  solicitud_id: string; // the batch row this section belongs to
  label: string;        // store name (or event name for field events)
  items: QuoteItem[];
}

export interface QuoteData {
  sections: QuoteSection[];
  total: number;
}

export function sectionSubtotal(section: QuoteSection): number {
  return section.items.reduce((sum, i) => sum + (Number.isFinite(i.amount) ? i.amount : 0), 0);
}

export function quoteTotal(sections: QuoteSection[]): number {
  return sections.reduce((sum, s) => sum + sectionSubtotal(s), 0);
}

/** Defensive parse of the stored jsonb (shape may predate this module). */
export function parseQuoteData(raw: unknown): QuoteData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Partial<QuoteData>;
  if (!Array.isArray(data.sections)) return null;
  const sections: QuoteSection[] = data.sections
    .filter((s): s is QuoteSection => !!s && typeof s === 'object')
    .map((s) => ({
      solicitud_id: String(s.solicitud_id ?? ''),
      label: String(s.label ?? ''),
      items: Array.isArray(s.items)
        ? s.items
            .filter((i): i is QuoteItem => !!i && typeof i === 'object')
            .map((i) => ({ concept: String(i.concept ?? ''), amount: Number(i.amount) || 0 }))
        : [],
    }));
  return { sections, total: quoteTotal(sections) };
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}
