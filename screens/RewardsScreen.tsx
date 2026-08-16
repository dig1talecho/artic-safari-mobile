import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Divider, EmptyState, Loader, Screen, ScreenHeader } from "../components/ui";
import { useTranslation, formatCurrency } from "../i18n";
import { useAuth } from "../lib/useAuth";
import { COLORS, GRADIENT_GOLD, RADIUS, SPACING, TYPE } from "../constants/theme";
import {
  getLoyaltyRules,
  getMyBalance,
  listMyTransactions,
  type LoyaltyRules,
  type LoyaltyTransaction,
} from "../services/loyalty";

const KIND_LABEL: Record<string, string> = {
  earned: "rewards.earnedOn",
  redeemed: "rewards.redeemedOn",
  adjustment: "rewards.adjustment",
  expired: "rewards.expired",
};

export default function RewardsScreen() {
  const { t, language } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [rules, setRules] = useState<LoyaltyRules | null>(null);
  const [balance, setBalance] = useState<{
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
  } | null>(null);
  const [txns, setTxns] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [rulesRes, balanceRes, txnRes] = await Promise.all([
      getLoyaltyRules(),
      getMyBalance(userId),
      listMyTransactions(userId),
    ]);

    // The loyalty migration may not have been run yet — say so plainly
    // rather than rendering a confident "0 points".
    if (rulesRes.error && balanceRes.error) setUnavailable(true);

    setRules((rulesRes.data as LoyaltyRules) ?? null);
    setBalance((balanceRes.data as any) ?? { balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
    setTxns(txnRes.error ? [] : ((txnRes.data as LoyaltyTransaction[]) ?? []));
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={COLORS.accent}
        />
      }
    >
      <ScreenHeader eyebrow={t("nav.rewards")} title={t("rewards.title")} />

      {loading ? (
        <Loader label={t("common.loading")} />
      ) : unavailable ? (
        <EmptyState
          icon="✦"
          title={t("rewards.title")}
          body="Reward points are not switched on for this account yet."
        />
      ) : (
        <View style={styles.body}>
          <LinearGradient
            colors={GRADIENT_GOLD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>{t("rewards.balance")}</Text>
            <Text style={styles.balanceValue}>{balance?.balance ?? 0}</Text>
            <Text style={styles.balanceUnit}>{t("rewards.points")}</Text>
            {rules ? (
              <Text style={styles.balanceWorth}>
                ≈ {formatCurrency((balance?.balance ?? 0) * rules.kr_per_point, language)}
              </Text>
            ) : null}
          </LinearGradient>

          <View style={styles.statRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{balance?.lifetime_earned ?? 0}</Text>
              <Text style={styles.statLabel}>{t("rewards.lifetimeEarned")}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{balance?.lifetime_spent ?? 0}</Text>
              <Text style={styles.statLabel}>{t("rewards.lifetimeSpent")}</Text>
            </Card>
          </View>

          <Card>
            <Text style={styles.howTitle}>{t("rewards.howItWorks")}</Text>
            {rules ? (
              <Text style={styles.howBody}>
                {rules.points_per_100_kr} {t("rewards.points")} / 100 kr ·{" "}
                {t("rewards.redeemMin", { count: rules.min_redeem_points })}
              </Text>
            ) : null}
          </Card>

          <View>
            <Text style={styles.historyTitle}>{t("rewards.history")}</Text>
            {txns.length === 0 ? (
              <Text style={styles.emptyHistory}>{t("rewards.emptyHistory")}</Text>
            ) : (
              <Card style={styles.historyCard}>
                {txns.map((tx, i) => (
                  <View key={tx.id}>
                    {i > 0 ? <Divider style={styles.historyDivider} /> : null}
                    <View style={styles.txnRow}>
                      <View style={styles.txnLeft}>
                        <Text style={styles.txnKind}>{t(KIND_LABEL[tx.kind] as any)}</Text>
                        {tx.reason ? (
                          <Text style={styles.txnReason} numberOfLines={1}>
                            {tx.reason}
                          </Text>
                        ) : null}
                        <Text style={styles.txnDate}>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.txnPoints,
                          tx.points > 0 ? styles.txnPositive : styles.txnNegative,
                        ]}
                      >
                        {tx.points > 0 ? "+" : ""}
                        {tx.points}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  balanceCard: { borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: "center" },
  balanceLabel: {
    ...TYPE.caption,
    color: "rgba(4,18,26,0.65)",
    letterSpacing: 1.4,
  },
  balanceValue: { fontSize: 52, lineHeight: 58, fontWeight: "800", color: "#1A1206" },
  balanceUnit: { ...TYPE.small, color: "rgba(4,18,26,0.7)", fontWeight: "600" },
  balanceWorth: { ...TYPE.caption, color: "rgba(4,18,26,0.6)", fontWeight: "600", marginTop: SPACING.sm },

  statRow: { flexDirection: "row", gap: SPACING.md },
  statCard: { flex: 1, alignItems: "center" },
  statValue: { ...TYPE.h2, color: COLORS.text },
  statLabel: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "500", marginTop: 3 },

  howTitle: { ...TYPE.small, color: COLORS.text },
  howBody: { ...TYPE.caption, color: COLORS.accent, fontWeight: "600", marginTop: SPACING.sm },

  historyTitle: { ...TYPE.h3, color: COLORS.text, marginBottom: SPACING.md },
  emptyHistory: { ...TYPE.small, color: COLORS.textMuted },
  historyCard: { gap: 0 },
  historyDivider: { marginVertical: SPACING.md },
  txnRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  txnLeft: { flex: 1 },
  txnKind: { ...TYPE.small, color: COLORS.text, fontWeight: "600" },
  txnReason: { ...TYPE.caption, color: COLORS.textSecondary, fontWeight: "400", marginTop: 2 },
  txnDate: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "400", marginTop: 2 },
  txnPoints: { ...TYPE.h3 },
  txnPositive: { color: COLORS.success },
  txnNegative: { color: COLORS.textSecondary },
});
