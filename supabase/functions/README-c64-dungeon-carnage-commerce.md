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

## Live Supabase state

The PayPal schema migration has been applied to Supabase project `lcslgxpgmttaexsorxik`.

The following Edge Functions are deployed and active:

- `ccg-commerce` — PayPal Orders v2 create/capture flow
- `ccg-paypal-webhook` — PayPal webhook verification and entitlement handling

The functions intentionally fail closed until PayPal credentials are configured. The older `ccg-stripe-webhook` function remains deployed but is not part of the PayPal purchase path.

## Remaining credential blocker

Configure these directly in Supabase; never store them in GitHub or browser JavaScript:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_ENVIRONMENT=sandbox` for qualification

The current integration cannot create a PayPal Developer REST application or write Supabase Edge Function secrets automatically. Those values must be entered through the PayPal Developer and Supabase dashboards before sandbox checkout can work.

Switch `PAYPAL_ENVIRONMENT` to `live` only after the sandbox flow has been fully exercised.

## PayPal webhook endpoint

`https://lcslgxpgmttaexsorxik.supabase.co/functions/v1/ccg-paypal-webhook`

Subscribe the PayPal app webhook to:

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `PAYMENT.CAPTURE.REVERSED`
- `CHECKOUT.PAYMENT-APPROVAL.REVERSED`
- `CUSTOMER.DISPUTE.CREATED`

The webhook verifies PayPal's notification signature with PayPal before changing entitlement state. Order identity, CCG account ownership, currency and amount are verified before access is granted. Full refunds, reversals and disputes revoke ownership; partial refunds are recorded without revoking ownership.

## Download publication

Do not set `public.ccg_products.download_ready` to true until a tested ZIP exists at the private bucket/path above. Paid users receive a 120-second signed URL; the bucket itself stays private.
