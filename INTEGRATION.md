# Artic Safari — Mobile Integration Report

How the Expo app consumes the existing Supabase backend, what was added,
and what still needs your action. Nothing in the web project's runtime
behaviour was changed by this work.

---

## 1. Findings you should know before building on this

Five things differ from the brief. None are blockers, but building on the
assumed version would have produced broken code.

### 1.1 The table is `customer_profiles`, not `profiles`

There is no `profiles` table. Customer identity lives in
`customer_profiles` — keyed by `auth.users.id`, holding
`{ full_name, phone, email }`, created by
`supabase-customer-profiles-setup.sql`. All mobile code uses the real name.

**Consequence for OAuth:** signing in with Google/Apple creates an
`auth.users` row but **not** a `customer_profiles` row. Email/password
signup creates it explicitly in the web app; OAuth has no such step. So
`services/auth.ts` exposes `ensureCustomerProfile(session)` — call it
immediately after every successful OAuth sign-in. Without it the guest is
authenticated but has no profile, and the booking form has nothing to
pre-fill.

`phone` is `NOT NULL` in that table and no provider gives us one, so it is
seeded as `""` and collected properly in the booking form. It is not
invented.

### 1.2 `distance` is an API route, not a service

`tours.ts`, `bookings.ts`, `tracking.ts` are Supabase-backed and port
directly. `distance` is **`app/api/distance/route.ts`** — a Next.js server
route that holds a routing-provider key and rate-limits by IP.

The mobile app therefore calls it over HTTPS at the deployed domain, via
`EXPO_PUBLIC_WEB_API_URL`. Three consequences:

- `localhost` will not resolve from a phone. Use the live domain, or a
  LAN/ngrok URL in development.
- Rate limiting is **per IP** — every guest on the same hotel Wi-Fi shares
  one budget.
- A `503` means the provider key isn't configured. `services/pricing.ts`
  surfaces that as `{ status: "not_configured" }` so the UI can show the
  WhatsApp fallback, exactly like the website's taximeter widget.

The same applies to `/api/geocode/search`, used for Tromsø address search.

### 1.3 This directory already contained a **driver** app

`package.json` says `"name": "arctic-safari-driver"`, and
`screens/HomeScreen.tsx` is a driver dashboard: it lists *all* bookings
with pending/confirmed/completed filter tabs. That is an operations view,
not the customer experience described in the brief.

I left it untouched and added the customer layer alongside it. **Decide
before building screens:** convert this into the customer app, or keep both
in one binary behind a role check. They want different navigation, so I did
not guess.

Also note `types/booking.ts` includes a `"completed"` status, but the DB
constraint is `check (status in ('pending','confirmed','cancelled'))` —
`completed` cannot currently exist. The new `services/bookings.ts` uses the
real three.

### 1.4 Native OAuth does not work in Expo Go

Google and Apple sign-in are native modules. They need a development build
(`npx expo prebuild` + `run:ios`/`run:android`, or EAS). In Expo Go they
will fail. `services/auth.ts` loads them lazily so the app still runs and
only those two functions return a clear "not installed" message.

Apple Sign-In additionally requires a **paid Apple Developer account** and
is iOS-only — use `isAppleSignInAvailable()` to hide the button on Android
rather than showing one that cannot work.

### 1.5 Payments charge nothing

`services/payments.ts` is an interface plus a mock driver. Every call
returns `status: "mock"` — never `"paid"` — so no screen can present an
unpaid booking as paid. Real payments need a **server** endpoint (secret
keys must never ship in an app bundle) and a provider **webhook** to flip
`bookings.payment_status`. A client claiming success is not proof of
payment.

---

## 2. Service map — web → mobile

| Web (`Artic-Safari/`) | Mobile (`artic-safari-mobile/`) | Backend | Notes |
|---|---|---|---|
| `services/tours.service.ts` | `services/tours.ts` | `tours`, `tour_addons` | Read-only. Admin CRUD + `uploadTourImage` omitted (RLS would reject a customer session). |
| `services/bookings.service.ts` | `services/bookings.ts` | `bookings`, `booking_addons` | Adds `subscribeToBooking()` for live status. Admin mutations omitted. |
| `services/tracking.ts` | `services/tracking.ts` | `driver_locations` (Realtime) | **Read-only.** `pushDriverLocation()` deliberately absent — that's the driver app's job. |
| `services/pricing.service.ts` + `app/api/distance/route.ts` | `services/pricing.ts` | `pricing_rules` + HTTPS route | See 1.2. `quoteTransfer()` does distance → rules → price in one call. |
| `services/auth.service.ts` | `services/auth.ts` | Supabase Auth, `customer_profiles` | Mobile uses native **ID-token** sign-in; web uses browser redirect. Different by necessity. |
| `services/partners.service.ts` (`validatePromoCode`) | folded into `services/bookings.ts` | `public_promo_codes` view | Only the public-safe view; commission rates stay admin-only. |
| `services/loyalty.service.ts` *(new)* | `services/loyalty.ts` | `loyalty_*` | New this round. See §3. |
| — | `services/payments.ts` *(new)* | none | Stub. See 1.5. |

**Intentionally not ported:** `admin/*` views, `audit-log`, `staff`,
`notifications`, `media-vault` uploads, `gallery` uploads, `ai-concierge`,
`wallet-pass`, `weather-automation`, `pickup-logistics`. They are either
admin-only or need a server.

### Why duplicated rather than shared

The two projects are separate npm roots on disk, so there is no shared
workspace to import from. The mobile files are deliberate mirrors with
matching names and signatures.

The duplicated client-side validation is a **UX guard, not the security
boundary.** The real enforcement is in Postgres and unchanged:
`bookings_total_price_check`, `resolve_booking_partner()`,
`apply_loyalty_redemption()`, and RLS. A mobile client cannot bypass any of
it. If these ever drift, the DB still holds the line.

---

## 3. Loyalty points

**Run first:** `supabase-loyalty-points-setup.sql` (in the web repo root),
in Supabase Dashboard → SQL Editor.

Creates:

- **`loyalty_rules`** — single config row: `points_per_100_kr` (default 2),
  `kr_per_point` (1), `min_redeem_points` (100), `max_redeem_percent` (50).
  Admin-editable, publicly readable so the app can show "you'll earn ~N".
  Effective rate = `points_per_100_kr × kr_per_point` % — so the defaults
  are **2% cash back**, with 1 point worth exactly 1 kr.
- **`loyalty_transactions`** — append-only ledger. Positive = earned,
  negative = spent. Balance is *derived*, never a mutable column, so points
  cannot silently drift and every change carries its reason.
- **`loyalty_balances`** — view: balance, lifetime earned, lifetime spent.

### The security model matters here

Both earning and redeeming are **DB triggers**, never client logic — the
same rule the project already applies to partner commission, for the same
reason: the app inserts bookings with the anon key, so a client-supplied
"I redeemed 5000 points" cannot be trusted.

- The client may only send `points_requested` — a *request*.
- `apply_loyalty_redemption()` (BEFORE INSERT) re-reads the real balance,
  clamps to it, caps the discount at `max_redeem_percent`, and rewrites
  `total_price` itself.
- The authoritative result comes back on the booking as `points_redeemed`
  and `loyalty_discount`.
- Points are awarded only on `status → confirmed`, with a unique index so
  re-confirming a booking cannot double-award.
- Earning is calculated on the price *after* any points discount — points
  cannot compound into more points.

`previewRedemption()` in `services/loyalty.ts` mirrors the trigger's maths
so the previewed number matches what the server grants. **It is a preview.**
Always display `points_redeemed` from the returned row as the final truth.

Guest (not-signed-in) bookings work exactly as before and simply neither
earn nor redeem.

---

## 4. Expo setup

### 4.1 Environment

`.env` already has the two Supabase keys. Add the web API base:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_WEB_API_URL=https://www.articsafaritour.com
```

The anon key is safe to ship — RLS is what protects data, and it is already
public in the website bundle. Never put a `service_role` key here.

`lib/supabase.ts` was already correct for React Native (AsyncStorage,
`detectSessionInUrl: false`, AppState-driven token refresh) and was not
modified.

### 4.2 Wrap the app in the language provider

```tsx
import { I18nProvider } from "./i18n";

export default function App() {
  return (
    <I18nProvider>
      <HomeScreen />
    </I18nProvider>
  );
}
```

Then `const { t } = useTranslation()` → `t("booking.confirm")`, and drop
`<LanguageSwitcher />` into a header or settings row.

### 4.3 OAuth (only when you want native sign-in)

```bash
npx expo install @react-native-google-signin/google-signin expo-apple-authentication
npx expo prebuild
npx expo run:ios          # or run:android
```

Then, per provider:

**Google** — Google Cloud Console → OAuth client IDs for Web + iOS +
Android. Paste the **Web** client ID into Supabase Dashboard →
Authentication → Providers → Google, and into
`configureGoogleSignIn({ webClientId })` at app start. Supabase validates
the token's audience against that Web ID, so passing the iOS ID there fails
verification. Android additionally needs the SHA-1 of your signing key.

**Apple** — Apple Developer → App ID with Sign in with Apple, a Services
ID, and a signing key; enter the Services ID + key in Supabase → Providers
→ Apple. Add `"expo-apple-authentication"` to `app.json` plugins.

After either succeeds, call `ensureCustomerProfile(session)` (see 1.1).

### 4.4 Language

`i18n/translations.ts` holds English + Norwegian Bokmål. The Norwegian
object is checked with `satisfies Shape<typeof en>`, so a missing or
misspelled key is a **compile error** rather than silently shipping English
to a Norwegian guest. Choice persists via AsyncStorage; device locale is a
best-effort default falling back to English.

---

## 5. Your action list

| # | Action | Blocks |
|---|---|---|
| 1 | Run `supabase-loyalty-points-setup.sql` | All loyalty features |
| 2 | Add `EXPO_PUBLIC_WEB_API_URL` to `.env` | Taximeter + address search |
| 3 | Decide: driver app, customer app, or both (§1.3) | Navigation structure |
| 4 | Enable Google/Apple in Supabase + create a dev build (§4.3) | Social sign-in |
| 5 | Sanity-check `min_redeem_points` against the 2% rate (see below) | First-redemption feel |
| 6 | Payments: server endpoint + webhook when you get Vipps/Stripe credentials | Real payments |

**On item 5.** The rate is **2% cash back** (2 points per 100 kr, 1 point =
1 kr). Against the real tour prices that lands as:

| Booking | Points earned | Worth |
|---|---|---|
| 2,250 kr (per person) | 45 | 45 kr |
| 5,000 kr (Sommarøy) | 100 | 100 kr |
| 11,000 kr (small group) | 220 | 220 kr |
| 15,000 kr (private group) | 300 | 300 kr |

`min_redeem_points` is still **100** — roughly 5,000 kr of bookings before
a guest can redeem anything. That was a reasonable floor at the old 10%
rate but is a 5× higher bar at 2%: a one-off guest on the 2,250 kr tour
earns 45 points and never reaches it.

Since most Tromsø tour guests visit once, consider lowering it to **25–50**
so a first booking yields something usable — or keep 100 deliberately if
the programme is aimed at repeat and local customers. I did **not** change
it, because that is a business call rather than an arithmetic consequence
of the rate change:

```sql
update loyalty_rules set min_redeem_points = 50;
```

---

## 6. Status

- Both projects typecheck clean (`npx tsc --noEmit`).
- No existing web runtime behaviour changed. Web additions are purely
  additive: `services/loyalty.service.ts`, loyalty Zod schemas, an
  optional `points_requested` field, and `signInWithOAuth()`.
- Not yet built: mobile UI screens. The service layer, i18n, and data
  contracts are in place for them.
