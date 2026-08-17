// Artic Safari — mobile design system.
//
// Related to the website (same aurora-cyan CTA gradient, same deep-navy
// ground) but retuned for a phone: darker base for OLED, stronger text
// contrast, and larger type than the web equivalents since a phone is
// held further from the eye relative to its pixel density.

export const COLORS = {
  // Ground — flatter and cooler than before. Solid surfaces, no gradient
  // soup, because this is read at a glance in a moving car at night.
  background: "#0B0E14",
  backgroundAlt: "#10141C",
  surface: "#151A23",
  surfaceElevated: "#1C222D",
  surfaceSunken: "#070910",

  // Glass — kept, but far more restrained
  glass: "rgba(255, 255, 255, 0.04)",
  glassStrong: "rgba(255, 255, 255, 0.07)",
  border: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(34, 211, 238, 0.42)",

  // Brand cyan, punchier than the old soft aurora tint
  accent: "#22D3EE",
  accentDeep: "#0E9BB5",
  accentSoft: "rgba(34, 211, 238, 0.12)",
  accentGlow: "rgba(34, 211, 238, 0.30)",
  ice: "#A5F3FC",

  // Dispatch amber — taxi urgency. Distinct from brand cyan on purpose so
  // "a ride is waiting" never reads as decoration.
  dispatch: "#F59E0B",
  dispatchSoft: "rgba(245, 158, 11, 0.13)",

  gold: "#E4C27E",
  goldSoft: "rgba(228, 194, 126, 0.14)",

  // Semantic
  success: "#34D399",
  successSoft: "rgba(52, 211, 153, 0.13)",
  warning: "#FBBF24",
  warningSoft: "rgba(251, 191, 36, 0.13)",
  danger: "#F87171",
  dangerSoft: "rgba(248, 113, 113, 0.13)",

  // Text — higher contrast than before
  text: "#F8FAFC",
  textSecondary: "#B4C0D3",
  textMuted: "#6B7A90",
  onAccent: "#04121A",

  // Legacy aliases kept for the original driver-app components (see the
  // note at the bottom of this file). Not for new code.
  glassSurface: "rgba(255, 255, 255, 0.04)",
  glassBorder: "rgba(255, 255, 255, 0.10)",
  glassBorderStrong: "rgba(34, 211, 238, 0.42)",
  auroraEmerald: "#34D399",
  auroraTeal: "#22D3EE",
  auroraIce: "#A5F3FC",
  auroraViolet: "#A78BFA",
  textPrimary: "#F8FAFC",
  pending: "#FBBF24",
} as const;

/** The website's exact CTA gradient — the one visual thread tying the two together. */
export const GRADIENT_CTA = ["#67E8F9", "#22D3EE", "#0E9BB5"] as const;
export const GRADIENT_CARD = ["#151A23", "#131820"] as const;
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
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
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
