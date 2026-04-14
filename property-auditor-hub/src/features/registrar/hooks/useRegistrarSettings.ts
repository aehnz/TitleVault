// ============================================
// REGISTRAR SETTINGS HOOK
// Manages registrar configuration
// ============================================

import { RegistrarSettings } from '@udhbha/types';


const SETTINGS_KEY = 'registrar_settings';

const DEFAULT_SETTINGS: RegistrarSettings = {
  allowApproveWithoutAnchor: false,
  demoChainEnabled: true,
  strictApproveOnlyAuditPass: true,
  showMaskingOptions: true,
};

export function useRegistrarSettings() {
  const [settings, setSettings] = useState<RegistrarSettings>(DEFAULT_SETTINGS);

  // Load settings on mount
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RegistrarSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        // Use defaults
      }
    }
  }, []);

  const updateSetting = useCallback(<K extends keyof RegistrarSettings>(
    key: K,
    value: RegistrarSettings[K]
  ) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    resetToDefaults,
  };
}

// Get settings without hook
export function getRegistrarSettings(): RegistrarSettings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
