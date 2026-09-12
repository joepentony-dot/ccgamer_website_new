# C64 Dungeon Carnage — Commerce Foundation

This is a deliberately isolated first commercial-release layer.

It does **not** enable live checkout, create entitlements, expose a purchaser download, or mutate any production data.

## Purpose

Promote the already proven PayPal Orders v2 gateway boundary from the historical containment branch into current `main` as an independently testable component.

The game currently uses the legacy product slug `the-lost-sizzler-full-game`; retain that slug until a separate migration is designed and regression-tested.

## Security boundary

- PayPal client secrets remain server-side.
- The browser never supplies the authoritative product price.
- The gateway accepts only `sandbox` or `live` environments.
- Order creation uses a server-provided amount in minor units and a local purchase UUID.
- PayPal request IDs are validated and sent for idempotency.
- Capture results are normalized for later server-side entitlement validation.
- A browser callback, redirect, PayPal order id or client-side flag alone must never grant ownership.

## Current release price contract

The intended launch product remains a one-time permanent unlock at GBP £1.99 until explicitly changed by the project owner.

This gateway itself does not store or choose that price. The authoritative product/price record belongs in the later commerce database layer.

## Still required before commerce can be enabled

1. Account-authenticated commerce HTTP endpoints.
2. Server-authoritative product and purchase-order storage.
3. PostgreSQL permanent entitlement records.
4. Capture validation against expected local order id, amount and currency.
5. Idempotent entitlement finalization.
6. Verified PayPal webhook handling for refunds/reversals.
7. Browser purchase client connected to the existing V10.42 demo/paywall provider boundary.
8. PayPal Sandbox end-to-end test using deployment secrets.
9. Cross-session and cross-device entitlement restore.
10. Secure purchaser-only offline download authorization.

Do not enable production commerce until those gates are complete and explicitly approved.
