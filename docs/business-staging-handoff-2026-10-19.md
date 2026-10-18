# Native Elaneeru Business — Staging implementation (19 October 2026)

Branch: `staging/business-seven-screen-review-20261019`. Base: `5890386cec52fb6cad88b0cc45f8d1e026033a54`.

**No deployment, Apps Script push, Google Sheet write, Supabase write, price change or production branch merge is authorized.**

## Approved screen decisions
1. Login + registration: mobile/PIN, approved-vendor gate, improved registration UX.
2. Home: carousel, price, strong order CTA, schemes navigation, conditional delivery card.
3. Products: MOQ 200 per selected product, numeric direct quantity entry, existing step/stock rules.
4. Checkout: selected date + verified capacity slot required; morning/afternoon operational windows must first be configured; COD default.
5. Order history: truthful status; GPS when available; in-app notifications only.
6. Schemes: delivered net eligible coconuts; manual reward approval.
7. Account: credit checkout disabled; voice/text help and ticket tracking.

## Changes completed on staging
- `b2b/app-v5.js`: enforce minimum 200 via `minQty`; direct numeric product quantity; hide credit checkout option; constrain displayed slots to dated/labelled capacity entries; require explicit slot selection for order submission. This is a **staging-only frontend gate**, not a server-side enforcement change.
- `b2b/approved-launch-policy-v1.js`: isolated policy helpers for quantity, net delivered target progress, approval status and capacity eligibility. These helpers are **not wired into production or backend**.

## Reviewed dependencies
- `package.json` contains clasp deployment dependency, no general JS test script.
- `b2b/index.html` loads `b2b/app-v5.js` and `b2b/config.js`.
- `src/NE_B2B_Workspace_V5.gs` supplies vendor-specific orders/payments/tickets and eligible delivery slots.
- `src/NE_B2B_Auto_Accept_V967.gs` contains inventory/capacity acceptance logic.
- Google Sheets is the current source; Supabase remains a shadow copy.

## Checks performed (not E2E)
- JavaScript syntax parsing of updated `b2b/app-v5.js`: PASS.
- Policy helper checks: 10/10 PASS: integer MOQ boundaries, returns-adjusted delivery, rewards, credit disabled and slot capacity.
- Static source assertions for added staging gates: PASS.
- Real browser, real login, orders, payment, GPS, voice and Android/iOS tests: **NOT RUN**.

## Known implementation gaps — do not launch from this branch
- Apply 200-piece policy server-side with explicit definition of per-item vs per-order minimum and account for older vendor-specific exceptions.
- Apply server-enforced no-credit checkout. Staging only hides frontend option, which is insufficient for security.
- Finish time-slot atomic reservation, cutoffs and capacity checks for real windows. Current staging blocks orders without a selected configured slot.
- Registration currently routes to support; dedicated form + approval workflow requires backend integration.
- Home proposed layout, new bottom Schemes tab, three-language translations and final artwork are not implemented here.
- GPS stream accuracy / freshness, in-app notification event generation, actual invoice, real tickets and voice need device UAT.
- B2B_Targets currently exposes one target in `DATA.target`; implement multi-target backend, expiry gating, net delivered qualification and manual reward issuance ledger.
- Real order/inventory/collections/Supabase-shadow reconciliation plus rollback verification remain blockers.
- Staging test is source-level only: **not production-ready**.

## Next safe sequence
1. Add server-side P0 guards and mock tests on staging only.
2. Build the approved seven-screen UI in the same staging branch.
3. Set up test fixtures and witnessed nonfinancial E2E in a **separate test environment**.
4. Only after explicit owner authorization, assess production release.
