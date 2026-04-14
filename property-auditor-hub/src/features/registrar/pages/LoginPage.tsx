// ============================================
// REGISTRAR LOGIN PAGE
// Clean government-style login form
// ============================================

import { toast } from 'sonner';

export function LoginPage() {
  const [email, setEmail] = useState('registrar@demo.gov');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Demo: accept any password
    const session = {
      role: 'REGISTRAR' as const,
      email,
      login_at: new Date().toISOString(),
    };

    localStorage.setItem('registrar_session', JSON.stringify(session));
    toast.success('Logged in successfully');
    navigate('/registrar/inbox', { replace: true });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-xl bg-[hsl(var(--audit-pass))] flex items-center justify-center">
            <Stamp className="w-9 h-9 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Registrar Portal</CardTitle>
            <CardDescription className="mt-1">
              Government Property Registry - Final Approval System
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="registrar@demo.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[hsl(var(--audit-pass))] hover:bg-[hsl(var(--audit-pass))]/90"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmail('registrar@demo.gov');
                setPassword('demo123');
              }}
            >
              Demo Login (Auto-fill)
            </Button>
          </div>
          
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>This is a government-grade property registry system.</p>
            <p className="mt-1">Unauthorized access is prohibited.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
