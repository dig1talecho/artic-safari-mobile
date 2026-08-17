import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Card,
  Divider,
  EmptyState,
  GhostButton,
  Loader,
  Pill,
  Screen,
  ScreenHeader,
} from "../components/ui";
import { useTranslation, formatCurrency } from "../i18n";
import { useAuth } from "../lib/useAuth";
import { COLORS, SPACING, STATUS_STYLE, TYPE } from "../constants/theme";
import { listMyBookings, type Booking } from "../services/bookings";
import { daysUntil } from "../lib/dates";

export default function MyBookingsScreen({ navigation }: any) {
  const { t, language } = useTranslation();
  const { session } = useAuth();
  const email = session?.user?.email;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!email) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data, error } = await listMyBookings(email);
    if (!error) setBookings((data as Booking[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [email]);

  useEffect(() => {
    load();
  }, [load]);

  const active = bookings.filter((b) => b.status !== "cancelled");
  const spend = active.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
  const upcoming = active.filter((b) => daysUntil(b.booking_date) >= 0).length;

  const countdown = (b: Booking) => {
    if (b.status !== "confirmed") return null;
    const d = daysUntil(b.booking_date);
    if (d < 0) return null;
    if (d === 0) return t("myBookings.today");
    if (d === 1) return t("myBookings.tomorrow");
    return t("myBookings.inDays", { count: d });
  };

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
      <ScreenHeader
        eyebrow={t("nav.bookings")}
        title={t("myBookings.title")}
        subtitle={email ?? undefined}
      />

      {loading ? (
        <Loader label={t("common.loading")} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="✧"
          title={t("myBookings.empty")}
          action={
            <GhostButton
              label={t("myBookings.browseTours")}
              onPress={() => navigation.navigate("ToursTab")}
            />
          }
        />
      ) : (
        <View style={styles.body}>
          <View style={styles.stats}>
            <Stat label={t("myBookings.totalBookings")} value={String(bookings.length)} />
            <Stat label={t("myBookings.upcoming")} value={String(upcoming)} />
            <Stat label={t("myBookings.lifetimeSpend")} value={formatCurrency(spend, language)} />
          </View>

          {bookings.map((b) => {
            const status = STATUS_STYLE[b.status] ?? STATUS_STYLE.pending;
            const cd = countdown(b);
            return (
              <Card key={b.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.flex}>
                    <Text style={styles.type}>{b.booking_type}</Text>
                    <Text style={styles.itemTitle}>{b.item_title}</Text>
                  </View>
                  <Pill
                    label={t(status.labelKey as any)}
                    color={status.color}
                    background={status.background}
                  />
                </View>

                <View style={styles.dateRow}>
                  <Text style={styles.date}>
                    {b.booking_date}
                    {b.scheduled_time ? ` · ${b.scheduled_time}` : ""}
                  </Text>
                  {cd ? <Pill label={cd} /> : null}
                </View>

                <Divider style={styles.divider} />

                <View style={styles.footRow}>
                  <View>
                    <Text style={styles.total}>{formatCurrency(b.total_price, language)}</Text>
                    {b.loyalty_discount > 0 ? (
                      <Text style={styles.savedNote}>
                        −{formatCurrency(b.loyalty_discount, language)} ·{" "}
                        {b.points_redeemed} {t("rewards.points")}
                      </Text>
                    ) : null}
                  </View>
                  {b.status === "confirmed" ? (
                    <GhostButton
                      label={t("tracking.title")}
                      onPress={() => navigation.navigate("Tracking", { bookingId: b.id })}
                      style={styles.trackBtn}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  stats: { flexDirection: "row", gap: SPACING.md },
  stat: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: SPACING.md,
  },
  statValue: { ...TYPE.h3, color: COLORS.text },
  statLabel: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "500", marginTop: 3 },

  card: { gap: SPACING.md },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  type: { ...TYPE.caption, color: COLORS.textMuted, letterSpacing: 1.2 },
  itemTitle: { ...TYPE.h3, color: COLORS.text, marginTop: 3 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, flexWrap: "wrap" },
  date: { ...TYPE.small, color: COLORS.textSecondary },
  divider: { marginVertical: 0 },
  footRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.md },
  total: { ...TYPE.h3, color: COLORS.text },
  savedNote: { ...TYPE.caption, color: COLORS.gold, fontWeight: "500", marginTop: 2 },
  trackBtn: { paddingHorizontal: SPACING.lg, minHeight: 44 },
});
