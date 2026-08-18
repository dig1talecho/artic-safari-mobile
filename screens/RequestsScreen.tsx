import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { EmptyState, Loader, Screen } from "../components/ui";
import { useTranslation, formatCurrency } from "../i18n";
import { useAuth } from "../lib/useAuth";
import { useNotifications } from "../lib/useNotifications";
import { COLORS, RADIUS, SPACING, TYPE } from "../constants/theme";
import { supabase } from "../lib/supabase";
import type { Booking } from "../services/bookings";

/**
 * Staff dispatch queue.
 *
 * SECTIONS. Drivers only ever see taxi/transfer work; admins can switch
 * between taxi and tours. The filter below is UX; the real boundary is the
 * driver RLS policy, which also tests `booking_type` — see
 * supabase-driver-taxi-only-rls.sql in the web project. Keep TAXI_TYPES
 * and that policy's value list in sync.
 *
 * LAYOUT. Built for a thumb in a moving car: one card = one job, the
 * pickup address is the largest thing on it, and the primary action is a
 * full-width target at the bottom. A coloured stripe down the left edge
 * carries status so it reads without focusing.
 */

type Section = "taxi" | "tours";
type Filter = "open" | "mine" | "assigned" | "all";

const TAXI_TYPES = ["transfer", "taxi"];

/**
 * Drivers care about "can I take it" and "what did I take". Admins never
 * claim anything, so "Mine" would always be empty for them — they get
 * "Assigned" instead, which is the half of the flow they're watching.
 * Both roles end on "All" so no row is ever invisible in every tab.
 */
const DRIVER_FILTERS: Filter[] = ["open", "mine", "all"];
const ADMIN_FILTERS: Filter[] = ["open", "assigned", "all"];

export default function RequestsScreen({ navigation }: any) {
  const { t, language } = useTranslation();
  const { role, staff } = useAuth();
  const { unseenCount, markAllSeen } = useNotifications();

  const isAdmin = role === "admin";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<Section>("taxi");
  const [filter, setFilter] = useState<Filter>("open");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    // Newest first. Sorting by booking_date put a ride hailed *now* in the
    // middle of today's other rows instead of at the top of the queue.
    const { data, error: err } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) setError(err.message);
    else {
      setError("");
      setBookings((data as Booking[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    markAllSeen();
  }, [markAllSeen]);

  useEffect(() => {
    const channel = supabase
      .channel("staff-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const claim = async (booking: Booking) => {
    if (!staff?.display_name) return;
    setClaiming(booking.id);
    setError("");

    const { data, error: err } = await supabase
      .from("bookings")
      // Claim and advance in one statement. A job that has a driver but
      // still says "confirmed" is a lie the queue would then have to
      // reason about.
      .update({ assigned_driver: staff.display_name, status: "assigned" })
      .eq("id", booking.id)
      .is("assigned_driver", null)
      .select();

    setClaiming(null);
    if (err) return setError(err.message);
    if (!data?.length) {
      setError(t("requests.alreadyTaken"));
      return load();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    load();
  };

  const isTaxi = (b: Booking) => TAXI_TYPES.includes((b.booking_type || "").toLowerCase());

  // Drivers are locked to taxi work; the section switch only exists for admins.
  const activeSection: Section = isAdmin ? section : "taxi";

  const inSection = useMemo(
    () => bookings.filter((b) => (activeSection === "taxi" ? isTaxi(b) : !isTaxi(b))),
    [bookings, activeSection]
  );

  const matches = useCallback(
    (b: Booking, f: Filter) => {
      if (f === "all") return true;
      if (f === "open") return !b.assigned_driver && b.status !== "cancelled";
      if (f === "mine") return b.assigned_driver === staff?.display_name;
      return Boolean(b.assigned_driver) && b.status !== "cancelled";
    },
    [staff?.display_name]
  );

  const filters = isAdmin ? ADMIN_FILTERS : DRIVER_FILTERS;

  const counts = useMemo(() => {
    const out = {} as Record<Filter, number>;
    for (const f of filters) out[f] = inSection.filter((b) => matches(b, f)).length;
    return out;
  }, [inSection, filters, matches]);

  const visible = useMemo(
    () => inSection.filter((b) => matches(b, filter)),
    [inSection, filter, matches]
  );

  // Switching sections can land on a filter the new role/section list lacks.
  useEffect(() => {
    if (!filters.includes(filter)) setFilter("open");
  }, [filters, filter]);

  /**
   * A map URL for every request that has a pickup at all.
   *
   * Exact coordinates when the guest picked a geocoded result. When they
   * typed a place the geocoder didn't match there are no coordinates, but
   * the text is still the only thing the driver has to go on -- so this
   * falls back to a map *search* rather than hiding the button. "Tromsø,
   * Norway" is appended unless the text already says it, so a bare hotel
   * name can't resolve to a same-named street in another country.
   */
  const mapUrlFor = (b: Booking) => {
    if (b.pickup_lat != null && b.pickup_lng != null) {
      return `https://www.google.com/maps?q=${b.pickup_lat},${b.pickup_lng}`;
    }
    const text = b.pickup_address?.trim();
    if (!text) return null;
    const query = /troms[øo]/i.test(text) ? text : `${text}, Tromsø, Norway`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const stripeFor = (b: Booking) => {
    if (b.status === "cancelled") return COLORS.danger;
    if (b.assigned_driver === staff?.display_name) return COLORS.accent;
    if (!b.assigned_driver) return COLORS.dispatch;
    return COLORS.textMuted;
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
      {/* Compact operations header — no oversized hero, the list is the point. */}
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.role}>
            {isAdmin ? t("requests.adminEyebrow") : t("requests.driverEyebrow")}
          </Text>
          <Text style={styles.name}>{staff?.display_name}</Text>
        </View>
        {unseenCount > 0 ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>+{unseenCount}</Text>
          </View>
        ) : null}
      </View>

      {/* Section switch — admins only. Drivers have one job type. */}
      {isAdmin ? (
        <View style={styles.segment}>
          {(["taxi", "tours"] as Section[]).map((s) => {
            const active = section === s;
            return (
              <Pressable
                key={s}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSection(s);
                  setFilter("open");
                }}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {t(`requests.section_${s}` as any)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.tabs}>
        {filters.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setFilter(f);
              }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t(`requests.filter_${f}` as any)}
              </Text>
              <Text style={[styles.tabCount, active && styles.tabCountActive]}>{counts[f]}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <Loader label={t("common.loading")} />
      ) : visible.length === 0 ? (
        <EmptyState icon="◈" title={t("requests.empty")} />
      ) : (
        <View style={styles.list}>
          {visible.map((b) => {
            const mapUrl = mapUrlFor(b);
            const exact = b.pickup_lat != null && b.pickup_lng != null;
            const mine = b.assigned_driver === staff?.display_name;
            const open = !b.assigned_driver && b.status !== "cancelled";

            return (
              <View key={b.id} style={styles.job}>
                <View style={[styles.stripe, { backgroundColor: stripeFor(b) }]} />

                <View style={styles.jobBody}>
                  {/* Row 1: price + when. The two things checked first. */}
                  <View style={styles.topRow}>
                    <Text style={styles.price}>{formatCurrency(b.total_price, language)}</Text>
                    <Text style={styles.when}>
                      {b.booking_date}
                      {b.scheduled_time ? ` · ${b.scheduled_time}` : ""}
                    </Text>
                  </View>

                  {/* Row 2: the address, largest element on the card. */}
                  {b.pickup_address ? (
                    <>
                      <Text style={styles.pickup} numberOfLines={2}>
                        {b.pickup_address}
                      </Text>
                      {b.dropoff_address ? (
                        <Text style={styles.dropoff} numberOfLines={1}>
                          → {b.dropoff_address}
                        </Text>
                      ) : null}
                      {/* Say so rather than letting a searched address look
                          like a surveyed pin -- the driver decides how much
                          slack to leave for it. */}
                      {!exact ? (
                        <Text style={styles.approx}>{t("requests.approxPickup")}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.pickupMissing}>{t("requests.noPickup")}</Text>
                  )}

                  {/* Row 3: who + what */}
                  <View style={styles.metaRow}>
                    <Text style={styles.customer} numberOfLines={1}>
                      {b.customer_name}
                    </Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {b.item_title}
                    </Text>
                  </View>

                  {b.assigned_driver && !mine ? (
                    <Text style={styles.assigned}>
                      {t("requests.assignedTo")} {b.assigned_driver}
                    </Text>
                  ) : null}

                  {/* Actions — full-width targets, easy to hit one-handed. */}
                  <View style={styles.actions}>
                    {mapUrl ? (
                      <Pressable
                        onPress={() => Linking.openURL(mapUrl)}
                        style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                      >
                        <Text style={styles.secondaryActionText}>
                          {exact ? "◎" : "⌕"} {t("tracking.openInMaps")}
                        </Text>
                      </Pressable>
                    ) : null}

                    {mine ? (
                      <Pressable
                        onPress={() => navigation.navigate("Tracking", { bookingId: b.id })}
                        style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                      >
                        <Text style={styles.secondaryActionText}>▲ {t("tracking.title")}</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {role === "driver" && open ? (
                    <Pressable
                      onPress={() => claim(b)}
                      disabled={claiming === b.id}
                      style={({ pressed }) => [
                        styles.claim,
                        pressed && styles.pressed,
                        claiming === b.id && styles.claimBusy,
                      ]}
                    >
                      <Text style={styles.claimText}>
                        {claiming === b.id ? t("booking.sending") : t("requests.takeJob")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  role: { ...TYPE.caption, color: COLORS.accent, letterSpacing: 1.6 },
  name: { ...TYPE.h2, color: COLORS.text, marginTop: 2 },
  newBadge: {
    backgroundColor: COLORS.dispatch,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  newBadgeText: { fontSize: 13, fontWeight: "800", color: "#20160A" },

  segment: {
    flexDirection: "row",
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.sm,
    padding: 3,
    marginBottom: SPACING.md,
  },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm - 2, alignItems: "center" },
  segmentItemActive: { backgroundColor: COLORS.surfaceElevated },
  segmentText: { ...TYPE.small, fontWeight: "600", color: COLORS.textMuted },
  segmentTextActive: { color: COLORS.text },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xl,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: COLORS.accent },
  tabText: { ...TYPE.small, fontWeight: "600", color: COLORS.textMuted },
  tabTextActive: { color: COLORS.text },
  tabCount: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    backgroundColor: COLORS.glass,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
  },
  tabCountActive: { color: COLORS.onAccent, backgroundColor: COLORS.accent },

  error: { ...TYPE.small, color: COLORS.danger, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

  list: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.md },

  job: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  stripe: { width: 4 },
  jobBody: { flex: 1, padding: SPACING.lg, gap: 4 },

  topRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  price: { fontSize: 22, lineHeight: 26, fontWeight: "800", color: COLORS.text },
  when: { ...TYPE.caption, color: COLORS.textSecondary, fontWeight: "500" },

  pickup: { fontSize: 17, lineHeight: 23, fontWeight: "600", color: COLORS.text, marginTop: 6 },
  dropoff: { ...TYPE.small, color: COLORS.textSecondary, marginTop: 2 },
  approx: { ...TYPE.caption, color: COLORS.warning, fontWeight: "500", marginTop: 4 },
  pickupMissing: { ...TYPE.small, color: COLORS.textMuted, fontStyle: "italic", marginTop: 6 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  customer: { ...TYPE.caption, color: COLORS.text, fontWeight: "600", flexShrink: 1 },
  dot: { color: COLORS.textMuted, fontSize: 11 },
  itemTitle: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "400", flexShrink: 1 },

  assigned: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "500", marginTop: 4 },

  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  secondaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: { ...TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },

  claim: {
    minHeight: 50,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.dispatch,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  claimBusy: { opacity: 0.6 },
  claimText: { fontSize: 15, fontWeight: "800", color: "#20160A", letterSpacing: 0.4 },

  pressed: { opacity: 0.7 },
});
