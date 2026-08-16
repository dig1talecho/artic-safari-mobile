import { supabase } from "../lib/supabase";

// Taximeter pricing for live VIP taxi / transfer requests.
//
// TWO DIFFERENT BACKENDS, worth being explicit about:
//
//   1. pricing_rules          -> Supabase table, read directly (same as web).
//   2. distance lookup        -> a Next.js API ROUTE on the website
//                                (app/api/distance/route.ts), NOT a Supabase
//                                table and NOT a service file. The mobile app
//                                therefore has to call it over HTTPS at the
//                                deployed domain.
//
// Why the route exists at all: it holds a server-side routing-provider key
// and rate-limits by IP. That key must never ship inside the app bundle, so
// the mobile app calls the same route rather than talking to the provider
// directly.
//
// Consequences to keep in mind:
//   * EXPO_PUBLIC_WEB_API_URL must point at the live site (or an ngrok/LAN
//     URL during development) — localhost from a phone will not resolve.
//   * The route rate-limits per IP; every guest on the same hotel Wi-Fi
//     shares that budget.
//   * If it responds 503 the feature is simply not configured yet — show
//     the WhatsApp fallback rather than a hard error, exactly as the web
//     taximeter widget does.

const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL ?? "https://www.articsafaritour.com";

export interface PricingRules {
  id: string;
  base_fee: number;
  price_per_km: number;
  night_rate_multiplier: number;
  min_price: number;
  updated_at: string;
}

export function getPricingRules() {
  return supabase.from("pricing_rules").select("*").limit(1).maybeSingle();
}

/** True for 22:00–06:00 local, or Saturday/Sunday. Identical to the web rule. */
export function isNightOrWeekendRate(date: Date = new Date()): boolean {
  const day = date.getDay();
  const hour = date.getHours();
  return day === 0 || day === 6 || hour >= 22 || hour < 6;
}

/** Total = max(min_price, (base_fee + km * price_per_km) * multiplier) */
export function calculateTransferPrice(
  distanceKm: number,
  rules: Pick<PricingRules, "base_fee" | "price_per_km" | "night_rate_multiplier" | "min_price">,
  applyNightRate: boolean
): number {
  const multiplier = applyNightRate ? rules.night_rate_multiplier : 1;
  const raw = (rules.base_fee + distanceKm * rules.price_per_km) * multiplier;
  return Math.max(rules.min_price, Math.round(raw));
}

export interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
  originAddress: string;
  destinationAddress: string;
}

export type DistanceOutcome =
  | { status: "ok"; result: DistanceResult }
  | { status: "not_configured" }
  | { status: "rate_limited" }
  | { status: "error"; message: string };

export async function fetchDistance(
  origin: string,
  destination: string
): Promise<DistanceOutcome> {
  try {
    const res = await fetch(`${WEB_API_URL}/api/distance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination }),
    });

    if (res.status === 503) return { status: "not_configured" };
    if (res.status === 429) return { status: "rate_limited" };

    const data = await res.json();
    if (!res.ok) {
      return { status: "error", message: data?.message ?? "Could not calculate this route." };
    }
    return { status: "ok", result: data as DistanceResult };
  } catch {
    return { status: "error", message: "Distance service is unreachable right now." };
  }
}

/** One call: distance -> live pricing rules -> price. */
export async function quoteTransfer(origin: string, destination: string) {
  const distance = await fetchDistance(origin, destination);
  if (distance.status !== "ok") return { quote: null, distance };

  const { data: rules, error } = await getPricingRules();
  if (error || !rules) {
    return { quote: null, distance: { status: "error", message: "Pricing is not configured yet." } as DistanceOutcome };
  }

  const price = calculateTransferPrice(
    distance.result.distanceKm,
    rules as PricingRules,
    isNightOrWeekendRate()
  );

  return { quote: { price, ...distance.result }, distance };
}

// ---------------- Tromsø-wide address search ----------------

export interface GeocodeResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  type: string;
}

/**
 * Same keyless Photon-backed search the website's pickup/drop-off fields
 * use, proxied through the site's /api/geocode/search route so the mobile
 * app inherits the same Tromsø bounding box and rate limiting.
 */
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(`${WEB_API_URL}/api/geocode/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []) as GeocodeResult[];
  } catch {
    return [];
  }
}
