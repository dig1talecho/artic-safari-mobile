import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Card,
  ErrorNote,
  Field,
  GhostButton,
  PrimaryButton,
  Screen,
} from "../components/ui";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "../i18n";
import { COLORS, EYEBROW, RADIUS, SPACING, TYPE } from "../constants/theme";
import {
  signInWithPassword,
  signUpCustomer,
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
} from "../services/auth";
import { supabase } from "../lib/supabase";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const handleEmailAuth = async () => {
    setBusy(true);
    setError("");

    if (mode === "signin") {
      const { error: err } = await signInWithPassword(email.trim(), password);
      setBusy(false);
      if (err) setError(err.message);
      return;
    }

    const { data, error: err } = await signUpCustomer(email.trim(), password);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }

    // Email confirmation is disabled on this project, so signUp returns an
    // active session and we can write the profile immediately. If it is ever
    // re-enabled, there is no session yet — say so instead of failing silently.
    if (data.session && data.user) {
      await supabase.from("customer_profiles").insert([
        {
          id: data.user.id,
          full_name: fullName.trim() || email.split("@")[0],
          phone: phone.trim(),
          email: email.trim(),
        },
      ]);
      setBusy(false);
      return;
    }

    setBusy(false);
    setError("Check your inbox to confirm your email, then sign in.");
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setBusy(true);
    setError("");
    const { error: err } =
      provider === "google" ? await signInWithGoogle() : await signInWithApple();
    setBusy(false);
    if (err) setError(err.message);
  };

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (mode === "signin" || (fullName.trim().length > 0 && phone.trim().length > 0));

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.langRow}>
          <LanguageSwitcher compact />
        </View>

        <View style={styles.hero}>
          <LinearGradient
            colors={["rgba(92,225,230,0.18)", "transparent"]}
            style={styles.heroGlow}
          />
          <Text style={styles.brandMark}>◇</Text>
          <Text style={styles.brand}>{t("common.appName")}</Text>
          <Text style={styles.tagline}>{t("tours.subtitle")}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.tabs}>
            {(["signin", "signup"] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setError("");
                }}
                style={[styles.tab, mode === m && styles.tabActive]}
              >
                <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                  {m === "signin" ? t("auth.signIn") : t("auth.signUp")}
                </Text>
              </Pressable>
            ))}
          </View>

          <Card style={styles.form}>
            {mode === "signup" && (
              <>
                <Field
                  label={t("auth.fullName")}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Doe"
                  autoComplete="name"
                />
                <Field
                  label={t("auth.phone")}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+47 000 00 000"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </>
            )}

            <Field
              label={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? <ErrorNote message={error} /> : null}

            <PrimaryButton
              label={mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
              onPress={handleEmailAuth}
              loading={busy}
              disabled={!canSubmit}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("auth.orDivider")}</Text>
              <View style={styles.dividerLine} />
            </View>

            <GhostButton
              label={t("auth.continueWithGoogle")}
              onPress={() => handleOAuth("google")}
              disabled={busy}
            />
            {appleAvailable ? (
              <GhostButton
                label={t("auth.continueWithApple")}
                onPress={() => handleOAuth("apple")}
                disabled={busy}
              />
            ) : null}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  langRow: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, alignItems: "flex-end" },
  hero: { alignItems: "center", paddingTop: SPACING.xxl, paddingBottom: SPACING.xl },
  heroGlow: {
    position: "absolute",
    top: -60,
    width: 320,
    height: 220,
    borderRadius: 160,
    opacity: 0.9,
  },
  brandMark: { fontSize: 34, color: COLORS.accent, marginBottom: SPACING.sm },
  brand: { ...TYPE.display, color: COLORS.text, letterSpacing: -0.5 },
  tagline: {
    ...TYPE.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: "center",
    maxWidth: 260,
  },
  body: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 11, borderRadius: RADIUS.pill, alignItems: "center" },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { ...TYPE.small, fontWeight: "600", color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.onAccent },
  form: { gap: SPACING.lg },
  divider: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { ...EYEBROW, color: COLORS.textMuted },
});
