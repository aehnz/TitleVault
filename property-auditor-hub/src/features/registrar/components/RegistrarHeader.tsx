// ============================================
// REGISTRAR HEADER
// Top bar with search, notifications, profile
// ============================================

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getRegistrarSession } from '../hooks/useRegistrarSession';

interface RegistrarHeaderProps {
  title?: string;
  subtitle?: string;
}

export function RegistrarHeader({ title, subtitle }: RegistrarHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const session = getRegistrarSession();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Search:', searchQuery);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('registrar_session');
    navigate('/registrar/login', { replace: true });
  };

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-card">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {title ? (
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        ) : (
          <form onSubmit={handleSearch} className="w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </form>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications - placeholder, no badge until functional */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-7 h-7 rounded-full bg-[hsl(var(--audit-pass))] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{session?.email || 'Registrar'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>Registrar Account</span>
                <span className="text-xs font-normal text-muted-foreground">{session?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/registrar/settings')}>
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
