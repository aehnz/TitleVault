// ============================================
// REGISTRAR LAYOUT
// Main layout wrapper with sidebar and header
// ============================================

import { getRegistrarSession } from '../hooks/useRegistrarSession';

export function RegistrarLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // Check auth on mount
  useEffect(() => {
    const session = getRegistrarSession();
    if (!session) {
      navigate('/registrar/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <RegistrarSidebar
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
