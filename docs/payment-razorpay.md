# Razorpay Payment Integration

India Razorpay checkout is backend verified and now grants fixed 120-day seasonal access passes only.

Plans:
- `early_access_pass_120d`: Early Access Pass, INR 49, 120 days.
- `full_premium_pass_120d`: Full Premium Pass, INR 149, 120 days.

This is not a subscription and does not auto-renew.

## Environment

Backend:
- `ENABLE_PAYMENTS=true`
- `ENABLE_BACKEND_ENTITLEMENTS=true`
- `PAYMENT_ENV=test|live`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `GAMEHUB_ALLOWED_ORIGINS`
- Firebase Admin / Firestore for production entitlement storage

Frontend:
- `VITE_ENABLE_PAYMENTS=true`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_API_BASE_URL`

Never expose `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in frontend code, client logs, or Vite env vars.

## Flow

1. Client calls `POST /api/payments/razorpay/create-order` with a plan id and Firebase auth token.
2. Server validates the Google identity, plan, amount, currency, and Razorpay setup.
3. Server creates the Razorpay order and stores a payment record.
4. Client opens Razorpay Checkout using the public key id and order id.
5. Client sends Razorpay response to `POST /api/payments/razorpay/verify`.
6. Server verifies the Razorpay signature and confirms payment status/amount/currency with Razorpay.
7. Server grants a 120-day pass only after verification.
8. Client refreshes entitlement from `/api/entitlements/refresh`.

Closing checkout or failed verification does not grant entitlement.

## Webhook

`POST /api/payments/razorpay/webhook` uses the webhook secret to verify the raw payload signature. Captured payments reconcile existing orders and grant pass entitlement idempotently.

Duplicate webhooks are safe: the same payment record cannot extend a pass twice.

Refund events mark the matching entitlement `refunded` when the payment record can be matched.

## Renewal And Upgrade Rules

- Renewing an active same-tier pass extends from the current `expiresAt`.
- Renewing an expired same-tier pass starts from the current time.
- Upgrading Early Access Pass to Full Premium Pass starts Full Premium for 120 days from verification time.
- Active Full Premium Pass users should renew Full Premium; lower-tier Early checkout is blocked.

## Production Safety

In production, `ENABLE_PAYMENTS=true` requires:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- backend entitlement storage

If any required setup is missing, payment endpoints fail safely with no entitlement grant.

Do not expose `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to the browser.
