# Checkout Gateway PoC — Inventory

One-page snapshot for the "split the gateway out" conversation (Rob/Dennis, CI/CD + hosting).

## Endpoints (Next.js route handlers)

| Route | Method | Purpose |
|---|---|---|
| `/api/commerce/stripe/checkout` | POST | Verifies shopper JWT, loads cart, looks up Stripe credentials for the buyer client, creates a hosted Stripe Checkout Session, marks cart checkout-pending. |
| `/api/commerce/stripe/complete` | POST (Stripe webhook) | Receives `checkout.session.completed` / async payment events from Stripe, syncs Incoming order (tax/shipping) when middleware creds are configured. |
| `/api/commerce/stripe/status` | GET | Shopper-polled status check; verifies JWT, reads Outgoing order, syncs from Stripe if not yet terminal, returns checkout status + tax. |
| `/api/commerce/checkout/readiness` | GET | Health/config check — reports whether required checkout env vars are present (`getCheckoutReadiness`). |
| `/checkout/success`, `/checkout/cancel` | page | Post-Stripe-redirect landing pages (not API, but part of the flow). |

No dynamic `[attemptId]` route exists — already removed in prior refactors (`ac449420`, `519e3297`).

## Env vars

| Var | Required? | Purpose |
|---|---|---|
| `CHECKOUT_STRIPE_VAULT_JSON` | Yes | Server-only map of OrderCloud buyer client ID → `{ api_key, webhook_signing_secret, return_url }`. JSON or base64-encoded JSON. |
| `NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL` | Yes | OrderCloud API base (sandbox/prod). |
| `NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID` | Yes | Anonymous-shopping buyer API client. |
| `NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE` | Yes | Scope for anonymous shopper tokens. |
| `ORDERCLOUD_MIDDLEWARE_CLIENT_ID` / `_CLIENT_SECRET` | Optional | Enables Incoming-order tax/shipping patch after Stripe payment; without it, `/stripe/complete` still acks 200 and `/stripe/status` still submits the Outgoing order. |
| `ORDERCLOUD_MIDDLEWARE_SCOPE` | Optional | Needs `OrderAdmin OverrideTax OverrideShipping` when middleware creds are set. |

## Key library modules (`src/lib/commerce/`)

- `checkout/session.ts` — creates the hosted Stripe Checkout Session.
- `checkout/vault.ts` — parses `CHECKOUT_STRIPE_VAULT_JSON`, resolves credentials per buyer client ID.
- `checkout/readiness.ts` — env-var completeness check for `/checkout/readiness`.
- `checkout/shopper-complete.ts` — syncs checkout status from Stripe back onto the OrderCloud order.
- `checkout/status.ts` — maps OrderCloud/Stripe status enums.
- `checkout/webhook-event.ts` — Stripe webhook signature verification/parsing.
- `checkout/hosted.ts`, `checkout/incoming.ts` — hosted-session + Incoming-order helpers.
- `auth/verify-jwt.ts`, `auth/bearer-token.ts` — verifies shopper JWTs against OrderCloud certs, reads bearer tokens.
- `client.ts` — shared `orderCloudRequest` wrapper.

## External dependencies

- `stripe` (^22.6.2) — Stripe SDK for Checkout Sessions + webhooks.
- `ordercloud-javascript-sdk` (^12.0.0) — OrderCloud API client/types.
- `jose` (^5.10.0) — JWT verification (shopper token against OrderCloud JWKS).
- Stripe CLI (`stripe listen`, dev-only) — forwards webhook events to `/stripe/complete` locally.

## Notes for the split-out conversation

- Currently lives inside the XM Cloud Next.js starter (`kit-nextjs-commerce-starter`), not a standalone service.
- Stateless aside from the vault env var — no DB of its own; all order state lives in OrderCloud.
- Tightly coupled to Next.js route handler conventions; extracting as its own service means re-hosting these 4 endpoints + the `lib/commerce/checkout` and `lib/commerce/auth` modules, and re-wiring the frontend to call the new host instead of same-origin `/api/commerce/*`.
