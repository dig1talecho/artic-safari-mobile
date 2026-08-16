import { supabase } from "../lib/supabase";

// Requires supabase-loyalty-points-setup.sql (web repo root).
// Every read degrades to null/[] if that migration hasn't run yet, so the
// booking flow keeps working without loyalty rather than erroring.
//
// SECURITY MODEL — worth understanding before building UI on this:
// the client can only *request* a redemption. apply_loyalty_redemption()
// (a BEFORE INSERT trigger) re-reads the guest's real balance, clamps the
// request, recomputes the discount and rewrites total_price. So the
// numbers below are a PREVIEW; the truth comes back on the inserted
// booking row as points_redeemed / loyalty_discount.

export interface LoyaltyRules {
  id: string;
  points_per_100_kr: number;
  kr_per_point: number;
  min_redeem_points: number;
  max_redeem_percent: number;
  updated_at: string;
}

export interface LoyaltyBalance {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  last_activity_at: string | null;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  booking_id: string | null;
  points: number;
  kind: "earned" | "redeemed" | "adjustment" | "expired";
  reason: string | null;
  created_at: string;
}

export function getLoyaltyRules() {
  return supabase.from("loyalty_rules").select("*").limit(1).maybeSingle();
}

export function getMyBalance(userId: string) {
  return supabase.from("loyalty_balances").select("*").eq("user_id", userId).maybeSingle();
}

export function listMyTransactions(userId: string, limit = 50) {
  return supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

/** Mirrors the trigger's math so the previewed discount matches what the server grants. */
export function previewRedemption(
  pointsRequested: number,
  balance: number,
  subtotal: number,
  rules: Pick<LoyaltyRules, "kr_per_point" | "min_redeem_points" | "max_redeem_percent">
): { points: number; discount: number; reason?: string } {
  if (pointsRequested <= 0) return { points: 0, discount: 0 };
  if (balance < rules.min_redeem_points) {
    return { points: 0, discount: 0, reason: `Minimum ${rules.min_redeem_points} points to redeem` };
  }
  if (rules.kr_per_point <= 0) return { points: 0, discount: 0 };

  const wanted = Math.min(pointsRequested, balance);
  const maxDiscount = Math.round((subtotal * rules.max_redeem_percent) / 100);
  const points = Math.min(wanted, Math.floor(maxDiscount / rules.kr_per_point));

  if (points <= 0) return { points: 0, discount: 0 };
  return { points, discount: Math.round(points * rules.kr_per_point) };
}

/** "You'll earn ~N points" — shown before confirming a booking. */
export function estimatePointsEarned(
  totalPrice: number,
  rules: Pick<LoyaltyRules, "points_per_100_kr">
): number {
  return Math.floor((totalPrice / 100) * rules.points_per_100_kr);
}

/** How many points the guest could spend right now on this subtotal. */
export function maxRedeemableFor(
  balance: number,
  subtotal: number,
  rules: Pick<LoyaltyRules, "kr_per_point" | "min_redeem_points" | "max_redeem_percent">
): number {
  if (balance < rules.min_redeem_points || rules.kr_per_point <= 0) return 0;
  const maxDiscount = Math.round((subtotal * rules.max_redeem_percent) / 100);
  return Math.max(0, Math.min(balance, Math.floor(maxDiscount / rules.kr_per_point)));
}
