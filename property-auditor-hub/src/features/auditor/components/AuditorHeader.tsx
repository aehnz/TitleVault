// ============================================
// AUDITOR HEADER
// Top header with search and profile
// ============================================

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAuditorSession } from '../hooks/useAuditorSession';

interface AuditorHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AuditorHeader({ title, subtitle }: AuditorHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const session = getAuditorSession();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Search:', searchQuery);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auditor_session');
    navigate('/auditor/login', { replace: true });
  };

  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-6">
      {/* Left: Title or Search */}
      <div className="flex items-center gap-6">
        {title ? (
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by submission ID or parcel ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 pl-9 bg-background"
            />
          </form>
        )}
      </div>

      {/* Right: Notifications and Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications - placeholder, no badge until functional */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium">Auditor</div>
                <div className="text-xs text-muted-foreground">{session?.email || 'auditor@demo.gov'}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>Auditor Account</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {session?.email || 'auditor@demo.gov'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/auditor/settings')}>
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
