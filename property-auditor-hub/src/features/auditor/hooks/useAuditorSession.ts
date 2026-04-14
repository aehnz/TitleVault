// ============================================
// AUDITOR SESSION HOOK
// Manages auditor authentication state
// ============================================

import { useNavigate, useLocation } from 'react-router-dom';

export interface AuditorSession {
  role: 'AUDITOR';
  email: string;
  login_at: string;
}

const SESSION_KEY = 'auditor_session';

export function useAuditorSession() {
  const [session, setSession] = useState<AuditorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Load session on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuditorSession;
        setSession(parsed);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !session && location.pathname !== '/auditor/login') {
      navigate('/auditor/login', { replace: true });
    }
  }, [isLoading, session, location.pathname, navigate]);

  const login = useCallback((email: string): boolean => {
    const newSession: AuditorSession = {
      role: 'AUDITOR',
      email,
      login_at: new Date().toISOString(),
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    navigate('/auditor/login', { replace: true });
  }, [navigate]);

  return {
    session,
    isLoading,
    isAuthenticated: !!session,
    login,
    logout,
  };
}

// Get session without hook (for components that need quick check)
export function getAuditorSession(): AuditorSession | null {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as AuditorSession;
  } catch {
    return null;
  }
}
