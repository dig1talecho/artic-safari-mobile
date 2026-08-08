import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import GlassCard from "./GlassCard";
import StatusPill from "./StatusPill";
import { COLORS, STATUS_ACCENT } from "../constants/theme";
import type { Booking } from "../types/booking";

interface BookingCardProps {
  booking: Booking;
  index: number;
  onConfirm: (id: string) => void;
  onComplete: (id: string) => void;
  onOpenMap: (location: string | null) => void;
}

export default function BookingCard({
  booking,
  index,
  onConfirm,
  onComplete,
  onOpenMap,
}: BookingCardProps) {
  const isCompleted = booking.status === "completed";
  const accent = STATUS_ACCENT[booking.status] ?? STATUS_ACCENT.pending;

  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  const entranceStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={entranceStyle}>
      <GlassCard
        borderColor={isCompleted ? "rgba(52, 211, 153, 0.5)" : COLORS.glassBorder}
        glowColor={isCompleted ? COLORS.success : undefined}
        style={styles.cardOverride}
      >
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        <View style={styles.header}>
          <Text style={styles.customerName}>{booking.customer_name}</Text>
          <StatusPill status={booking.status} />
        </View>

        <Text style={styles.tourTitle}>{booking.item_title}</Text>
        <Text style={styles.dateText}>📅 {booking.booking_date}</Text>

        <Pressable onPress={() => onOpenMap(booking.notes)} style={styles.locationBox}>
          <Text style={styles.notesText} numberOfLines={2}>
            📍 {booking.notes || "Location not specified"}{" "}
            <Text style={styles.mapLink}>Open Map ↗</Text>
          </Text>
        </Pressable>

        <View style={styles.actionRow}>
          <ActionButton
            label="Confirm / On the Way"
            colors={[COLORS.auroraIce, COLORS.auroraTeal]}
            textColor={COLORS.background}
            onPress={() => onConfirm(booking.id)}
          />
          <ActionButton
            label="Complete"
            colors={[COLORS.auroraEmerald, COLORS.success]}
            textColor={COLORS.background}
            onPress={() => onComplete(booking.id)}
          />
        </View>
      </GlassCard>
    </Animated.View>
  );
}

interface ActionButtonProps {
  label: string;
  colors: [string, string];
  textColor: string;
  onPress: () => void;
}

function ActionButton({ label, colors, textColor, onPress }: ActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionButtonGradient}
        >
          <Text style={[styles.actionButtonText, { color: textColor }]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOverride: {
    marginBottom: 16,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  customerName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  tourTitle: {
    fontSize: 15,
    color: COLORS.auroraIce,
    marginBottom: 6,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  locationBox: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  notesText: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  mapLink: {
    color: COLORS.auroraIce,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonText: {
    fontWeight: "800",
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
});
