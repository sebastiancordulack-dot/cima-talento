import { AppShell } from '@/components/shell/AppShell';
import { requireUser } from '@/lib/auth/session';

export default async function ActivacionesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
