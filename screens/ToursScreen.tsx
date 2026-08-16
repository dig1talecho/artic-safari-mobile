import { useCallback, useEffect, useState } from "react";
import { Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Card, EmptyState, Loader, Pill, Screen, ScreenHeader } from "../components/ui";
import { useTranslation } from "../i18n";
import { COLORS, GRADIENT_SCRIM, RADIUS, SPACING, TYPE } from "../constants/theme";
import { getTours, type Tour } from "../services/tours";

export default function ToursScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getTours();
    if (!error) setTours((data as Tour[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      <ScreenHeader
        eyebrow={t("common.appName")}
        title={t("tours.title")}
        subtitle={t("tours.subtitle")}
      />

      {loading ? (
        <Loader label={t("common.loading")} />
      ) : tours.length === 0 ? (
        <EmptyState icon="❄" title={t("tours.empty")} />
      ) : (
        <View style={styles.list}>
          {tours.map((tour) => (
            <Card
              key={tour.id}
              style={styles.card}
              onPress={() => navigation.navigate("TourDetail", { slug: tour.slug })}
            >
              {tour.cover_image ? (
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: tour.cover_image }}
                    style={styles.image}
                    resizeMode="cover"
                    accessibilityLabel={tour.cover_image_alt || tour.title}
                  />
                  <LinearGradient colors={GRADIENT_SCRIM} style={styles.scrim} />
                  {tour.eyebrow ? (
                    <View style={styles.badge}>
                      <Pill label={tour.eyebrow} />
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{tour.title}</Text>
                {tour.intro ? (
                  <Text style={styles.cardIntro} numberOfLines={2}>
                    {tour.intro}
                  </Text>
                ) : null}

                <View style={styles.metaRow}>
                  {tour.duration ? <Text style={styles.meta}>⏱ {tour.duration}</Text> : null}
                  {tour.price_note ? <Text style={styles.meta}>· {tour.price_note}</Text> : null}
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.price}>{tour.price}</Text>
                  <Text style={styles.cta}>{t("tours.bookThis")} →</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  card: { padding: 0 },
  imageWrap: { height: 172, width: "100%" },
  image: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 90 },
  badge: { position: "absolute", top: SPACING.md, left: SPACING.md },
  cardBody: { padding: SPACING.lg, gap: SPACING.sm },
  cardTitle: { ...TYPE.h2, color: COLORS.text },
  cardIntro: { ...TYPE.small, color: COLORS.textSecondary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.xs },
  meta: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "500" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  price: { ...TYPE.h2, color: COLORS.text },
  cta: { ...TYPE.small, color: COLORS.accent, fontWeight: "700" },
});
