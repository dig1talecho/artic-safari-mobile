import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import FacetedBackdrop from "../components/FacetedBackdrop";
// The brand mark is now artwork, not a drawn component. FoxMark and
// PolarBearMark stay in the repo but are unused -- keeping them costs
// nothing and they are the record of how the mark got here.
const LOGO = require("../assets/logo.png");
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "../i18n";
import { SPACING } from "../constants/theme";
import {
  signInWithPassword,
  signUpCustomer,
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
  requestPasswordReset,
} from "../services/auth";
import { supabase } from "../lib/supabase";

type Mode = "signin" | "signup";

/** Solid white field with a leading glyph, matching the reference. */
function Field({
  label,
  glyph,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; glyph: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <Text style={styles.glyph}>{glyph}</Text>
        <TextInput
          placeholderTextColor="rgba(6,58,72,0.35)"
          style={styles.input}
          {...props}
        />
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const submit = async () => {
    setBusy(true);
    setError("");

    if (mode === "signin") {
      const { error: err } = await signInWithPassword(email.trim(), password);
      setBusy(false);
      if (err) {
        setError(err.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      return;
    }

    const { data, error: err } = await signUpCustomer(email.trim(), password);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }

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

  const oauth = async (provider: "google" | "apple") => {
    setBusy(true);
    setError("");
    const { error: err } =
      provider === "google" ? await signInWithGoogle() : await signInWithApple();
    setBusy(false);
    if (err) setError(err.message);
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError(t("auth.forgotNeedsEmail"));
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await requestPasswordReset(email.trim());
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    Alert.alert(t("auth.forgotSentTitle"), t("auth.forgotSentBody", { email: email.trim() }));
  };

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (mode === "signin" || (fullName.trim().length > 0 && phone.trim().length > 0));

  return (
    <View style={styles.root}>
      <FacetedBackdrop />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.langRow}>
              <LanguageSwitcher compact />
            </View>

            {/* Card. On a phone this fills the width rather than sitting in a
                left column — the reference's split layout has no room here. */}
            <View style={styles.card}>
              <View style={styles.brandRow}>
                <Image source={LOGO} style={styles.brandMark} resizeMode="contain" />
                <View style={styles.wordmark}>
                  <Text style={styles.brandTop}>ARTIC</Text>
                  <Text style={styles.brandBottom}>SAFARI</Text>
                </View>
              </View>

              <Text style={styles.welcome}>
                {mode === "signin" ? t("auth.welcomeBack") : t("auth.welcomeNew")}
              </Text>
              <Text style={styles.welcomeSub}>
                {mode === "signin" ? t("auth.welcomeBackSub") : t("auth.welcomeNewSub")}
              </Text>

              <View style={styles.form}>
                {mode === "signup" && (
                  <>
                    <Field
                      label={t("auth.fullName")}
                      glyph="◇"
                      value={fullName}
                      onChangeText={setFullName}
                      autoComplete="name"
                    />
                    <Field
                      label={t("auth.phone")}
                      glyph="☎"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />
                  </>
                )}

                <Field
                  label={t("auth.email")}
                  glyph="✉"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <Field
                  label={t("auth.password")}
                  glyph="⚿"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />

                {mode === "signin" && (
                  <View style={styles.metaRow}>
                    <Pressable
                      onPress={() => setRemember((v) => !v)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: remember }}
                      style={styles.rememberPress}
                      hitSlop={8}
                    >
                      <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                        {remember ? <Text style={styles.checkboxTick}>✓</Text> : null}
                      </View>
                      <Text style={styles.rememberText}>{t("auth.rememberMe")}</Text>
                    </Pressable>

                    <Pressable onPress={forgotPassword} hitSlop={8}>
                      <Text style={styles.forgot}>{t("auth.forgotPassword")}</Text>
                    </Pressable>
                  </View>
                )}

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Outlined primary, as in the reference. */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    submit();
                  }}
                  disabled={!canSubmit || busy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmit || busy, busy }}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.pressed,
                    (!canSubmit || busy) && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryText}>
                      {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
                    </Text>
                  )}
                </Pressable>

                {/* Filled secondary — the partially visible button in the reference. */}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError("");
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryText}>
                    {mode === "signin" ? t("auth.signUp") : t("auth.signIn")}
                  </Text>
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t("auth.orDivider")}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  onPress={() => oauth("google")}
                  disabled={busy}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.oauthBtn,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                >
                  <Text style={styles.oauthText}>{t("auth.continueWithGoogle")}</Text>
                </Pressable>

                {appleAvailable ? (
                  <Pressable
                    onPress={() => oauth("apple")}
                    disabled={busy}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.oauthBtn,
                      pressed && styles.pressed,
                      busy && styles.disabled,
                    ]}
                  >
                    <Text style={styles.oauthText}>{t("auth.continueWithApple")}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const INK = "#063A48";

const styles = StyleSheet.create({
  // Sized to the ring it sits in. contain, never cover: cropping a logo
  // is the one thing you must never do to it.
  brandMark: { width: 62, height: 62 },
  root: { flex: 1, backgroundColor: "#063A48" },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: SPACING.lg },

  langRow: { paddingHorizontal: SPACING.xl, alignItems: "flex-end", paddingBottom: SPACING.md },

  // Hairline-bordered panel, echoing the reference's inset card edge.
  card: {
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: 4,
  },

  brandRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  wordmark: { justifyContent: "center" },
  brandTop: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  brandBottom: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 5.5,
  },

  welcome: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: SPACING.xxl,
  },
  welcomeSub: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.86)",
    marginTop: 4,
  },

  form: { marginTop: SPACING.xxl, gap: SPACING.lg },

  field: { gap: 7 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  glyph: { fontSize: 16, color: INK, marginRight: 10, opacity: 0.75 },
  input: { flex: 1, fontSize: 15, color: INK, paddingVertical: 14 },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rememberPress: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#FFFFFF" },
  checkboxTick: { color: INK, fontSize: 14, fontWeight: "800" },
  rememberText: { fontSize: 15, color: "#FFFFFF" },
  forgot: {
    fontSize: 15,
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },

  errorBox: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderLeftWidth: 3,
    borderLeftColor: "#FFD5DC",
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13, lineHeight: 18, color: "#FFFFFF" },

  primaryBtn: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  secondaryBtn: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: INK,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: SPACING.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.32)" },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
  },

  oauthBtn: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  oauthText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },

  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
