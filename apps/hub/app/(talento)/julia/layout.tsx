import { AppShell } from '@/components/shell/AppShell';
import { requireUser } from '@/lib/auth/session';

// Julia's review area (Brief §5.2) keeps its narrower reading width inside
// the shared shell; the page itself remains focused on approvals.
export default async function JuliaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={user} width="narrow">
      {children}
    </AppShell>
  );
}
