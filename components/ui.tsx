import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  COLORS,
  EYEBROW,
  GRADIENT_CARD,
  GRADIENT_CTA,
  RADIUS,
  SHADOW,
  SPACING,
  TYPE,
} from "../constants/theme";

// Shared building blocks. Everything premium-feeling in the app comes from
// three consistent moves: the aurora gradient on primary actions, soft
// gradient cards with a hairline border, and generous vertical rhythm.

export function Screen({
  children,
  scroll = false,
  edges = ["top"],
  refreshControl,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: ViewStyle;
}) {
  const body = scroll ? (
    <ScrollView
      style={s.flex}
      contentContainerStyle={[s.scrollContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.flex, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={s.screen} edges={edges}>
      {body}
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <Text style={[s.title, style]}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.subtitle}>{children}</Text>;
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.header}>
      <View style={s.flex}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Title>{title}</Title>
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      </View>
      {right ? <View style={s.headerRight}>{right}</View> : null}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  glow = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  glow?: boolean;
}) {
  const inner = (
    <LinearGradient
      colors={GRADIENT_CARD}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.card, glow && s.cardGlow, style]}
    >
      {children}
    </LinearGradient>
  );

  if (!onPress) return inner;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [pressed && s.pressed]}
    >
      {inner}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [pressed && s.pressed, inactive && s.disabled, style]}
    >
      <LinearGradient
        colors={GRADIENT_CTA}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.primaryBtn}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.onAccent} />
        ) : (
          <Text style={s.primaryBtnText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [s.ghostBtn, pressed && s.pressed, disabled && s.disabled, style]}
    >
      <Text style={s.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...inputProps
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={COLORS.textMuted}
        style={[s.input, !!error && s.inputError]}
        {...inputProps}
      />
      {error ? (
        <Text style={s.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={s.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Pill({
  label,
  color = COLORS.accent,
  background = COLORS.accentSoft,
  style,
}: {
  label: string;
  color?: string;
  background?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.pill, { backgroundColor: background }, style]}>
      <Text style={[s.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[s.divider, style]} />;
}

export function Row({
  left,
  right,
  strong = false,
}: {
  left: string;
  right: string;
  strong?: boolean;
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLeft}>{left}</Text>
      <Text style={[s.rowRight, strong && s.rowRightStrong]}>{right}</Text>
    </View>
  );
}

export function EmptyState({
  icon = "✦",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {body ? <Text style={s.emptyBody}>{body}</Text> : null}
      {action ? <View style={s.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <View style={s.loader}>
      <ActivityIndicator color={COLORS.accent} />
      {label ? <Text style={s.loaderText}>{label}</Text> : null}
    </View>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <View style={s.errorNote}>
      <Text style={s.errorNoteText}>{message}</Text>
    </View>
  );
}

/** Numbered step indicator for the booking wizard. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={s.stepper}>
      {steps.map((label, i) => {
        const index = i + 1;
        const active = current >= index;
        const done = current > index;
        return (
          <View key={label} style={s.stepItem}>
            <View style={[s.stepDot, active && s.stepDotActive]}>
              <Text style={[s.stepDotText, active && s.stepDotTextActive]}>
                {done ? "✓" : index}
              </Text>
            </View>
            {index < steps.length ? <View style={s.stepLine} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xxxl },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  headerRight: { paddingTop: SPACING.xs },
  eyebrow: { ...EYEBROW, color: COLORS.accent, marginBottom: SPACING.sm },
  title: { ...TYPE.h1, color: COLORS.text },
  subtitle: { ...TYPE.body, color: COLORS.textSecondary, marginTop: SPACING.sm },

  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    overflow: "hidden",
    ...SHADOW.card,
  },
  cardGlow: { borderColor: COLORS.borderStrong, ...SHADOW.glow },

  primaryBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnText: {
    ...TYPE.bodyStrong,
    color: COLORS.onAccent,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  ghostBtn: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glass,
    paddingVertical: 15,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  ghostBtnText: { ...TYPE.bodyStrong, color: COLORS.text },

  field: { gap: SPACING.sm },
  fieldLabel: { ...TYPE.small, color: COLORS.textSecondary, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 50,
  },
  inputError: { borderColor: COLORS.danger },
  fieldHint: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "400" },
  fieldError: { ...TYPE.caption, color: COLORS.danger, fontWeight: "500" },

  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    alignSelf: "flex-start",
  },
  pillText: { ...TYPE.caption },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.lg,
    paddingVertical: 5,
  },
  rowLeft: { ...TYPE.small, color: COLORS.textSecondary, flexShrink: 1 },
  rowRight: { ...TYPE.small, color: COLORS.text, fontWeight: "600", textAlign: "right", flexShrink: 1 },
  rowRightStrong: { ...TYPE.h3, color: COLORS.accent },

  empty: { alignItems: "center", paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl },
  emptyIcon: { fontSize: 30, color: COLORS.textMuted, marginBottom: SPACING.md },
  emptyTitle: { ...TYPE.h3, color: COLORS.text, textAlign: "center" },
  emptyBody: {
    ...TYPE.small,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
    maxWidth: 280,
  },
  emptyAction: { marginTop: SPACING.xl, alignSelf: "stretch", paddingHorizontal: SPACING.xl },

  loader: { paddingVertical: SPACING.xxxl, alignItems: "center", gap: SPACING.md },
  loaderText: { ...TYPE.small, color: COLORS.textSecondary },

  errorNote: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.3)",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorNoteText: { ...TYPE.small, color: COLORS.danger },

  stepper: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.lg },
  stepItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  stepDotText: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },
  stepDotTextActive: { color: COLORS.onAccent },
  stepLine: { flex: 1, height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },
});
