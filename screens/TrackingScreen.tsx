import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, GhostButton, Loader, Pill, Screen, ScreenHeader } from "../components/ui";
import { useTranslation } from "../i18n";
import { COLORS, SPACING, TYPE } from "../constants/theme";
import { getBooking, subscribeToBooking, type Booking } from "../services/bookings";
import {
  getDriverLocation,
  subscribeToDriverLocation,
  type DriverLocation,
} from "../services/tracking";

export default function TrackingScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const { t } = useTranslation();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBooking(bookingId).then(({ data }) => {
      setBooking((data as Booking) ?? null);
      setLoading(false);
    });
    getDriverLocation(bookingId).then(({ data }) =>
      setLocation((data as DriverLocation) ?? null)
    );

    const offBooking = subscribeToBooking(bookingId, setBooking);
    const offLocation = subscribeToDriverLocation(bookingId, setLocation);
    return () => {
      offBooking();
      offLocation();
    };
  }, [bookingId]);

  const openMaps = () => {
    if (!location) return;
    Linking.openURL(`https://www.google.com/maps?q=${location.lat},${location.lng}`);
  };

  if (loading) {
    return (
      <Screen>
        <Loader label={t("common.loading")} />
      </Screen>
    );
  }

  const lastSeen = location
    ? new Date(location.updated_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow={t("nav.bookings")}
        title={t("tracking.title")}
        subtitle={booking?.item_title}
        right={
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        }
      />

      <View style={styles.body}>
        <Card glow={!!location}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, location ? styles.dotLive : styles.dotIdle]} />
            <Text style={styles.statusText}>
              {location ? t("tracking.driverOnWay") : t("tracking.noDriverYet")}
            </Text>
          </View>

          {booking?.assigned_driver ? (
            <View style={styles.driverRow}>
              <Text style={styles.driverLabel}>{t("tracking.driverAssigned")}</Text>
              <Text style={styles.driverName}>{booking.assigned_driver}</Text>
            </View>
          ) : null}

          {location ? (
            <>
              <View style={styles.coordRow}>
                <Text style={styles.coord}>
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </Text>
                {lastSeen ? (
                  <Pill label={`${t("tracking.lastUpdated")} ${lastSeen}`} />
                ) : null}
              </View>
              <GhostButton
                label={t("tracking.openInMaps")}
                onPress={openMaps}
                style={styles.mapBtn}
              />
            </>
          ) : (
            <Text style={styles.hint}>
              {/* Honest: there is no position to show until a driver starts sending one. */}
              {t("tracking.etaUnknown")}
            </Text>
          )}
        </Card>

        {booking ? (
          <Card>
            <Text style={styles.blockTitle}>{booking.item_title}</Text>
            <Text style={styles.meta}>
              {booking.booking_date}
              {booking.scheduled_time ? ` · ${booking.scheduled_time}` : ""}
            </Text>
            {booking.notes ? <Text style={styles.notes}>{booking.notes}</Text> : null}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { fontSize: 19, color: COLORS.textMuted },
  body: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  statusRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLive: { backgroundColor: COLORS.success },
  dotIdle: { backgroundColor: COLORS.textMuted },
  statusText: { ...TYPE.h3, color: COLORS.text },
  driverRow: { marginTop: SPACING.lg, gap: 3 },
  driverLabel: { ...TYPE.caption, color: COLORS.textMuted, letterSpacing: 1.2 },
  driverName: { ...TYPE.body, color: COLORS.text, fontWeight: "600" },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
    marginTop: SPACING.lg,
    flexWrap: "wrap",
  },
  coord: { ...TYPE.small, color: COLORS.textSecondary, fontVariant: ["tabular-nums"] },
  mapBtn: { marginTop: SPACING.lg },
  hint: { ...TYPE.small, color: COLORS.textMuted, marginTop: SPACING.md },
  blockTitle: { ...TYPE.h3, color: COLORS.text },
  meta: { ...TYPE.small, color: COLORS.textSecondary, marginTop: SPACING.sm },
  notes: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "400", marginTop: SPACING.md },
});
