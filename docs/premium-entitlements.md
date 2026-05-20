# Premium Entitlements

The premium system uses centralized client access checks backed by server-verified paid entitlement in production. All gameplay/UI access checks should go through `src/game/EntitlementService.js`.

## Source Of Truth In The Client

- Edition constants, 120-day pass plan IDs, pricing, feature keys, preview metadata, and fair-play copy live in `src/game/editionConfig.js`.
- Runtime access checks live in `src/game/EntitlementService.js`.
- UI should call helper methods such as `hasFeature()`, `canAccessTier()`, `canUseCustomRaceLab()`, `canUseRankedSeasons()`, and feature access-state helpers.
- Do not add scattered direct edition comparisons in gameplay or UI code unless they are inside the entitlement/config layer.

## Demo Override

Demo switching is allowed only when Vite dev mode is active or `VITE_ENABLE_DEMO_ENTITLEMENT=true`.

Allowed demo entry points:

- URL query: `?edition=lite`, `?edition=early`, `?edition=full`
- Systems page demo selector when demo mode is enabled
- Demo-only local storage key owned by the entitlement layer

Demo entitlement must never be written to profile data or Firebase as a real purchase.

## Seasonal Passes

- `early_access_pass_120d`: Early Access Pass, INR 49 / USD 3.99, 120 days.
- `full_premium_pass_120d`: Full Premium Pass, INR 149 / USD 6.99, 120 days.
- Passes are fixed duration. They are not subscriptions and do not auto-renew.
- Expired passes fall back to GameHub Lite effective access without deleting profile progress or reward history.

## Payment Interfaces

Current functions:

- `getAvailablePlans()`
- `startPurchase(planId)` for backend-created Razorpay checkout
- `refreshEntitlement()`
- `mockGrantEntitlement(planId)` for dev/demo only

Stripe global remains future work:

1. Client requests a checkout session from a trusted backend.
2. Backend creates a Stripe Checkout session for the selected plan and region.
3. Stripe webhook confirms payment.
4. Backend writes verified entitlement for the authenticated user.
5. Client calls `refreshEntitlement()` and reads verified backend entitlement.

Razorpay India flow:

1. Client requests an order from a trusted backend.
2. Backend creates a Razorpay order using config-driven India pricing.
3. Client completes Razorpay checkout.
4. Backend verifies payment signature and status.
5. Backend writes verified 120-day pass entitlement for the authenticated user.
6. Client refreshes entitlement from backend state.

## Production Security

Client-only entitlement is not secure for a real paid launch. Production paid access must be verified server-side because browser local storage, query params, and bundled JavaScript can be modified by users.

Before launch with real payments:

- Validate payment webhooks server-side.
- Store verified pass entitlements under authenticated user IDs with `startsAt`, `expiresAt`, and `durationDays`.
- Return `effectiveTier: GAMEHUB_LITE` for expired, revoked, refunded, or missing entitlement.
- Keep demo overrides disabled in production unless explicitly needed for QA.
- Keep GameHub Lite as a non-paid default.
- Review or migrate any old paid records without `expiresAt`; do not silently grant lifetime access.
