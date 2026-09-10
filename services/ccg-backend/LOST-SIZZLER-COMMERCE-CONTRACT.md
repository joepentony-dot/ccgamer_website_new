# The Lost Sizzler — purchase and permanent entitlement contract

Status: **design/implementation contract only**. The live game is not wired to this provider yet.

## Product promise

The free Tutorial becomes the complete playable introduction to The Lost Sizzler. Finishing that introduction may present the purchase screen, but it must never interrupt or retroactively remove completed Tutorial progress.

The paid product is a **one-time permanent game unlock**, not a subscription. The initial server-authoritative launch price is **GBP £1.99**. The product record may be deliberately repriced before launch without changing the meaning of existing entitlements.

Every valid purchase:

- belongs to the purchaser's CCG account;
- unlocks the full game permanently for that account;
- includes **all future The Lost Sizzler game updates at no extra charge**;
- may be restored on another device by signing into the same CCG account;
- helps fund continued game development and support.

A refund, reversed payment or chargeback may revoke the corresponding entitlement after verified payment-provider reconciliation. This does not turn the licence into a subscription.

## Required purchase-screen message

The final presentation may be styled to match the game, but it must communicate all of these points before payment:

> **Unlock The Lost Sizzler permanently — £1.99 one-off**
>
> Your purchase is permanently tied to your CCG account, so you can sign in and restore the game on another device. Your purchase helps fund continued development and support, and all future game updates are included at no extra charge.

For a signed-out player, the payment control is replaced by:

> **Sign in or create a CCG account to continue.**
>
> Your purchase will be attached to that account permanently.

The account requirement must be presented before PayPal is opened. A new account should have a verified/recoverable email before payment is accepted so a typo cannot strand a permanent purchase on an inaccessible account.

## PayPal flow

Use PayPal Checkout / Orders v2 rather than a raw PayPal.me link or an unverified direct transfer.

The intended browser experience is a PayPal checkout popup. If the browser or PayPal cannot use a popup, the integration may fall back to another PayPal-supported presentation mode rather than making payment impossible.

The payment goes to the PayPal merchant account attached to the configured PayPal REST application credentials. No PayPal recipient email address is embedded in the game.

The browser never decides or submits the authoritative price. It requests an order for the fixed product slug and the CCG backend reads the price/currency from PostgreSQL before creating the PayPal order.

PayPal client ID may be exposed to the browser as required by the PayPal JavaScript SDK. `PAYPAL_CLIENT_SECRET` and webhook verification configuration remain server-side deployment secrets and must never be committed or returned to the browser.

## Account and entitlement sequence

1. Player completes the free introduction.
2. The game checks the current CCG-account entitlement.
3. If an active permanent entitlement already exists, the full game unlocks without showing checkout.
4. If signed out, show **Sign in / Register**. Do not create a PayPal order yet.
5. After authenticated account access is established, request the server-authoritative offer.
6. Player chooses the PayPal purchase control.
7. CCG backend creates the PayPal order using the fixed product, amount and currency.
8. PayPal handles buyer approval in its checkout UI.
9. CCG backend captures the approved order server-side.
10. Only a verified `COMPLETED` capture with the expected local order ID, amount and currency may create the entitlement.
11. The CCG backend grants the account a `permanent` entitlement for `the-lost-sizzler-full-game`.
12. The client refreshes entitlement state and unlocks the full game.

An order ID, browser success callback or redirected URL alone is **not** proof of purchase.

## Persistence and restore

PostgreSQL `game_entitlements` is the account-level source of truth. The entitlement is version-independent; a future V10.42, V11 or later build remains covered by the same permanent entitlement.

A later desktop/offline licence layer should use a CCG-signed entitlement receipt so an already purchased installation does not suddenly become unusable during a temporary backend outage. That receipt is a cache of the account entitlement, not a second purchase system. Signing keys for offline licences must be separate from browser storage and remain server-side.

On a new device, signing in to the account restores the server entitlement and may mint a fresh offline receipt.

## Payment integrity

The CCG backend must:

- use server-side PayPal credentials;
- use idempotent provider request IDs;
- record local purchase orders before provider creation;
- validate PayPal order ID, local `custom_id`, capture status, amount and currency before granting access;
- keep capture IDs unique;
- make repeat capture/finalization requests idempotent;
- retain no payer email unless a later support requirement explicitly justifies it;
- verify PayPal webhook signatures before processing asynchronous payment events;
- deduplicate webhook event IDs;
- use verified refund/reversal events for entitlement reconciliation;
- test in PayPal Sandbox before live credentials are enabled.

## Deployment locks

`CCG_LOST_SIZZLER_COMMERCE_ENABLED` defaults to `false`.

Enabling commerce requires server deployment values for:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `CCG_PAYPAL_ENVIRONMENT=sandbox|live`

The repository must not contain real PayPal secrets.

The live Tutorial/paywall must not be wired to commerce until registration/recovery, sandbox payment, capture, entitlement restore, cancellation, popup-blocker fallback, refund/reversal reconciliation and cross-device restore have all passed their release gates.
