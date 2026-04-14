import React, { useState } from 'react';
import { Building2, Shield } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = await login(email, password);
    if (success) {
      navigate('/app/dashboard');
    } else {
      setError('Invalid email or password');
    }
    setIsLoading(false);
  };

  const fillDemoCredentials = () => {
    setEmail('surveyor@demo.gov');
    setPassword('demo1234');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Surveyor Panel</h1>
          <p className="text-muted-foreground mt-1">Property Registry System</p>
        </div>

        <Card className="border-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access the surveyor panel
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="surveyor@demo.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-sm text-primary hover:underline"
              >
                Use demo credentials
              </button>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            Secure government portal
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
