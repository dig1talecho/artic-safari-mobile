import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getSession,
  onAuthStateChange,
  getCustomerProfile,
  ensureCustomerProfile,
  signOut as doSignOut,
  type CustomerProfile,
} from "../services/auth";
import { getStaffProfile, type StaffProfile, type StaffRole } from "../services/staff";

export type AppRole = "customer" | StaffRole;

interface AuthValue {
  session: Session | null;
  /** 'customer' | 'driver' | 'admin' — decides which navigation tree renders. */
  role: AppRole | null;
  profile: CustomerProfile | null;
  staff: StaffProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveIdentity = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user?.id) {
      setRole(null);
      setProfile(null);
      setStaff(null);
      return;
    }

    // STAFF FIRST. A staff account must never be auto-enrolled as a
    // customer: ensureCustomerProfile() below writes a row, so calling it
    // unconditionally would insert every admin and driver into
    // customer_profiles and then show them the customer UI.
    const { data: staffRow } = await getStaffProfile(activeSession.user.id);
    if (staffRow) {
      setStaff(staffRow as StaffProfile);
      setRole((staffRow as StaffProfile).role);
      setProfile(null);
      return;
    }

    setStaff(null);
    setRole("customer");

    // OAuth sign-ups arrive with no customer_profiles row — create it on
    // first sight so the booking form has something to pre-fill.
    const { data: created } = await ensureCustomerProfile(activeSession);
    if (created) {
      setProfile(created as CustomerProfile);
      return;
    }
    const { data: existing } = await getCustomerProfile(activeSession.user.id);
    setProfile((existing as CustomerProfile) ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await resolveIdentity(data.session);
      if (active) setLoading(false);
    });

    const { data: listener } = onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      await resolveIdentity(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [resolveIdentity]);

  const refreshProfile = useCallback(async () => {
    await resolveIdentity(session);
  }, [resolveIdentity, session]);

  const signOut = useCallback(async () => {
    await doSignOut();
    setProfile(null);
    setStaff(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({ session, role, profile, staff, loading, refreshProfile, signOut }),
    [session, role, profile, staff, loading, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
