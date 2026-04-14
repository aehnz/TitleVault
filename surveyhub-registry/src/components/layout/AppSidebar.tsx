import React from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmission } from '@/hooks/useSubmissions';
import {
  LayoutDashboard,
  FileStack,
  FilePenLine,
  Settings,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const { submissionId } = useParams<{ submissionId: string }>();
  const { data: currentSubmission } = useSubmission(submissionId);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/submissions', icon: FileStack, label: 'Submissions' },
    ...(currentSubmission ? [{ to: `/app/editor/${currentSubmission.meta.submission_id}`, icon: FilePenLine, label: 'Editor' }] : []),
    { to: '/app/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <Building2 className="w-6 h-6 text-sidebar-primary flex-shrink-0" />
        {!collapsed && (
          <span className="ml-3 font-semibold text-sm truncate">Surveyor Panel</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
            {user.email}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full",
            "text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="p-3 border-t border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent/50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
