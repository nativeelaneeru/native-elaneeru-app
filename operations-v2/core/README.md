# Native Elaneeru Operations V2 — Shared Core

This folder is the contract for every non-sales NE app. Existing B2B and B2C sales apps remain separate.

## Apps built on this core

- Admin / Control Tower
- Warehouse / Inwarding / Inventory
- Picker
- Loading / Dispatch
- B2B Driver
- B2C Delivery
- Returns / Damage
- Vendor Onboarding
- Vendor Approval

## Single source of truth

All apps must use the same logical records: employees, locations, suppliers, products, inwards, batches, bunches, orders, allocations, trips, deliveries, returns, damages, vehicles, vendors, stock ledger and audit log.

`schema.js` defines table names, columns, statuses, ID conventions and inventory invariants.

`roles.js` defines roles, app access and permissions.

`store.js` defines the common data adapter. It currently supports a local prototype mode and already has an API mode contract ready for the Google Apps Script production backend.

## Production rule

No front-end app may directly mutate inventory totals independently. A stock-changing operation must update the relevant operational record and append a `STOCK_LEDGER` movement as one transaction.

## Stock lifecycle

INWARD → AVAILABLE → RESERVED → PICKED → LOADED → IN_TRANSIT → DELIVERED

Exceptions: UNRESERVE, UNPICK, UNLOAD, RETURN, DAMAGE, ADJUSTMENT, TRANSFER.

## Order lifecycle

NEW → ALLOCATED → PICKING → PICKED → LOADING → DISPATCHED → OUT_FOR_DELIVERY → DELIVERED

Exceptions: PARTIAL, FAILED, CANCELLED, RETURNED.

## Next implementation step

Build the Apps Script API and Google Sheet tabs from `schema.js`, then point `NE_CORE_STORE.configure({mode:'api', apiUrl:'...'})` to that deployment. Until then, new V2 apps can use local mode for UI and workflow testing without touching production B2B/B2C.
