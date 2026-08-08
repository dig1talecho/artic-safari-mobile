import { StyleSheet, Text, View } from "react-native";
import GlassCard from "./GlassCard";
import { COLORS } from "../constants/theme";

interface DashboardSummaryProps {
  total: number;
  active: number;
  completed: number;
}

export default function DashboardSummary({
  total,
  active,
  completed,
}: DashboardSummaryProps) {
  return (
    <GlassCard>
      <View style={styles.row}>
        <StatCell label="Total Tours" value={total} color={COLORS.textPrimary} />
        <View style={styles.divider} />
        <StatCell label="Active" value={active} color={COLORS.auroraIce} />
        <View style={styles.divider} />
        <StatCell label="Completed" value={completed} color={COLORS.success} />
      </View>
    </GlassCard>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  cell: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
});
