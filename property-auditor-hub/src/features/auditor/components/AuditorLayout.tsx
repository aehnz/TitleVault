// ============================================
// AUDITOR LAYOUT
// Main layout wrapper with sidebar and header
// Protected by authentication
// ============================================

import { useAuditorSession } from '../hooks/useAuditorSession';

export function AuditorLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isLoading, isAuthenticated } = useAuditorSession();

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Will redirect via useAuditorSession hook if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AuditorSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={cn(
        'flex-1 flex flex-col min-h-screen overflow-hidden',
        'transition-all duration-300'
      )}>
        <Outlet />
      </main>
    </div>
  );
}
