import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Loader, Pill, PrimaryButton, Screen } from "../components/ui";
import BookingSheet from "../components/BookingSheet";
import { useTranslation } from "../i18n";
import { COLORS, GRADIENT_SCRIM, RADIUS, SPACING, TYPE } from "../constants/theme";
import { getTourBySlug, type Tour } from "../services/tours";

export default function TourDetailScreen({ route, navigation }: any) {
  const { slug } = route.params;
  const { t } = useTranslation();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    getTourBySlug(slug).then(({ data }) => {
      setTour((data as Tour) ?? null);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <Screen>
        <Loader label={t("common.loading")} />
      </Screen>
    );
  }

  if (!tour) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.notFound}>{t("tours.empty")}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Screen scroll edges={[]}>
        <View style={styles.hero}>
          {tour.cover_image ? (
            <Image
              source={{ uri: tour.cover_image }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={tour.cover_image_alt || tour.title}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]} />
          )}
          <LinearGradient colors={GRADIENT_SCRIM} style={styles.heroScrim} />
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={10}
            accessibilityLabel={t("common.back")}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {tour.eyebrow ? <Pill label={tour.eyebrow} /> : null}
          <Text style={styles.title}>{tour.title}</Text>
          {tour.intro ? <Text style={styles.intro}>{tour.intro}</Text> : null}

          {(tour.duration || tour.meeting_point) && (
            <View style={styles.metaRow}>
              {tour.duration ? (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>{t("tours.duration")}</Text>
                  <Text style={styles.metaValue}>{tour.duration}</Text>
                </View>
              ) : null}
              {tour.meeting_point ? (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>{t("tours.meetingPoint")}</Text>
                  <Text style={styles.metaValue}>{tour.meeting_point}</Text>
                </View>
              ) : null}
            </View>
          )}

          <Card glow style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>{t("tours.from")}</Text>
              <Text style={styles.price}>{tour.price}</Text>
              {tour.price_note ? <Text style={styles.priceNote}>{tour.price_note}</Text> : null}
            </View>
          </Card>

          {tour.features?.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>{t("tours.included")}</Text>
              {tour.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={styles.check}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {tour.highlights?.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>{t("tours.highlights")}</Text>
              {tour.highlights.map((h, i) => (
                <View key={h} style={styles.featureRow}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                  <Text style={styles.featureText}>{h}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Screen>

      <View style={styles.cta}>
        <PrimaryButton label={t("tours.bookThis")} onPress={() => setBooking(true)} />
      </View>

      <BookingSheet tour={tour} visible={booking} onClose={() => setBooking(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { ...TYPE.body, color: COLORS.textSecondary },

  hero: { height: 300, width: "100%" },
  heroImage: { width: "100%", height: "100%" },
  heroFallback: { backgroundColor: COLORS.surfaceElevated },
  heroScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 160 },
  backBtn: {
    position: "absolute",
    top: 52,
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(5,7,13,0.6)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: COLORS.text, fontSize: 19 },

  body: { padding: SPACING.xl, gap: SPACING.lg, marginTop: -SPACING.xxl },
  title: { ...TYPE.display, color: COLORS.text, letterSpacing: -0.5 },
  intro: { ...TYPE.body, color: COLORS.textSecondary },

  metaRow: { flexDirection: "row", gap: SPACING.xl, flexWrap: "wrap" },
  metaItem: { gap: 3 },
  metaLabel: { ...TYPE.caption, color: COLORS.textMuted, letterSpacing: 1 },
  metaValue: { ...TYPE.small, color: COLORS.text, fontWeight: "600" },

  priceCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceLabel: { ...TYPE.caption, color: COLORS.textMuted, letterSpacing: 1.2 },
  price: { ...TYPE.price, color: COLORS.text, marginTop: 4 },
  priceNote: { ...TYPE.caption, color: COLORS.textSecondary, fontWeight: "400", marginTop: 3 },

  block: { gap: SPACING.md },
  blockTitle: { ...TYPE.h3, color: COLORS.text },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  check: { color: COLORS.accent, fontSize: 14, marginTop: 2, width: 18 },
  stepNum: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
    width: 18,
    marginTop: 3,
  },
  featureText: { ...TYPE.small, color: COLORS.textSecondary, flex: 1 },

  cta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    backgroundColor: "rgba(5,7,13,0.94)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
