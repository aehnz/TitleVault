// ============================================
// REGISTRAR SESSION HOOK
// Manages registrar authentication state
// ============================================

import { RegistrarSession } from '@udhbha/types';


const SESSION_KEY = 'registrar_session';

export function useRegistrarSession() {
  const [session, setSession] = useState<RegistrarSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Load session on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RegistrarSession;
        setSession(parsed);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !session && location.pathname !== '/registrar/login') {
      navigate('/registrar/login', { replace: true });
    }
  }, [isLoading, session, location.pathname, navigate]);

  const login = useCallback((email: string): boolean => {
    const newSession: RegistrarSession = {
      role: 'REGISTRAR',
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
    navigate('/registrar/login', { replace: true });
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
export function getRegistrarSession(): RegistrarSession | null {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as RegistrarSession;
  } catch {
    return null;
  }
}
