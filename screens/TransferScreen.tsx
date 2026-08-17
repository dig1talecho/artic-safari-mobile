import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { tromsoToday } from "../lib/dates";
import {
  Card,
  ErrorNote,
  Field,
  GhostButton,
  PrimaryButton,
  Row,
  Screen,
  ScreenHeader,
  Divider,
} from "../components/ui";
import { useTranslation, formatCurrency } from "../i18n";
import { useAuth } from "../lib/useAuth";
import { COLORS, RADIUS, SPACING, TYPE } from "../constants/theme";
import { quoteTransfer, searchAddress, type GeocodeResult } from "../services/pricing";
import { insertBooking } from "../services/bookings";

const WHATSAPP = "https://wa.me/4792997190";

/** Debounced Tromsø-wide address search with a result dropdown. */
function AddressField({
  label,
  value,
  onChange,
  onPickLocation,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPickLocation?: () => void;
}) {
  const { t } = useTranslation();
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const picked = useRef(false);

  useEffect(() => {
    if (picked.current) {
      picked.current = false;
      return;
    }
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await searchAddress(value);
      setResults(found);
      setOpen(found.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <View>
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={t("transfer.searchPlaceholder")}
        onFocus={() => setOpen(results.length > 0)}
      />
      {onPickLocation ? (
        <Pressable onPress={onPickLocation} style={styles.locBtn} hitSlop={6}>
          <Text style={styles.locBtnText}>◎ {t("transfer.useMyLocation")}</Text>
        </Pressable>
      ) : null}

      {open && results.length > 0 ? (
        <View style={styles.dropdown}>
          {results.slice(0, 5).map((r) => (
            <Pressable
              key={r.id}
              onPress={() => {
                picked.current = true;
                onChange(r.name);
                setOpen(false);
              }}
              style={styles.dropdownItem}
            >
              <Text style={styles.dropdownName} numberOfLines={1}>
                {r.name}
              </Text>
              {r.address ? (
                <Text style={styles.dropdownAddr} numberOfLines={1}>
                  {r.address}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function TransferScreen() {
  const { t, language } = useTranslation();
  const { session, profile } = useAuth();

  const [origin, setOrigin] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [quote, setQuote] = useState<{
    price: number;
    distanceKm: number;
    durationMinutes: number;
    originAddress: string;
    destinationAddress: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError(t("transfer.locationDenied"));
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setOrigin(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
    setOriginCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  };

  const calculate = async () => {
    setBusy(true);
    setError("");
    setNotConfigured(false);
    setQuote(null);

    const { quote: q, distance } = await quoteTransfer(origin, destination);

    setBusy(false);
    if (q) {
      setQuote(q);
      return;
    }
    if (distance.status === "not_configured") {
      setNotConfigured(true);
      return;
    }
    if (distance.status === "rate_limited") {
      setError(t("transfer.rateLimited"));
      return;
    }
    setError(distance.status === "error" ? distance.message : t("common.error"));
  };

  const requestRide = async () => {
    if (!quote) return;
    setSubmitting(true);
    setError("");

    const { error: err } = await insertBooking({
      customer_name: profile?.full_name || "Guest User",
      customer_email: profile?.email || session?.user?.email || "pending@articsafaritour.com",
      customer_phone: profile?.phone || null,
      booking_type: "transfer",
      item_title: "Custom Route Transfer",
      booking_date: tromsoToday(),
      total_price: quote.price,
      notes: `Pickup: ${quote.originAddress} → Dropoff: ${quote.destinationAddress} (${quote.distanceKm} km, ~${quote.durationMinutes} min)`,
      status: "pending",
      pickup_address: quote.originAddress,
      pickup_lat: originCoords?.lat ?? null,
      pickup_lng: originCoords?.lng ?? null,
      dropoff_address: quote.destinationAddress,
    });

    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow={t("nav.transfer")}
        title={t("transfer.title")}
        subtitle={t("transfer.subtitle")}
      />

      <View style={styles.body}>
        <Card style={styles.form}>
          <AddressField
            label={t("transfer.pickup")}
            value={origin}
            onChange={setOrigin}
            onPickLocation={useMyLocation}
          />
          <AddressField
            label={t("transfer.dropoff")}
            value={destination}
            onChange={setDestination}
          />

          <PrimaryButton
            label={busy ? t("transfer.calculating") : t("transfer.calculate")}
            onPress={calculate}
            loading={busy}
            disabled={origin.trim().length < 3 || destination.trim().length < 3}
          />
        </Card>

        {notConfigured ? (
          <Card>
            <Text style={styles.warn}>{t("transfer.notConfigured")}</Text>
            <GhostButton
              label="WhatsApp"
              onPress={() => Linking.openURL(WHATSAPP)}
              style={styles.waBtn}
            />
          </Card>
        ) : null}

        {error ? <ErrorNote message={error} /> : null}

        {quote ? (
          <Card glow>
            <Row left={t("transfer.distance")} right={`${quote.distanceKm} km`} />
            <Row left={t("transfer.estimatedTime")} right={`~${quote.durationMinutes} min`} />
            <Divider />
            <Row
              left={t("transfer.estimatedPrice")}
              right={formatCurrency(quote.price, language)}
              strong
            />
            {sent ? (
              <Text style={styles.sent}>✓ {t("booking.requestSent")}</Text>
            ) : (
              <PrimaryButton
                label={t("transfer.requestRide")}
                onPress={requestRide}
                loading={submitting}
                style={styles.requestBtn}
              />
            )}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  form: { gap: SPACING.lg },
  locBtn: { alignSelf: "flex-start", paddingVertical: SPACING.sm },
  locBtnText: { ...TYPE.caption, color: COLORS.accent, fontWeight: "600" },
  dropdown: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  dropdownName: { ...TYPE.small, color: COLORS.text },
  dropdownAddr: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "400", marginTop: 2 },
  warn: { ...TYPE.small, color: COLORS.textSecondary },
  waBtn: { marginTop: SPACING.lg },
  requestBtn: { marginTop: SPACING.lg },
  sent: { ...TYPE.bodyStrong, color: COLORS.success, marginTop: SPACING.lg, textAlign: "center" },
});
