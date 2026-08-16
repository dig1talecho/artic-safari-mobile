// Payment abstraction — Vipps (Norway) and Stripe (cards).
//
// ⚠️  NOTHING HERE CHARGES MONEY. This is an interface + a mock driver so
// the booking UI can be built against a stable shape now and swapped to a
// real provider later by adding one driver and flipping ACTIVE_PROVIDER.
// Every mock call returns `{ status: "mock" }` — never "paid" — so no
// screen can accidentally present an unpaid booking as paid.
//
// WHAT A REAL IMPLEMENTATION STILL NEEDS (none of it exists yet):
//   * A server endpoint that creates the payment intent / Vipps session
//     using the SECRET key. Secret keys must never be in the app bundle,
//     so the client can only ever receive a client-secret / redirect URL.
//   * A provider webhook that flips bookings.payment_status to 'paid'.
//     The client reporting success is not proof of payment — only the
//     webhook is.
//   * Vipps: merchant agreement + Vipps MobilePay ePayment API credentials.
//   * Stripe: @stripe/stripe-react-native + a PaymentIntent endpoint.
//
// Until those exist the booking flow stays request-only (confirmed over
// WhatsApp), which is what the website already does honestly today.

export type PaymentProvider = "vipps" | "stripe" | "mock";

export type PaymentStatus = "mock" | "pending" | "paid" | "failed" | "cancelled";

export interface PaymentRequest {
  bookingId: string;
  /** Minor units (øre) — 490 kr => 49000. Avoids float rounding on money. */
  amountMinor: number;
  currency: "NOK";
  description: string;
  customerEmail: string;
}

export interface PaymentResult {
  status: PaymentStatus;
  provider: PaymentProvider;
  /** Provider-side id, once a real provider is wired in. */
  reference: string | null;
  /** Where to send the user (Vipps app deep link / Stripe redirect). */
  redirectUrl: string | null;
  message: string;
}

export interface PaymentDriver {
  readonly provider: PaymentProvider;
  readonly isConfigured: boolean;
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
  getStatus(reference: string): Promise<PaymentResult>;
}

const mockDriver: PaymentDriver = {
  provider: "mock",
  isConfigured: false,

  async createPayment(request) {
    return {
      status: "mock",
      provider: "mock",
      reference: null,
      redirectUrl: null,
      message: `No payment provider is connected yet. Booking ${request.bookingId} was recorded as a request and will be confirmed manually.`,
    };
  },

  async getStatus() {
    return {
      status: "mock",
      provider: "mock",
      reference: null,
      redirectUrl: null,
      message: "No payment provider is connected yet.",
    };
  },
};

// Swap to the vipps/stripe driver here once one actually exists.
const ACTIVE_PROVIDER: PaymentProvider = "mock";

const drivers: Record<PaymentProvider, PaymentDriver> = {
  mock: mockDriver,
  vipps: mockDriver,
  stripe: mockDriver,
};

export function getPaymentDriver(): PaymentDriver {
  return drivers[ACTIVE_PROVIDER];
}

/** Lets the UI hide "Pay now" and show "Request booking" while unconfigured. */
export function isPaymentEnabled(): boolean {
  return getPaymentDriver().isConfigured;
}

export function krToMinor(kr: number): number {
  return Math.round(kr * 100);
}
