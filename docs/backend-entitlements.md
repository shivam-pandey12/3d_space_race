# Backend Entitlements

Premium paid access is server verified and resolved as a fixed-duration 120-day pass.

## Model

Entitlement record:
- `userId`
- `tier`: `GAMEHUB_LITE`, `STANDALONE_EARLY_ACCESS`, or `STANDALONE_FULL_PREMIUM`
- `source`: `razorpay`, `admin/manual`, or future backend sources
- `status`: `active`, `refunded`, `revoked`, or future expiry states
- `grantedAt`
- `startsAt`
- `expiresAt`
- `durationDays`: `120`
- `updatedAt`
- `paymentRecordId`
- `planId`

Payment record:
- `userId`
- `planId`
- `tier`
- `durationDays`
- `amount`
- `currency`
- `razorpayOrderId`
- `razorpayPaymentId`
- `status`
- `createdAt`
- `verifiedAt`
- `source`
- `environment`

## Resolution Priority

Production:
1. backend verified entitlement
2. GameHub Lite fallback

Development/demo:
1. explicit demo override when enabled
2. backend verified entitlement
3. build default
4. GameHub Lite

Demo/test account unlocks are disabled outside dev/demo mode and must never be treated as paid production entitlement.

## Pass Expiry

`/api/entitlements/me` and `/api/entitlements/refresh` return both raw and effective access:

- `rawTier`: stored paid tier.
- `effectiveTier`: paid tier only while the pass is active and unexpired; otherwise `GAMEHUB_LITE`.
- `startsAt` / `expiresAt`
- `daysRemaining`
- `status`: `active`, `expired`, `refunded`, `revoked`, or `none`.

When `expiresAt` passes, users fall back to GameHub Lite access. Profile progress, rewards, trophies, badges, ratings, and cosmetics are preserved.

## Renewal And Upgrade

- Same-tier active renewal extends from the current `expiresAt`.
- Same-tier expired renewal starts from now.
- Early Access Pass to Full Premium Pass starts Full Premium for 120 days from verification.
- Active Full Premium Pass users are not downgraded by Early Access checkout; lower-tier checkout should be blocked.

## Guest Purchases

Guests cannot purchase. The UI shows:

`Sign in with Google to purchase and keep your premium access.`

Checkout buttons are disabled for guests.

## Failure Behavior

If backend entitlement refresh fails in production, paid content is not unlocked from cached local data. Existing GameHub Lite/free progress and features remain usable.

## Phase 8 Part 2 Integration

- Private online tournament create/join is gated by backend entitlement in production.
- 4-player private tournaments require Early Access or higher.
- 8-player private tournaments require Full Premium.
- Official backend event leaderboard submission validates the user's entitlement for the event `requiredEdition`.

## Future Admin/Refund Notes

Refund/revoke flows should update the backend entitlement `status` and keep profile progress intact. Client-side localStorage must never become the source of truth for paid purchases.

## Legacy Records

Old paid entitlement records without `expiresAt` must not grant lifetime production access by default. Use `ENABLE_LEGACY_PASS_MIGRATION=true` only when intentionally converting reviewed legacy records into 120-day passes from migration time.
