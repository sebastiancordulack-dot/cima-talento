import { cx } from '@cima/ui';
import { HubSidebar } from '@/components/shell/HubSidebar';
import { isAdminRole, type SessionUser } from '@/lib/auth/session';

// Authed Hub frame (spec §5.1): sidebar + content on canvas. Layouts keep
// their own requireUser() calls and hand the session here — this component
// adds no auth logic of its own.
export function AppShell({
  user,
  width = 'default',
  children,
}: {
  user: SessionUser;
  width?: 'default' | 'narrow';
  children: React.ReactNode;
}) {
  const isAdmin = isAdminRole(user.hm?.role);

  return (
    <div className="min-h-screen">
      <HubSidebar name={user.hm?.name ?? user.email} email={user.email} isAdmin={isAdmin} />
      <div className="lg:pl-64">
        <main
          className={cx(
            'mx-auto w-full px-4 py-6 sm:px-6',
            width === 'narrow' ? 'max-w-4xl' : 'max-w-[1280px]',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
