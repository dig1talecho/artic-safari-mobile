import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Haptics from "expo-haptics";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";
import type { Booking } from "../services/bookings";

// Real-time in-app notifications.
//
// SCOPE, stated plainly: this fires while the app is OPEN. It is Supabase
// Realtime (a websocket), not a push notification — so it cannot wake a
// backgrounded or closed app. Delivering that needs expo-notifications plus
// a development build; remote push does not work in Expo Go on SDK 53+.
//
// For a driver actively working a shift the app is in the foreground, which
// is why this is the piece worth having first.
//
// One subscription lives here at the app root rather than one per screen, so
// the badge keeps counting while the driver is on another tab.

export interface AppNotification {
  id: string;
  bookingId: string;
  title: string;
  body: string;
  createdAt: string;
  isTaxi: boolean;
}

/** Same list RequestsScreen uses to decide what counts as taxi work. */
const TAXI_TYPES = ["transfer", "taxi"];

interface NotificationsValue {
  /** New arrivals the user hasn't looked at yet — drives the tab badge. */
  unseenCount: number;
  notifications: AppNotification[];
  /** Most recent arrival, for the slide-in banner. Cleared by dismissBanner. */
  banner: AppNotification | null;
  dismissBanner: () => void;
  /** Call when the requests list is opened. */
  markAllSeen: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { role, staff } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [banner, setBanner] = useState<AppNotification | null>(null);

  // Guards against Realtime re-delivering the same row (reconnects can
  // replay), which would otherwise inflate the badge.
  const seenIds = useRef<Set<string>>(new Set());

  const isStaff = role === "admin" || role === "driver";

  useEffect(() => {
    if (!isStaff) return;

    const channel = supabase
      .channel("staff-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const booking = payload.new as Booking;
          if (!booking?.id || seenIds.current.has(booking.id)) return;

          const isTaxi = TAXI_TYPES.includes((booking.booking_type || "").toLowerCase());

          // Drivers only work taxi jobs, so a tour booking must not light up
          // their badge — otherwise they'd get a "+1" for something the
          // Requests screen won't even show them. Admins see everything.
          if (role === "driver" && !isTaxi) return;

          seenIds.current.add(booking.id);

          const note: AppNotification = {
            id: `${booking.id}-${Date.now()}`,
            bookingId: booking.id,
            title: booking.item_title || "New request",
            body: [booking.customer_name, booking.pickup_address].filter(Boolean).join(" · "),
            createdAt: new Date().toISOString(),
            isTaxi,
          };

          setNotifications((prev) => [note, ...prev].slice(0, 30));
          setUnseenCount((n) => n + 1);
          setBanner(note);
          // A dispatch alert the driver can feel without looking.
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, role, staff?.display_name]);

  // Reset everything on sign-out / role change so a driver never sees the
  // previous account's queue.
  useEffect(() => {
    if (!isStaff) {
      setNotifications([]);
      setUnseenCount(0);
      setBanner(null);
      seenIds.current.clear();
    }
  }, [isStaff]);

  const dismissBanner = useCallback(() => setBanner(null), []);
  const markAllSeen = useCallback(() => setUnseenCount(0), []);

  const value = useMemo(
    () => ({ unseenCount, notifications, banner, dismissBanner, markAllSeen }),
    [unseenCount, notifications, banner, dismissBanner, markAllSeen]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}
