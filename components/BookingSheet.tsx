import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Card,
  Divider,
  ErrorNote,
  Field,
  GhostButton,
  Pill,
  PrimaryButton,
  Row,
  Stepper,
} from "./ui";
import { useTranslation, formatCurrency } from "../i18n";
import { useAuth } from "../lib/useAuth";
import { COLORS, RADIUS, SPACING, TYPE } from "../constants/theme";
import {
  listAddonsForTour,
  parsePriceNumber,
  calculateCartTotal,
  type Tour,
  type TourAddon,
  type CartAddon,
} from "../services/tours";
import {
  insertBooking,
  attachAddonsToBooking,
  validatePromoCode,
  type PromoCodeInfo,
} from "../services/bookings";
import {
  getLoyaltyRules,
  getMyBalance,
  maxRedeemableFor,
  previewRedemption,
  estimatePointsEarned,
  type LoyaltyRules,
} from "../services/loyalty";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function BookingSheet({
  tour,
  visible,
  onClose,
}: {
  tour: Tour;
  visible: boolean;
  onClose: () => void;
}) {
  const { t, language } = useTranslation();
  const { session, profile } = useAuth();

  const [step, setStep] = useState(1);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [addons, setAddons] = useState<TourAddon[]>([]);
  const [cart, setCart] = useState<CartAddon[]>([]);

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoCodeInfo | null>(null);
  const [promoError, setPromoError] = useState("");

  const [rules, setRules] = useState<LoyaltyRules | null>(null);
  const [balance, setBalance] = useState(0);
  const [pointsInput, setPointsInput] = useState("");

  const basePrice = parsePriceNumber(tour.price);
  const cartTotal = calculateCartTotal(cart);
  const subtotal = basePrice + cartTotal;
  const promoDiscount = promo
    ? Math.round((subtotal * promo.customer_discount_percent) / 100)
    : 0;
  const afterPromo = Math.max(subtotal - promoDiscount, 1);

  const pointsRequested = Math.max(0, parseInt(pointsInput || "0", 10) || 0);
  const redemption = useMemo(
    () =>
      rules
        ? previewRedemption(pointsRequested, balance, afterPromo, rules)
        : { points: 0, discount: 0 },
    [rules, pointsRequested, balance, afterPromo]
  );
  const finalTotal = Math.max(afterPromo - redemption.discount, 1);

  // Prefill from the signed-in profile; guests fill it in themselves.
  useEffect(() => {
    if (!visible) return;
    setFullName(profile?.full_name ?? "");
    setEmail(profile?.email ?? session?.user?.email ?? "");
    setPhone(profile?.phone ?? "");
  }, [visible, profile, session]);

  useEffect(() => {
    if (!visible) return;
    listAddonsForTour(tour.id).then(({ data, error: err }) => {
      setAddons(err ? [] : ((data as TourAddon[]) ?? []));
    });
  }, [visible, tour.id]);

  useEffect(() => {
    if (!visible || !session?.user?.id) return;
    getLoyaltyRules().then(({ data }) => setRules((data as LoyaltyRules) ?? null));
    getMyBalance(session.user.id).then(({ data }) => setBalance((data as any)?.balance ?? 0));
  }, [visible, session]);

  const setQty = (addon: TourAddon, qty: number) => {
    Haptics.selectionAsync().catch(() => {});
    setCart((prev) => {
      const next = prev.filter((c) => c.addon_id !== addon.id);
      if (qty > 0) {
        next.push({
          addon_id: addon.id,
          name: addon.name,
          quantity: qty,
          price_at_booking: addon.price,
        });
      }
      return next;
    });
  };

  const qtyOf = (id: string) => cart.find((c) => c.addon_id === id)?.quantity ?? 0;

  const applyPromo = async () => {
    setPromoError("");
    const info = await validatePromoCode(promoInput);
    if (!info) {
      setPromo(null);
      setPromoError(t("booking.promoInvalid"));
      return;
    }
    setPromo(info);
  };

  const submit = async () => {
    setBusy(true);
    setError("");

    const bookingId = globalThis.crypto?.randomUUID?.();

    const { data, error: err } = await insertBooking({
      ...(bookingId ? { id: bookingId } : {}),
      customer_name: fullName.trim(),
      customer_email: email.trim(),
      customer_phone: phone.trim() || null,
      booking_type: tour.title.toLowerCase().includes("transfer") ? "transfer" : "tour",
      item_title: tour.title,
      booking_date: date,
      scheduled_time: time || null,
      // Sent as the pre-loyalty figure. apply_loyalty_redemption() subtracts
      // the points discount server-side from the real balance, so the row
      // that lands is authoritative even if this client is out of date.
      total_price: afterPromo,
      notes: time ? `Preferred time: ${time}` : "Booked from mobile app",
      status: "pending",
      promo_code: promo?.promo_code ?? null,
      points_requested: redemption.points > 0 ? redemption.points : undefined,
    });

    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }

    const created = Array.isArray(data) ? data[0] : null;
    const newId = created?.id ?? bookingId;
    if (newId && cart.length > 0) await attachAddonsToBooking(newId, cart);

    setBusy(false);
    setDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const reset = () => {
    setStep(1);
    setDone(false);
    setError("");
    setCart([]);
    setPromo(null);
    setPromoInput("");
    setPointsInput("");
    onClose();
  };

  const steps = [
    t("booking.stepDateTime"),
    t("booking.stepExtras"),
    t("booking.stepDetails"),
    t("booking.stepConfirm"),
  ];

  const detailsValid =
    fullName.trim().length > 0 && email.trim().includes("@") && phone.trim().length >= 7;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={reset}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.headRow}>
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>{t("booking.title")}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {tour.title}
                </Text>
              </View>
              <Pressable onPress={reset} hitSlop={12} accessibilityLabel={t("common.close")}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            {done ? (
              <View style={styles.doneBox}>
                <Text style={styles.doneIcon}>✓</Text>
                <Text style={styles.doneTitle}>{t("booking.requestSent")}</Text>
                <Text style={styles.doneBody}>{t("booking.requestSentBody")}</Text>
                <PrimaryButton label={t("common.close")} onPress={reset} style={styles.doneBtn} />
              </View>
            ) : (
              <>
                <Stepper steps={steps} current={step} />

                <ScrollView
                  style={styles.scroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {step === 1 && (
                    <View style={styles.section}>
                      <Field
                        label={t("booking.date")}
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        hint="YYYY-MM-DD"
                      />
                      <Field
                        label={t("booking.preferredTime")}
                        value={time}
                        onChangeText={setTime}
                        placeholder="19:00"
                        hint="HH:MM"
                      />
                    </View>
                  )}

                  {step === 2 && (
                    <View style={styles.section}>
                      {addons.length === 0 ? (
                        <Text style={styles.muted}>{t("booking.noExtras")}</Text>
                      ) : (
                        addons.map((addon) => {
                          const qty = qtyOf(addon.id);
                          return (
                            <View key={addon.id} style={styles.addonRow}>
                              <View style={styles.flex}>
                                <Text style={styles.addonName}>{addon.name}</Text>
                                {addon.description ? (
                                  <Text style={styles.addonDesc} numberOfLines={1}>
                                    {addon.description}
                                  </Text>
                                ) : null}
                                <Text style={styles.addonPrice}>
                                  {formatCurrency(addon.price, language)}
                                </Text>
                              </View>
                              <View style={styles.qty}>
                                <Pressable
                                  onPress={() => setQty(addon, Math.max(0, qty - 1))}
                                  style={styles.qtyBtn}
                                  hitSlop={6}
                                >
                                  <Text style={styles.qtyBtnText}>−</Text>
                                </Pressable>
                                <Text style={styles.qtyValue}>{qty}</Text>
                                <Pressable
                                  onPress={() => setQty(addon, qty + 1)}
                                  style={styles.qtyBtn}
                                  hitSlop={6}
                                >
                                  <Text style={styles.qtyBtnText}>+</Text>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })
                      )}
                      {cart.length > 0 && (
                        <View style={styles.extrasTotal}>
                          <Text style={styles.extrasTotalText}>{t("booking.extrasTotal")}</Text>
                          <Text style={styles.extrasTotalValue}>
                            {formatCurrency(cartTotal, language)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {step === 3 && (
                    <View style={styles.section}>
                      <Field
                        label={t("auth.fullName")}
                        value={fullName}
                        onChangeText={setFullName}
                        autoComplete="name"
                      />
                      <Field
                        label={t("auth.email")}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                      <Field
                        label={t("auth.phone")}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                      />
                    </View>
                  )}

                  {step === 4 && (
                    <View style={styles.section}>
                      <Card>
                        <Row left={t("booking.package")} right={tour.title} />
                        <Row left={t("booking.date")} right={time ? `${date} · ${time}` : date} />
                        <Row left={t("booking.contact")} right={`${fullName}\n${email}`} />
                        {cart.map((c) => (
                          <Row
                            key={c.addon_id}
                            left={`${c.name} × ${c.quantity}`}
                            right={formatCurrency(c.price_at_booking * c.quantity, language)}
                          />
                        ))}
                        {promo ? (
                          <Row
                            left={`${promo.customer_discount_percent}% · ${promo.hotel_name}`}
                            right={`−${formatCurrency(promoDiscount, language)}`}
                          />
                        ) : null}
                        {redemption.points > 0 ? (
                          <Row
                            left={t("rewards.redeemedOn")}
                            right={`−${formatCurrency(redemption.discount, language)}`}
                          />
                        ) : null}
                        <Divider />
                        <Row
                          left={t("booking.total")}
                          right={formatCurrency(finalTotal, language)}
                          strong
                        />
                        {rules ? (
                          <Text style={styles.earnNote}>
                            {t("rewards.youWillEarn", {
                              count: estimatePointsEarned(finalTotal, rules),
                            })}
                          </Text>
                        ) : null}
                      </Card>

                      {/* Promo code */}
                      {promo ? (
                        <View style={styles.appliedRow}>
                          <Pill
                            label={`${promo.promo_code} · ${promo.customer_discount_percent}% ${t(
                              "booking.promoApplied"
                            )}`}
                          />
                          <Pressable onPress={() => setPromo(null)}>
                            <Text style={styles.removeText}>{t("booking.remove")}</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.inlineRow}>
                          <View style={styles.flex}>
                            <Field
                              label={t("booking.promoPrompt")}
                              value={promoInput}
                              onChangeText={(v) => setPromoInput(v.toUpperCase())}
                              placeholder={t("booking.promoPlaceholder")}
                              autoCapitalize="characters"
                              error={promoError || undefined}
                            />
                          </View>
                          <GhostButton
                            label={t("booking.apply")}
                            onPress={applyPromo}
                            style={styles.inlineBtn}
                          />
                        </View>
                      )}

                      {/* Loyalty points */}
                      {session && rules && balance > 0 ? (
                        <Card>
                          <Text style={styles.sectionTitle}>{t("rewards.redeemTitle")}</Text>
                          <Text style={styles.muted}>
                            {t("rewards.balance")}: {balance} {t("rewards.points")}
                          </Text>
                          {(() => {
                            const max = maxRedeemableFor(balance, afterPromo, rules);
                            if (max <= 0) {
                              return (
                                <Text style={styles.mutedSmall}>
                                  {t("rewards.redeemMin", { count: rules.min_redeem_points })}
                                </Text>
                              );
                            }
                            return (
                              <>
                                <Field
                                  label={t("rewards.redeemPlaceholder")}
                                  value={pointsInput}
                                  onChangeText={setPointsInput}
                                  keyboardType="number-pad"
                                  placeholder="0"
                                  hint={t("rewards.redeemMax", { count: max })}
                                />
                                {redemption.points > 0 ? (
                                  <Text style={styles.redeemNote}>
                                    {t("rewards.redeemApplied", {
                                      points: redemption.points,
                                      discount: redemption.discount,
                                    })}
                                  </Text>
                                ) : null}
                              </>
                            );
                          })()}
                        </Card>
                      ) : null}

                      {error ? <ErrorNote message={error} /> : null}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.footer}>
                  {step > 1 ? (
                    <GhostButton
                      label={t("common.back")}
                      onPress={() => setStep(step - 1)}
                      style={styles.backBtn}
                    />
                  ) : null}
                  {step < 4 ? (
                    <PrimaryButton
                      label={step === 2 && cart.length === 0 ? t("booking.skip") : t("common.continue")}
                      onPress={() => setStep(step + 1)}
                      disabled={(step === 1 && !date) || (step === 3 && !detailsValid)}
                      style={styles.flex}
                    />
                  ) : (
                    <PrimaryButton
                      label={t("booking.confirm")}
                      onPress={submit}
                      loading={busy}
                      style={styles.flex}
                    />
                  )}
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheetWrap: { maxHeight: "94%" },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    maxHeight: "100%",
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginTop: SPACING.md,
  },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md, marginTop: SPACING.lg },
  eyebrow: { ...TYPE.caption, color: COLORS.accent, letterSpacing: 1.4 },
  title: { ...TYPE.h2, color: COLORS.text, marginTop: 4 },
  close: { fontSize: 20, color: COLORS.textMuted },
  scroll: { flexGrow: 0 },
  section: { gap: SPACING.lg, paddingBottom: SPACING.lg },
  sectionTitle: { ...TYPE.h3, color: COLORS.text, marginBottom: SPACING.sm },
  muted: { ...TYPE.small, color: COLORS.textSecondary },
  mutedSmall: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "400", marginTop: SPACING.sm },

  addonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  addonName: { ...TYPE.bodyStrong, color: COLORS.text },
  addonDesc: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "400", marginTop: 2 },
  addonPrice: { ...TYPE.caption, color: COLORS.accent, marginTop: 4 },
  qty: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: COLORS.text, fontSize: 17, fontWeight: "600" },
  qtyValue: { ...TYPE.bodyStrong, color: COLORS.text, minWidth: 16, textAlign: "center" },

  extrasTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  extrasTotalText: { ...TYPE.small, color: COLORS.accent },
  extrasTotalValue: { ...TYPE.bodyStrong, color: COLORS.accent },

  inlineRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.md },
  inlineBtn: { paddingHorizontal: SPACING.lg, minHeight: 50 },
  appliedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  removeText: { ...TYPE.small, color: COLORS.textMuted, textDecorationLine: "underline" },

  earnNote: { ...TYPE.caption, color: COLORS.gold, fontWeight: "600", marginTop: SPACING.md },
  redeemNote: { ...TYPE.caption, color: COLORS.accent, fontWeight: "600", marginTop: SPACING.sm },

  footer: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  backBtn: { paddingHorizontal: SPACING.xl },

  doneBox: { alignItems: "center", paddingVertical: SPACING.xxxl, gap: SPACING.md },
  doneIcon: {
    fontSize: 26,
    color: COLORS.onAccent,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    textAlign: "center",
    lineHeight: 56,
    overflow: "hidden",
  },
  doneTitle: { ...TYPE.h2, color: COLORS.text, textAlign: "center" },
  doneBody: { ...TYPE.small, color: COLORS.textSecondary, textAlign: "center", maxWidth: 280 },
  doneBtn: { alignSelf: "stretch", marginTop: SPACING.lg },
});
