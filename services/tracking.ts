import { supabase } from "../lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Mirror of the web app's services/tracking.ts, read-side only.
//
// The customer app SUBSCRIBES to the driver's position; it never pushes
// one. pushDriverLocation() is deliberately absent here — that belongs to
// the driver app, and driver_locations RLS should reject a customer
// session attempting to write anyway.

export interface DriverLocation {
  id: string;
  booking_id: string;
  driver_name: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
}

export function getDriverLocation(bookingId: string) {
  return supabase.from("driver_locations").select("*").eq("booking_id", bookingId).maybeSingle();
}

/**
 * Watch the assigned driver approach in real time. Filtered server-side to
 * this one booking, so the app is not streamed other customers' drivers.
 * Returns an unsubscribe function — call it on screen unmount.
 */
export function subscribeToDriverLocation(
  bookingId: string,
  onUpdate: (location: DriverLocation) => void
) {
  const channel = supabase
    .channel(`driver-location-${bookingId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "driver_locations",
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload: RealtimePostgresChangesPayload<DriverLocation>) => {
        if (payload.new && "id" in payload.new) onUpdate(payload.new as DriverLocation);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Great-circle distance in metres — identical to the web implementation. */
export function haversineDistanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough ETA from current distance and speed. Null when the driver is stationary. */
export function estimateEtaMinutes(location: DriverLocation, destLat: number, destLng: number) {
  const metres = haversineDistanceMeters(location.lat, location.lng, destLat, destLng);
  const speedMs = location.speed ?? 0;
  if (speedMs <= 0.5) return null;
  return Math.max(1, Math.round(metres / speedMs / 60));
}
