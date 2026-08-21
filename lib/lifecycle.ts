import type { BookingStatus } from "../services/bookings";

/**
 * What a driver can do to a job from the phone.
 *
 * Mirrors lib/booking-lifecycle.ts in the web project, narrowed to the
 * moves a driver is allowed to make. Postgres decides legality either way
 * — `trg_enforce_booking_status_transition` rejects anything else — so
 * this only stops the app offering a button that would come back as an
 * error toast.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS
 * Until now the app could claim a job and nothing else. But the accounting
 * report counts revenue from `completed` bookings, so a trip that actually
 * happened produced no income on paper unless an admin remembered to open
 * the panel and mark it. The person who knows the trip finished is the
 * driver, standing there. This closes that gap.
 */

export interface DriverAction {
  to: BookingStatus;
  /** i18n key for the button. */
  labelKey: string;
  /** Ask before doing it. Reserved for moves a driver cannot undo. */
  confirm?: boolean;
  tone: "primary" | "neutral" | "danger";
}

/**
 * Ordered by how often it is the right answer, because the first button is
 * the one a cold thumb hits.
 */
const DRIVER_ACTIONS: Partial<Record<BookingStatus, DriverAction[]>> = {
  assigned: [
    { to: "in_progress", labelKey: "requests.startTrip", tone: "primary" },
    // Back out of a job taken by mistake. Allowed by the state machine
    // (assigned -> confirmed) and it releases the row to the queue again.
    { to: "confirmed", labelKey: "requests.releaseJob", tone: "neutral" },
  ],
  in_progress: [
    {
      to: "completed",
      labelKey: "requests.completeTrip",
      // Only an admin can undo a completed booking, so a mistap here costs
      // somebody a phone call.
      confirm: true,
      tone: "primary",
    },
  ],
  confirmed: [{ to: "in_progress", labelKey: "requests.startTrip", tone: "primary" }],
};

/** No-show is offered separately: it is a judgement, not a step forward. */
export const NO_SHOW_FROM: BookingStatus[] = ["assigned", "in_progress", "confirmed"];

export function driverActionsFor(status: BookingStatus): DriverAction[] {
  return DRIVER_ACTIONS[status] ?? [];
}
