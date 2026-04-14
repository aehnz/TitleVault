// ============================================
// REGISTRAR SIDEBAR
// Collapsible navigation sidebar
// ============================================

import { 
  Inbox, 
  FileSearch, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Stamp,
  LogOut,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface RegistrarSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    path: '/registrar/inbox',
    label: 'Inbox',
    icon: Inbox,
    alwaysVisible: true,
  },
  {
    path: '/registrar/review',
    label: 'Review',
    icon: FileSearch,
    matchPath: '/registrar/review',
    hideWhenInactive: true,
  },
  {
    path: '/registrar/reports',
    label: 'Reports',
    icon: FileText,
    alwaysVisible: true,
  },
  {
    path: '/registrar/settings',
    label: 'Settings',
    icon: Settings,
    alwaysVisible: true,
  },
];

export function RegistrarSidebar({ collapsed, onToggle }: RegistrarSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string, matchPath?: string) => {
    if (matchPath) {
      return location.pathname.startsWith(matchPath);
    }
    return location.pathname === path;
  };

  const shouldShow = (item: typeof navItems[0]) => {
    if (item.alwaysVisible) return true;
    if (item.hideWhenInactive && item.matchPath) {
      return location.pathname.startsWith(item.matchPath);
    }
    return true;
  };

  const handleLogout = () => {
    localStorage.removeItem('registrar_session');
    navigate('/registrar/login', { replace: true });
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-16 flex items-center border-b border-sidebar-border px-4',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--audit-pass))] flex items-center justify-center">
          <Stamp className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Registrar Panel
            </span>
            <span className="text-xs text-sidebar-muted">
              Final Approval
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.filter(shouldShow).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.matchPath);

          const linkContent = (
            <NavLink
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                'hover:bg-sidebar-accent',
                active && 'bg-sidebar-accent text-sidebar-primary',
                !active && 'text-sidebar-foreground',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0',
                active ? 'text-sidebar-primary' : 'text-sidebar-muted'
              )} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.path}>{linkContent}</div>;
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-2 space-y-1">
        <Separator className="mb-2" />
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-center text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Logout
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </Button>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed ? 'justify-center' : 'justify-start gap-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
