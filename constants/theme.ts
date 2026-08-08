// Luxury "Northern Lights" dark palette — shared across the driver app UI.
export const COLORS = {
  background: "#040609",
  backgroundElevated: "#0a0f16",
  glassSurface: "rgba(255, 255, 255, 0.045)",
  glassBorder: "rgba(148, 197, 219, 0.18)",
  glassBorderStrong: "rgba(94, 234, 212, 0.35)",

  auroraEmerald: "#34d399",
  auroraTeal: "#2dd4bf",
  auroraIce: "#38bdf8",
  auroraViolet: "#a78bfa",

  gold: "#eab308",
  success: "#34d399",
  danger: "#f87171",
  pending: "#fbbf24",

  textPrimary: "#f8fafc",
  textSecondary: "#aab4c8",
  textMuted: "#6b7686",
} as const;

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const AURORA_GRADIENT = [
  COLORS.auroraEmerald,
  COLORS.auroraTeal,
  COLORS.auroraIce,
  COLORS.auroraViolet,
] as const;

export const STATUS_ACCENT: Record<string, string> = {
  pending: COLORS.pending,
  confirmed: COLORS.auroraIce,
  completed: COLORS.success,
  cancelled: COLORS.danger,
};
