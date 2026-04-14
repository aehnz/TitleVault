// ============================================
// PUBLIC LAYOUT
// Simple layout for public verification pages
// ============================================

import { Shield, ExternalLink } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/public" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Property Registry</h1>
                <p className="text-xs text-muted-foreground">Public Verification Portal</p>
              </div>
            </Link>
            
            <div className="flex items-center gap-4">
              <a 
                href="#how-it-works" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </a>
              <Link 
                to="/" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Staff Portal <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>
              This is a government-grade property registry verification system.
            </p>
            <div className="flex items-center gap-4">
              <span>All records are cryptographically secured.</span>
              <span className="text-xs bg-muted px-2 py-1 rounded">DEMO MODE</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
