import { supabase } from "../lib/supabase";

// Staff identity. Mirrors the web app's services/staff.service.ts.
//
// A signed-in account is staff if it has a row in `staff_profiles`, and a
// customer if it has one in `customer_profiles`. They are separate tables
// keyed by the same auth.users.id, so the app must check staff FIRST —
// otherwise a staff member gets treated as a customer, which is exactly the
// bug that made an admin login look like an ordinary user account.

export type StaffRole = "admin" | "driver";

export interface StaffProfile {
  id: string;
  role: StaffRole;
  display_name: string;
}

export function getStaffProfile(userId: string) {
  return supabase
    .from("staff_profiles")
    .select("id, role, display_name")
    .eq("id", userId)
    .maybeSingle();
}

/** Roster of drivers — admin-only in practice, RLS returns [] for others. */
export function listDrivers() {
  return supabase
    .from("staff_profiles")
    .select("id, role, display_name")
    .eq("role", "driver")
    .order("display_name");
}
