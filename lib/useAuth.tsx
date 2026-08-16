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

interface AuthValue {
  session: Session | null;
  profile: CustomerProfile | null;
  loading: boolean;
  /** Re-reads the profile — call after editing contact details. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user?.id) {
      setProfile(null);
      return;
    }
    // OAuth sign-ups arrive with no customer_profiles row — create it on
    // first sight rather than leaving the guest authenticated but profile-less.
    const { data } = await ensureCustomerProfile(activeSession);
    if (data) {
      setProfile(data as CustomerProfile);
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
      await loadProfile(data.session);
      if (active) setLoading(false);
    });

    const { data: listener } = onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      await loadProfile(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session);
  }, [loadProfile, session]);

  const signOut = useCallback(async () => {
    await doSignOut();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, refreshProfile, signOut }),
    [session, profile, loading, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
