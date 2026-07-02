import { createClient } from "@cima/db/server";

// Rendered per-request so we can read the Supabase session from cookies.
// This also proves the Client Portal consumes the shared @cima/db package
// against the same Supabase instance as the Hub.
export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">CiMA Client Portal</h1>
      <p className="text-sm text-gray-500">
        Portal de clientes en construcción. Comparte la instancia de Supabase con CiMA Hub vía{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">@cima/db</code>.
      </p>
      <p className="text-xs text-gray-400">
        {user ? `Sesión activa: ${user.email}` : "Sin sesión activa"}
      </p>
    </main>
  );
}
