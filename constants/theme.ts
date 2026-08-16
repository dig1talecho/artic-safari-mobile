// Artic Safari — mobile design system.
//
// Related to the website (same aurora-cyan CTA gradient, same deep-navy
// ground) but retuned for a phone: darker base for OLED, stronger text
// contrast, and larger type than the web equivalents since a phone is
// held further from the eye relative to its pixel density.

export const COLORS = {
  // Ground
  background: "#05070D",
  backgroundAlt: "#080C15",
  surface: "#0D1420",
  surfaceElevated: "#141C2B",
  surfaceSunken: "#03050A",

  // Glass
  glass: "rgba(255, 255, 255, 0.045)",
  glassStrong: "rgba(255, 255, 255, 0.075)",
  border: "rgba(255, 255, 255, 0.09)",
  borderStrong: "rgba(125, 231, 235, 0.28)",

  // Aurora accents — the cyan family carried over from the website
  accent: "#5CE1E6",
  accentDeep: "#33BBCF",
  accentSoft: "rgba(92, 225, 230, 0.13)",
  accentGlow: "rgba(92, 225, 230, 0.42)",
  ice: "#9DEDF0",

  // Secondary accent for premium touches (points, badges)
  gold: "#E4C27E",
  goldSoft: "rgba(228, 194, 126, 0.14)",

  // Semantic
  success: "#4ADE80",
  successSoft: "rgba(74, 222, 128, 0.13)",
  warning: "#FBBF24",
  warningSoft: "rgba(251, 191, 36, 0.13)",
  danger: "#FB7185",
  dangerSoft: "rgba(251, 113, 133, 0.13)",

  // Text
  text: "#F4F8FC",
  textSecondary: "#A3B1C6",
  textMuted: "#64748B",
  onAccent: "#04121A",

  // Legacy aliases kept for the original driver-app components (see the
  // note at the bottom of this file). Not for new code.
  glassSurface: "rgba(255, 255, 255, 0.045)",
  glassBorder: "rgba(255, 255, 255, 0.09)",
  glassBorderStrong: "rgba(125, 231, 235, 0.28)",
  auroraEmerald: "#4ADE80",
  auroraTeal: "#5CE1E6",
  auroraIce: "#9DEDF0",
  auroraViolet: "#A78BFA",
  textPrimary: "#F4F8FC",
  pending: "#FBBF24",
} as const;

/** The website's exact CTA gradient — the one visual thread tying the two together. */
export const GRADIENT_CTA = ["#9DEDF0", "#5CE1E6", "#33BBCF"] as const;
export const GRADIENT_CARD = ["#151C2A", "#0C121C"] as const;
export const GRADIENT_GOLD = ["#F0D9A8", "#E4C27E", "#C9A25C"] as const;
export const GRADIENT_SCRIM = ["transparent", "rgba(5,7,13,0.75)", "#05070D"] as const;

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const TYPE = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700" },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: "700" },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  small: { fontSize: 13, lineHeight: 19, fontWeight: "400" },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: "600" },
  price: { fontSize: 26, lineHeight: 30, fontWeight: "700" },
} as const;

/** Uppercase micro-label used above section titles, matching the website. */
export const EYEBROW = {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: "700",
  letterSpacing: 1.6,
  textTransform: "uppercase",
} as const;

export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  none: {},
} as const;

export const STATUS_STYLE: Record<
  string,
  { color: string; background: string; labelKey: string }
> = {
  pending: {
    color: COLORS.warning,
    background: COLORS.warningSoft,
    labelKey: "myBookings.statusPending",
  },
  confirmed: {
    color: COLORS.accent,
    background: COLORS.accentSoft,
    labelKey: "myBookings.statusConfirmed",
  },
  cancelled: {
    color: COLORS.danger,
    background: COLORS.dangerSoft,
    labelKey: "myBookings.statusCancelled",
  },
};

// ---------------------------------------------------------------------------
// Legacy aliases — used only by the original driver-app components
// (AuroraForecastWidget, BookingCard, DashboardSummary, GlassCard,
// StatusPill, HomeScreen). Kept so that screen keeps compiling untouched
// while the customer app moves to the tokens above.
//
// Do NOT use these in new code. Delete this block once the driver screen is
// either migrated or split into its own app.
// ---------------------------------------------------------------------------

export const LEGACY_COLORS = {
  glassSurface: COLORS.glass,
  glassBorder: COLORS.border,
  glassBorderStrong: COLORS.borderStrong,
  auroraEmerald: COLORS.success,
  auroraTeal: COLORS.accent,
  auroraIce: COLORS.ice,
  auroraViolet: "#A78BFA",
  textPrimary: COLORS.text,
  pending: COLORS.warning,
} as const;

export const AURORA_GRADIENT = [
  LEGACY_COLORS.auroraEmerald,
  LEGACY_COLORS.auroraTeal,
  LEGACY_COLORS.auroraIce,
  LEGACY_COLORS.auroraViolet,
] as const;

export const STATUS_ACCENT: Record<string, string> = {
  pending: COLORS.warning,
  confirmed: COLORS.accent,
  completed: COLORS.success,
  cancelled: COLORS.danger,
};
