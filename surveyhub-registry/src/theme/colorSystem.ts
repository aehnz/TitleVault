// ============================================
// COLOR SYSTEM
// Centralized color definitions for consistent theming
// Matches Surveyor Panel for consistency
// ============================================

export type ComponentType =
  | "shop"
  | "food"
  | "office"
  | "utility"
  | "common"
  | "void"
  | "parking"
  | "residential"
  | "stair"
  | "lift"
  | "other";

export type ClaimKind =
  | "OWNERSHIP"
  | "LEASE"
  | "OCCUPANCY"
  | "DISPUTE"
  | "MORTGAGE"
  | "EASEMENT";

export type StatusKind =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "AUDIT_PASSED"
  | "AUDIT_FAILED"
  | "NEEDS_FIX";

export interface UIAccents {
  primaryText: string;
  mutedText: string;
  border: string;
  bg: string;
  panelBg: string;
  gridLine: string;
}

export interface ColorPreset {
  componentTypeColors: Record<ComponentType, string>;
  claimKindColors: Record<ClaimKind, string>;
  statusColors: Record<StatusKind, string>;
  uiAccents: UIAccents;
}

// Government Minimal Preset - grayscale UI with strong accent colors
export const defaultPreset: ColorPreset = {
  componentTypeColors: {
    shop: "#FF7A00",
    food: "#00B894",
    office: "#3D5AFE",
    utility: "#9B59B6",
    common: "#B0B0B0",
    void: "#111111",
    parking: "#2D3436",
    residential: "#E84393",
    stair: "#6C5CE7",
    lift: "#00A8FF",
    other: "#666666",
  },
  claimKindColors: {
    OWNERSHIP: "#FF7A00",
    LEASE: "#FFD400",
    OCCUPANCY: "#00CEC9",
    DISPUTE: "#E74C3C",
    MORTGAGE: "#8E8E8E",
    EASEMENT: "#2ECC71",
  },
  statusColors: {
    DRAFT: "#A0A0A0",
    SUBMITTED: "#2D9CDB",
    APPROVED: "#27AE60",
    REJECTED: "#EB5757",
    RETURNED: "#F2C94C",
    AUDIT_PASSED: "#27AE60",
    AUDIT_FAILED: "#EB5757",
    NEEDS_FIX: "#F2C94C",
  },
  uiAccents: {
    primaryText: "#000000",
    mutedText: "#666666",
    border: "#CCCCCC",
    bg: "#FFFFFF",
    panelBg: "#F8F8F8",
    gridLine: "#404040",
  },
};

// Dark mode UI accents
export const darkUIAccents: UIAccents = {
  primaryText: "#FAFAFA",
  mutedText: "#999999",
  border: "#333333",
  bg: "#0D0D0D",
  panelBg: "#141414",
  gridLine: "#333333",
};

// Helper to get component color with optional opacity
export function getComponentColor(type: ComponentType | string, opacity: number = 1): string {
  const hex = defaultPreset.componentTypeColors[type as ComponentType] || defaultPreset.componentTypeColors.other;
  if (opacity === 1) return hex;
  return hexToRgba(hex, opacity);
}

// Helper to get claim color
export function getClaimColor(kind: ClaimKind | string): string {
  return defaultPreset.claimKindColors[kind as ClaimKind] || defaultPreset.claimKindColors.OWNERSHIP;
}

// Helper to get status color
export function getStatusColor(status: StatusKind | string): string {
  return defaultPreset.statusColors[status as StatusKind] || defaultPreset.statusColors.DRAFT;
}

// Convert hex to rgba
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Convert hex to HSL values (for CSS variables)
export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// 3D viewer constants
export const FLOOR_THICKNESS = 1.2;
export const FLOOR_GAP = 5;
export const COMPONENT_HEIGHT = 0.35;

// Export color arrays for legends
export const componentTypeList: ComponentType[] = [
  "shop", "food", "office", "utility", "common",
  "void", "parking", "residential", "stair", "lift"
];

export const claimKindList: ClaimKind[] = [
  "OWNERSHIP", "LEASE", "OCCUPANCY", "DISPUTE", "MORTGAGE", "EASEMENT"
];

export const statusKindList: StatusKind[] = [
  "DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "RETURNED", "AUDIT_PASSED", "AUDIT_FAILED", "NEEDS_FIX"
];
