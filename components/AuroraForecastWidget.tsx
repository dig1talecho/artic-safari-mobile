import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import GlassCard from "./GlassCard";
import { AURORA_GRADIENT, COLORS, RADIUS } from "../constants/theme";

interface AuroraForecastWidgetProps {
  // 0-100 aurora visibility probability for tonight.
  // Placeholder value until a real KP-index / aurora forecast API is wired in.
  probability: number;
}

function getForecastLabel(probability: number) {
  if (probability >= 75) return "Excellent";
  if (probability >= 50) return "High";
  if (probability >= 25) return "Moderate";
  return "Low";
}

export default function AuroraForecastWidget({
  probability,
}: AuroraForecastWidgetProps) {
  const glowPulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.6,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowPulse]);

  const orbScale = glowPulse.interpolate({
    inputRange: [0.6, 1],
    outputRange: [0.92, 1.04],
  });

  return (
    <GlassCard borderColor={COLORS.glassBorderStrong} glowColor={COLORS.auroraTeal}>
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <Text style={styles.eyebrow}>TONIGHT'S AURORA FORECAST</Text>
          <View style={styles.valueRow}>
            <Text style={styles.probability}>{Math.round(probability)}%</Text>
            <View style={styles.labelChip}>
              <Text style={styles.labelChipText}>{getForecastLabel(probability)}</Text>
            </View>
          </View>
          <Text style={styles.caption}>Visibility odds over Tromsø tonight</Text>
        </View>

        <View style={styles.orbContainer}>
          <Animated.View
            style={[
              styles.orbGlow,
              { opacity: glowPulse, transform: [{ scale: orbScale }] },
            ]}
          >
            <LinearGradient
              colors={AURORA_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbGradient}
            />
          </Animated.View>
        </View>
      </View>
    </GlassCard>
  );
}

const ORB_SIZE = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textColumn: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: COLORS.auroraTeal,
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  probability: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  labelChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.4)",
  },
  labelChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.auroraEmerald,
  },
  caption: {
    marginTop: 6,
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    shadowColor: COLORS.auroraTeal,
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  orbGradient: {
    width: "100%",
    height: "100%",
    borderRadius: ORB_SIZE / 2,
  },
});
