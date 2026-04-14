// ============================================
// AUDITOR SETTINGS HOOK
// Manages auditor panel settings in localStorage
// ============================================

import { useState, useEffect, useCallback } from 'react';

export type DocRequirementPreset = 'hackathon' | 'strict' | 'relaxed';

export interface AuditorSettings {
  strictMode: boolean;
  requireChecksBeforeDecision: boolean;
  requireDocsByRules: boolean;
  docRequirementPreset: DocRequirementPreset;
}

const STORAGE_KEY = 'auditor_settings';

const DEFAULT_SETTINGS: AuditorSettings = {
  strictMode: true,
  requireChecksBeforeDecision: true,
  requireDocsByRules: true,
  docRequirementPreset: 'hackathon',
};

function loadSettings(): AuditorSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load auditor settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AuditorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save auditor settings:', e);
  }
}

export function useAuditorSettings() {
  const [settings, setSettings] = useState<AuditorSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AuditorSettings>(
    key: K,
    value: AuditorSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    resetToDefaults,
  };
}

// Singleton for use outside of React components
let cachedSettings: AuditorSettings | null = null;

export function getAuditorSettings(): AuditorSettings {
  if (!cachedSettings) {
    cachedSettings = loadSettings();
  }
  return cachedSettings;
}

export function refreshSettingsCache(): void {
  cachedSettings = loadSettings();
}
