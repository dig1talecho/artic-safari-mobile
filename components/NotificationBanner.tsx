import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "../lib/useNotifications";
import { useTranslation } from "../i18n";
import { COLORS, RADIUS, SPACING, TYPE } from "../constants/theme";

/**
 * Slide-in alert for a newly arrived request.
 *
 * Animated with the native driver (translateY + opacity only), so the slide
 * runs on the platform's animation thread and stays smooth even while the
 * requests list is re-querying Supabase in the background.
 *
 * Auto-dismisses after 5s. Tapping it opens the queue.
 */
export default function NotificationBanner({ onPress }: { onPress?: () => void }) {
  const { banner, dismissBanner } = useNotifications();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (!banner) return;

    slide.setValue(-1);
    Animated.timing(slide, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(slide, {
        toValue: -1,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) dismissBanner();
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [banner, slide, dismissBanner]);

  if (!banner) return null;

  const translateY = slide.interpolate({ inputRange: [-1, 0], outputRange: [-160, 0] });
  const opacity = slide.interpolate({ inputRange: [-1, -0.4, 0], outputRange: [0, 0.5, 1] });

  // Amber for a waiting ride, cyan for a tour booking — same colour language
  // as the queue itself, so the banner tells you which section to open before
  // you've finished reading it.
  const tone = banner.isTaxi ? COLORS.dispatch : COLORS.accent;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { top: insets.top + SPACING.sm, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        onPress={() => {
          dismissBanner();
          onPress?.();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}. ${banner.body}`}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View style={styles.card}>
          <View style={[styles.accentBar, { backgroundColor: tone }]} />
          <View style={styles.body}>
            <Text style={[styles.eyebrow, { color: tone }]}>
              {banner.isTaxi ? t("requests.newTaxi") : t("requests.newTour")}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {banner.title}
            </Text>
            {banner.body ? (
              <Text style={styles.sub} numberOfLines={1}>
                {banner.body}
              </Text>
            ) : null}
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  accentBar: { width: 5, alignSelf: "stretch" },
  body: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg },
  eyebrow: { ...TYPE.caption, letterSpacing: 1.4, textTransform: "uppercase" },
  title: { ...TYPE.bodyStrong, color: COLORS.text, marginTop: 3 },
  sub: { ...TYPE.caption, color: COLORS.textSecondary, fontWeight: "400", marginTop: 2 },
  chevron: { fontSize: 26, color: COLORS.textMuted, paddingRight: SPACING.lg },
  pressed: { opacity: 0.8 },
});
