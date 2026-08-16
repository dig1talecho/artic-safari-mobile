import { supabase } from "../lib/supabase";

// Mirror of the web app's services/tours.service.ts (customer-facing reads
// only). Same table, same RLS, same shapes — so a tour published in the
// admin Tour Catalog appears in the mobile app with no extra work.
//
// Deliberately omitted: createTour / updateTour / deleteTour /
// uploadTourImage. Those are admin-only and their RLS would reject a
// customer session anyway.

export interface Tour {
  id: string;
  slug: string;
  status: "active" | "draft";
  eyebrow: string;
  title: string;
  meta_title: string;
  meta_description: string;
  intro: string;
  price: string;
  price_note: string;
  duration: string;
  meeting_point: string;
  highlights: string[];
  features: string[];
  cover_image: string;
  cover_image_alt: string;
  gallery: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function getTours() {
  return supabase
    .from("tours")
    .select("*")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
}

export function getTourBySlug(slug: string) {
  return supabase
    .from("tours")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
}

export function getTourById(id: string) {
  return supabase.from("tours").select("*").eq("id", id).eq("status", "active").maybeSingle();
}

// ---------------- Add-ons (per tour) ----------------

export interface TourAddon {
  id: string;
  tour_id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  created_at: string;
}

export interface CartAddon {
  addon_id: string;
  name: string;
  quantity: number;
  price_at_booking: number;
}

export function listAddonsForTour(tourId: string) {
  return supabase
    .from("tour_addons")
    .select("*")
    .eq("tour_id", tourId)
    .eq("active", true)
    .order("price");
}

export function calculateCartTotal(cart: CartAddon[]): number {
  return cart.reduce((sum, item) => sum + item.price_at_booking * item.quantity, 0);
}

/** "15,000 kr" -> 15000. Tour prices are stored as display strings. */
export function parsePriceNumber(price: string | undefined, fallback = 0): number {
  if (!price) return fallback;
  const n = parseInt(price.replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? fallback : n;
}
