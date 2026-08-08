export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  customer_name: string;
  item_title: string;
  booking_date: string;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
}
