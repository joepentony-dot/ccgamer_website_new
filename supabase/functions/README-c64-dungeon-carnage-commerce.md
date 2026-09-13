# C64 Dungeon Carnage commerce release

C64 Dungeon Carnage uses a two-minute browser trial followed by a permanent £1.99 CCG-account unlock.

## Runtime

- Browser paywall: `arcade/lost-sizzler/js/v10-42-demo-paywall.js`
- Browser commerce adapter: `arcade/lost-sizzler/js/v10-42-paypal-commerce.js`
- Commerce API: `supabase/functions/ccg-commerce/index.ts`
- PayPal webhook: `supabase/functions/ccg-paypal-webhook/index.ts`
- Product slug: `c64-dungeon-carnage`
- Price: GBP 1.99, read server-side from `public.ccg_products`
- Private download bucket: `ccg-paid-downloads`
- Download path: `c64-dungeon-carnage/c64-dungeon-carnage.zip`

## Required Supabase Edge Function secrets

The hosted functions fail closed until the PayPal configuration exists:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_ENVIRONMENT` set explicitly to `sandbox` or `live`

Never put PayPal client secrets or other privileged credentials in GitHub source or browser JavaScript.

## PayPal flow

Checkout uses PayPal Orders v2 server-side. The signed-in CCG user creates an order through `ccg-commerce`, PayPal handles buyer approval, and the returning order is captured server-side before permanent entitlement is granted. The browser never receives the PayPal client secret.

The webhook endpoint is:

`https://lcslgxpgmttaexsorxik.supabase.co/functions/v1/ccg-paypal-webhook`

Subscribe the PayPal REST app webhook to at least:

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `PAYMENT.CAPTURE.REVERSED`
- `CHECKOUT.PAYMENT-APPROVAL.REVERSED`
- `CUSTOMER.DISPUTE.CREATED`

`ccg-paypal-webhook` verifies every webhook through PayPal's `verify-webhook-signature` API using the registered `PAYPAL_WEBHOOK_ID`. Successful capture events are checked against the server-side CCG checkout session, product price and GBP currency before entitlement is granted. A full refund is confirmed from the original capture before access is revoked; a partial refund is recorded without revoking ownership. Reversals and disputes revoke access, while an approval reversal marks the checkout as failed.

## Release safety

Start with `PAYPAL_ENVIRONMENT=sandbox` and complete an end-to-end sandbox purchase, return, capture, webhook, full-refund and dispute test before changing to `live`. Do not enable live PayPal credentials merely because repository CI passes.

## Download publication

Do not set `public.ccg_products.download_ready` to true until a tested ZIP exists at the private bucket/path above. Paid users receive a 120-second signed URL; the bucket itself stays private.
