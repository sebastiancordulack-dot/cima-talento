import Link from 'next/link';

// Julia's simplified review area (Brief §5.2) — its own minimal shell, scoped
// to candidates awaiting her approval. Distinct from the HM dashboard.
export default function JuliaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/julia" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-gray-900">CiMA Talento</span>
            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-700">
              Aprobación · Julia
            </span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            Ver panel completo
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
