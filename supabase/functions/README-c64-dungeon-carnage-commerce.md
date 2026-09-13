# C64 Dungeon Carnage commerce release

C64 Dungeon Carnage uses a two-minute browser trial followed by a permanent £1.99 CCG-account unlock.

## Runtime

- Browser paywall: `arcade/lost-sizzler/js/v10-42-demo-paywall.js`
- Browser commerce adapter: `arcade/lost-sizzler/js/v10-42-stripe-commerce.js`
- Commerce API: `supabase/functions/ccg-commerce/index.ts`
- Stripe webhook: `supabase/functions/ccg-stripe-webhook/index.ts`
- Product slug: `c64-dungeon-carnage`
- Price: GBP 1.99, read server-side from `public.ccg_products`
- Private download bucket: `ccg-paid-downloads`
- Download path: `c64-dungeon-carnage/c64-dungeon-carnage.zip`

## Required Supabase Edge Function secrets

The hosted functions fail closed until both Stripe secrets exist:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Never put either value in GitHub source or browser JavaScript.

## Stripe webhook endpoint

`https://lcslgxpgmttaexsorxik.supabase.co/functions/v1/ccg-stripe-webhook`

Subscribe the endpoint to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `charge.refunded`
- `charge.dispute.created`

The webhook verifies Stripe's signature and then verifies the account ID, product slug, currency and amount before granting entitlement.

## Download publication

Do not set `public.ccg_products.download_ready` to true until a tested ZIP exists at the private bucket/path above. Paid users receive a 120-second signed URL; the bucket itself stays private.
