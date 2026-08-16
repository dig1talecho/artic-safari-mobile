import { supabase } from "../lib/supabase";
import type { CartAddon } from "./tours";

// Mirror of the web app's services/bookings.service.ts, plus the loyalty
// field. Validation intentionally duplicated rather than imported: the two
// projects are separate npm workspaces, and the *authoritative* checks live
// in Postgres anyway (bookings_total_price_check, the loyalty trigger, the
// partner trigger). This is a fast client-side guard, not the security
// boundary.

export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "refunded";

export interface Booking {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  booking_type: string;
  item_title: string;
  booking_date: string;
  scheduled_time: string | null;
  total_price: number;
  notes: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus | null;
  assigned_driver: string | null;
  // Written by the loyalty triggers — read-only from the client's point of view.
  points_redeemed: number;
  loyalty_discount: number;
}

export interface BookingInsertPayload {
  id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  booking_type: string;
  item_title: string;
  booking_date: string;
  scheduled_time?: string | null;
  total_price: number;
  notes: string;
  status: string;
  promo_code?: string | null;
  /** A *request* to spend points. The DB trigger clamps it to the real balance. */
  points_requested?: number;
}

const PHONE_RE = /^[+]?[\d\s()-]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(p: BookingInsertPayload): string | null {
  if (!p.customer_name?.trim()) return "Name is required";
  if (!EMAIL_RE.test(p.customer_email.trim())) return "Please enter a valid email address";
  if (p.customer_phone && !PHONE_RE.test(p.customer_phone.trim()))
    return "Please enter a valid phone number";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.booking_date)) return "Invalid date";

  const when = new Date(`${p.booking_date}T00:00:00`);
  const today = new Date(new Date().toDateString());
  const twoYears = new Date(today);
  twoYears.setFullYear(today.getFullYear() + 2);
  if (Number.isNaN(when.getTime()) || when < today || when > twoYears)
    return "Please choose a real date between today and 2 years from now";

  if (!(p.total_price > 0) || p.total_price > 50000) return "Price is out of range";
  return null;
}

export async function insertBooking(payload: BookingInsertPayload) {
  const problem = validate(payload);
  if (problem) return { data: null, error: { message: problem } };
  return supabase.from("bookings").insert([payload]).select();
}

/**
 * The customer's own bookings. RLS matches on the JWT email, so this only
 * ever returns rows belonging to the signed-in guest.
 */
export function listMyBookings(email: string) {
  return supabase
    .from("bookings")
    .select("*")
    .eq("customer_email", email)
    .order("booking_date", { ascending: false });
}

export function getBooking(id: string) {
  return supabase.from("bookings").select("*").eq("id", id).maybeSingle();
}

export async function attachAddonsToBooking(bookingId: string, cart: CartAddon[]) {
  if (cart.length === 0) return { data: [], error: null };
  const rows = cart.map((item) => ({
    booking_id: bookingId,
    addon_id: item.addon_id,
    name: item.name,
    quantity: item.quantity,
    price_at_booking: item.price_at_booking,
  }));
  return supabase.from("booking_addons").insert(rows).select();
}

/**
 * Live status changes for one booking (driver assigned, confirmed,
 * cancelled) pushed over Supabase Realtime — the same primitive the admin
 * console already uses, scoped server-side to this single row.
 */
export function subscribeToBooking(bookingId: string, onChange: (booking: Booking) => void) {
  const channel = supabase
    .channel(`booking-${bookingId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
      (payload) => {
        if (payload.new) onChange(payload.new as Booking);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------- Promo codes ----------------

export interface PromoCodeInfo {
  promo_code: string;
  hotel_name: string;
  customer_discount_percent: number;
}

export async function validatePromoCode(code: string): Promise<PromoCodeInfo | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from("public_promo_codes")
    .select("promo_code, hotel_name, customer_discount_percent")
    .ilike("promo_code", trimmed)
    .maybeSingle();
  if (error || !data) return null;
  return data as PromoCodeInfo;
}
