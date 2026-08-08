import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS, RADIUS } from "../constants/theme";

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  borderColor?: string;
  glowColor?: string;
}

// Frosted-glass container: real native blur + a translucent tint on top,
// so it stays legible over any background instead of just faking opacity.
export default function GlassCard({
  children,
  style,
  borderColor = COLORS.glassBorder,
  glowColor,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.wrapper,
        { borderColor },
        glowColor && {
          shadowColor: glowColor,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
        style,
      ]}
    >
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: COLORS.glassSurface,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 6, 9, 0.35)",
  },
  content: {
    padding: 18,
  },
});
