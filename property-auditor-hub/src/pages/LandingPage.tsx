// ============================================
// LANDING PAGE
// Portal selection for Auditor, Registrar, or Public
// ============================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Property Registry System</h1>
          <p className="text-muted-foreground">
            Government-grade property management and auditing platform
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Auditor Portal */}
          <Card className="hover:border-sidebar-primary transition-colors cursor-pointer" onClick={() => navigate('/auditor/login')}>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-xl bg-sidebar-primary flex items-center justify-center">
                <Shield className="w-9 h-9 text-white" />
              </div>
              <div>
                <CardTitle>Auditor Portal</CardTitle>
                <CardDescription className="mt-1">
                  Review and validate property submissions
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/auditor/login');
                }}
              >
                Enter Auditor Portal
              </Button>
            </CardContent>
          </Card>

          {/* Registrar Portal */}
          <Card className="hover:border-[hsl(var(--audit-pass))] transition-colors cursor-pointer" onClick={() => navigate('/registrar/login')}>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-xl bg-[hsl(var(--audit-pass))] flex items-center justify-center">
                <Stamp className="w-9 h-9 text-white" />
              </div>
              <div>
                <CardTitle>Registrar Portal</CardTitle>
                <CardDescription className="mt-1">
                  Final approval and blockchain anchoring
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-[hsl(var(--audit-pass))] hover:bg-[hsl(var(--audit-pass))]/90"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/registrar/login');
                }}
              >
                Enter Registrar Portal
              </Button>
            </CardContent>
          </Card>

          {/* Public Verification Portal */}
          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/public')}>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
                <Search className="w-9 h-9 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Public Verification</CardTitle>
                <CardDescription className="mt-1">
                  Verify records and check ownership
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/public');
                }}
              >
                Verify Records
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>This is a government-grade property registry system.</p>
          <p className="mt-1">Unauthorized access is prohibited. Public verification is available to all.</p>
        </div>
      </div>
    </div>
  );
}
