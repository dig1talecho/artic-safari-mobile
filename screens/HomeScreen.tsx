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

type FilterTab = "all" | BookingStatus;

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

  const renderItem = ({ item }: { item: Booking }) => {
    const isCompleted = item.status === "completed";
    const isConfirmed = item.status === "confirmed";

    return (
      <View style={[styles.card, isCompleted && styles.completedCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <View
            style={[
              styles.statusPill,
              isCompleted
                ? styles.pillCompleted
                : isConfirmed
                ? styles.pillConfirmed
                : styles.pillPending,
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.tourTitle}>{item.item_title}</Text>
        <Text style={styles.dateText}>📅 {item.booking_date}</Text>

        <TouchableOpacity onPress={() => openMap(item.notes)} style={styles.locationBox}>
          <Text style={styles.notesText} numberOfLines={2}>
            📍 {item.notes || "Location not specified"}{" "}
            <Text style={styles.mapLink}>(Open Map ↗)</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnConfirm]}
            onPress={() => updateStatus(item.id, "confirmed")}
          >
            <Text style={styles.btnTextDark}>Confirm / On Way</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnComplete]}
            onPress={() => updateStatus(item.id, "completed")}
          >
            <Text style={styles.btnTextLight}>Complete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />

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

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#38bdf8" }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#22c55e" }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {(["all", "pending", "confirmed", "completed"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => {
              setActiveTab(tab);
              if (Platform.OS !== "web") Haptics.selectionAsync();
            }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
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
    backgroundColor: "#050811",
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
    color: "#38bdf8",
    letterSpacing: 2,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  liveText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f8fafc",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  activeTabButton: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "#38bdf8",
  },
  tabText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  activeTabText: {
    color: "#38bdf8",
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.15)",
  },
  completedCard: {
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(34, 197, 94, 0.02)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  customerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillPending: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  pillConfirmed: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  pillCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#f8fafc",
  },
  tourTitle: {
    fontSize: 15,
    color: "#38bdf8",
    marginBottom: 6,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 10,
  },
  locationBox: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  notesText: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  mapLink: {
    color: "#38bdf8",
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  btnConfirm: {
    backgroundColor: "#38bdf8",
  },
  btnComplete: {
    backgroundColor: "#22c55e",
  },
  btnTextDark: {
    color: "#050811",
    fontWeight: "bold",
    fontSize: 12,
  },
  btnTextLight: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
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
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
});
