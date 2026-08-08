import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import type { Booking, BookingStatus } from "../types/booking";
import { COLORS, RADIUS } from "../constants/theme";
import AuroraForecastWidget from "../components/AuroraForecastWidget";
import DashboardSummary from "../components/DashboardSummary";
import BookingCard from "../components/BookingCard";

type FilterTab = "all" | BookingStatus;

const FILTER_TABS: FilterTab[] = ["all", "pending", "confirmed", "completed"];

// Placeholder tonight's aurora probability until a real KP-index feed is wired in.
const AURORA_PROBABILITY = 68;

export default function HomeScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: true });

    if (error) {
      Alert.alert("Error", "Failed to load tours.");
      console.error(error);
    } else {
      setBookings(data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    fetchBookings();
  };

  const updateStatus = async (id: string, newStatus: BookingStatus) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Failed to update status.");
    } else {
      setBookings((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );
    }
  };

  const openMap = (locationText: string | null) => {
    if (!locationText) {
      Alert.alert("Info", "No location detail provided.");
      return;
    }

    let cleanLocation = locationText;
    if (cleanLocation.includes("Preferred Time:")) {
      cleanLocation = cleanLocation.replace(/Preferred Time:.*?(-\s*|$)/g, "").trim();
    }

    const encodedLocation = encodeURIComponent(cleanLocation);
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedLocation}`,
      android: `geo:0,0?q=${encodedLocation}`,
      default: fallbackUrl,
    });

    Linking.openURL(url!).catch(() => {
      Linking.openURL(fallbackUrl);
    });
  };

  const filteredBookings = bookings.filter((item) => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  const totalCount = bookings.length;
  const activeCount = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  ).length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <View>
          <Text style={styles.brandSubtitle}>ARCTIC SAFARI</Text>
          <Text style={styles.headerTitle}>Driver Cockpit</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.auroraIce} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <BookingCard
              booking={item}
              index={index}
              onConfirm={(id) => updateStatus(id, "confirmed")}
              onComplete={(id) => updateStatus(id, "completed")}
              onOpenMap={openMap}
            />
          )}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <AuroraForecastWidget probability={AURORA_PROBABILITY} />

              <View style={styles.summarySpacing}>
                <DashboardSummary
                  total={totalCount}
                  active={activeCount}
                  completed={completedCount}
                />
              </View>

              <View style={styles.tabContainer}>
                {FILTER_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                    onPress={() => {
                      setActiveTab(tab);
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                    }}
                  >
                    <Text
                      style={[styles.tabText, activeTab === tab && styles.activeTabText]}
                    >
                      {tab.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.auroraIce}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🌌</Text>
              <Text style={styles.emptyText}>All clear for now! Enjoy the Arctic silence.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  brandSubtitle: {
    fontSize: 10,
    color: COLORS.auroraIce,
    letterSpacing: 2,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 20,
    paddingTop: 16,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 4,
  },
  summarySpacing: {
    marginTop: 14,
  },
  tabContainer: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  activeTabButton: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: COLORS.auroraIce,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  activeTabText: {
    color: COLORS.auroraIce,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});
