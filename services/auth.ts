import { supabase } from "../lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export type OAuthProvider = "google" | "apple";

// ---------------------------------------------------------------------------
// Email / password — identical surface to the web app's services/auth.service.ts
// so the same Supabase Auth users work across web and mobile.
// ---------------------------------------------------------------------------

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpCustomer(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

// ---------------------------------------------------------------------------
// Native OAuth (Google / Apple)
//
// This uses ID-TOKEN sign-in, not the browser redirect flow the web app
// uses. The native SDK returns a signed identity token, we hand it to
// Supabase, and Supabase verifies it against the provider's public keys.
// No web view, no deep-link round trip, and it satisfies Apple's rule that
// an app offering third-party sign-in must also offer native Sign in with
// Apple.
//
// IMPORTANT — these native modules do NOT work in Expo Go. They require a
// development build:
//     npx expo install @react-native-google-signin/google-signin expo-apple-authentication
//     npx expo prebuild
//     npx expo run:ios      (or run:android / EAS build)
//
// The modules are loaded lazily below so that, until they are installed,
// the rest of the app still runs and only these two functions report a
// clear "not configured" error instead of crashing on import.
// ---------------------------------------------------------------------------

type OAuthResult = Awaited<ReturnType<typeof supabase.auth.signInWithIdToken>>;

function notConfigured(message: string): OAuthResult {
  return {
    data: { user: null, session: null },
    error: { message, name: "AuthNotConfiguredError", status: 400 },
  } as unknown as OAuthResult;
}

/**
 * Call once at app start (before any Google sign-in attempt).
 * webClientId must be the **Web** OAuth client ID from Google Cloud — the
 * same one pasted into Supabase Dashboard -> Authentication -> Providers ->
 * Google. Supabase validates the token's audience against it, so an
 * iOS/Android client ID here will fail verification.
 */
export function configureGoogleSignIn(options: {
  webClientId: string;
  iosClientId?: string;
}) {
  try {
    const {
      GoogleSignin,
    } = require("@react-native-google-signin/google-signin");
    GoogleSignin.configure({
      webClientId: options.webClientId,
      iosClientId: options.iosClientId,
      scopes: ["profile", "email"],
    });
    return { configured: true as const };
  } catch {
    return { configured: false as const };
  }
}

export async function signInWithGoogle(): Promise<OAuthResult> {
  let GoogleSignin: any;
  try {
    ({ GoogleSignin } = require("@react-native-google-signin/google-signin"));
  } catch {
    return notConfigured(
      "Google Sign-In is not installed. Run: npx expo install @react-native-google-signin/google-signin, then rebuild the app (it does not work in Expo Go)."
    );
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    // v13+ returns { type, data }; older versions return the user directly.
    const idToken = response?.data?.idToken ?? response?.idToken;
    if (!idToken) {
      return notConfigured("Google did not return an ID token. Check that webClientId matches the Web client ID configured in Supabase.");
    }

    return supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
  } catch (err) {
    return notConfigured(
      err instanceof Error ? err.message : "Google sign-in was cancelled or failed."
    );
  }
}

/**
 * iOS only. Android has no Sign in with Apple SDK — hide the button there
 * (see isAppleSignInAvailable) rather than showing one that cannot work.
 * Requires a paid Apple Developer account plus a Services ID + signing key
 * registered in Supabase Dashboard -> Authentication -> Providers -> Apple.
 */
export async function signInWithApple(): Promise<OAuthResult> {
  let AppleAuthentication: any;
  try {
    AppleAuthentication = require("expo-apple-authentication");
  } catch {
    return notConfigured(
      "Apple Sign-In is not installed. Run: npx expo install expo-apple-authentication, then rebuild the app (it does not work in Expo Go)."
    );
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return notConfigured("Apple did not return an identity token.");
    }

    return supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
  } catch (err: any) {
    if (err?.code === "ERR_REQUEST_CANCELED") {
      return notConfigured("Sign-in cancelled.");
    }
    return notConfigured(err instanceof Error ? err.message : "Apple sign-in failed.");
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    const AppleAuthentication = require("expo-apple-authentication");
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Customer profile
//
// NOTE: the table is `customer_profiles`, NOT `profiles`. It is keyed by
// auth.users.id and holds { full_name, phone, email }. OAuth sign-ups do
// not create it automatically — the provider gives us a session but no row,
// so call ensureCustomerProfile() right after a successful OAuth sign-in.
// ---------------------------------------------------------------------------

export interface CustomerProfile {
  full_name: string;
  phone: string;
  email: string;
}

export function getCustomerProfile(userId: string) {
  return supabase
    .from("customer_profiles")
    .select("full_name, phone, email")
    .eq("id", userId)
    .maybeSingle();
}

/**
 * Creates the customer_profiles row if this account doesn't have one yet.
 * Safe to call on every sign-in.
 *
 * Apple only returns the user's name on the FIRST authorization ever, and
 * may return a private relay email — so we fall back to whatever the
 * session carries and let the guest correct it later in the booking form.
 */
export async function ensureCustomerProfile(session: Session, fallbackName?: string) {
  const userId = session.user.id;
  const { data: existing } = await getCustomerProfile(userId);
  if (existing) return { data: existing, error: null };

  const meta = session.user.user_metadata ?? {};
  const full_name =
    fallbackName ||
    meta.full_name ||
    meta.name ||
    session.user.email?.split("@")[0] ||
    "Guest";

  return supabase
    .from("customer_profiles")
    .insert([
      {
        id: userId,
        full_name,
        // phone is NOT NULL in the schema; the booking form collects the
        // real one. Empty string keeps the insert valid without inventing
        // a fake number.
        phone: meta.phone ?? "",
        email: session.user.email ?? "",
      },
    ])
    .select("full_name, phone, email")
    .single();
}

/**
 * Sends Supabase's password-reset email.
 *
 * The link lands on the WEBSITE, not back in the app: a deep link into a
 * React Native build needs a custom URL scheme registered in a development
 * build, which this project doesn't have yet. Pointing at the site means the
 * flow works today on every device, and the customer signs in to the app
 * afterwards with the new password.
 */
export function requestPasswordReset(email: string) {
  const site = process.env.EXPO_PUBLIC_WEB_API_URL ?? "https://www.articsafaritour.com";
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${site}/dashboard`,
  });
}
