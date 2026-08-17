import { StyleSheet, Text, View } from "react-native";
import { Card, Divider, GhostButton, Row, Screen, ScreenHeader } from "../components/ui";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "../i18n";
import { useAuth } from "../lib/useAuth";
import { COLORS, SPACING, TYPE } from "../constants/theme";
import { isPaymentEnabled } from "../services/payments";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, profile, staff, role, signOut } = useAuth();

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow={role ? role.toUpperCase() : t("nav.profile")}
        title={staff?.display_name || profile?.full_name || t("nav.profile")}
      />

      <View style={styles.body}>
        <Card>
          <Text style={styles.sectionLabel}>{t("auth.signedInAs")}</Text>
          <Text style={styles.email}>{profile?.email || session?.user?.email}</Text>
          {profile?.phone ? (
            <>
              <Divider />
              <Row left={t("auth.phone")} right={profile.phone} />
            </>
          ) : null}
        </Card>

        <Card>
          <LanguageSwitcher />
        </Card>

        {/* Honest state: no processor is connected, so say so rather than
            showing a dead "Payment methods" row that leads nowhere. */}
        {role === "customer" && !isPaymentEnabled() ? (
          <Card>
            <Text style={styles.sectionLabel}>{t("payment.title")}</Text>
            <Text style={styles.paymentNote}>{t("payment.notConnected")}</Text>
            <Text style={styles.paymentBody}>{t("payment.notConnectedBody")}</Text>
          </Card>
        ) : null}

        <GhostButton label={t("auth.signOut")} onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  sectionLabel: { ...TYPE.caption, color: COLORS.textMuted, letterSpacing: 1.2 },
  email: { ...TYPE.body, color: COLORS.text, fontWeight: "600", marginTop: SPACING.sm },
  paymentNote: { ...TYPE.small, color: COLORS.warning, fontWeight: "600", marginTop: SPACING.sm },
  paymentBody: { ...TYPE.caption, color: COLORS.textSecondary, fontWeight: "400", marginTop: SPACING.sm },
});
