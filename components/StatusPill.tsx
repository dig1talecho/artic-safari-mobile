import { StyleSheet, Text, View } from "react-native";
import type { BookingStatus } from "../types/booking";
import { RADIUS, STATUS_ACCENT } from "../constants/theme";

interface StatusPillProps {
  status: BookingStatus;
}

export default function StatusPill({ status }: StatusPillProps) {
  const accent = STATUS_ACCENT[status] ?? STATUS_ACCENT.pending;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: `${accent}22`,
          borderColor: `${accent}66`,
          shadowColor: accent,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: accent, shadowColor: accent }]} />
      <Text style={[styles.label, { color: accent }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
