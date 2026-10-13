# Native Elaneeru: Google Sheets + Supabase shadow recording (V1011)

## Current architecture
- **Google Sheets / Apps Script remains the sole source of truth.**
- A 5-minute Apps Script time trigger mirrors **selected operational tables** to
  `public.ne_shadow_records` in the existing Supabase V7 project.
- Mirroring is **at least once and eventually consistent**. Each row is keyed by
  (source_sheet, source_id); replays and updates are idempotent.
- Mirroring **never invokes live Supabase order, stock-ledger, or payment writes**.
  There is no second charge or second order when a record is mirrored.
- The shadow mirror is for reconciliation. It is NOT used by customer apps.
- B2C checkout writes directly with `setValues`, so intercepting `append_()`
  alone would miss records. This implementation polls the actual Sheets tabs.

## Covered data
Orders, Order_Items, B2B_Orders, B2B_Order_Items (every tick), plus rotating
Customers, B2B_Vendors, Products, Coconut_Batches, Batch_Assignments,
Inventory_Ledger, B2B_Collections, Payment_Ledger, Vendor_Onboarding,
Vendor_Pricing, Delivery_Events, Purchase_Orders, Purchase_Order_Items,
NE_Suppliers.

Other tabs, including App_Analytics and Audit_Log, are **not yet covered**.
Do not claim every row in the 58-tab workbook is dual-recorded.

## Deployment and setup (requires Apps Script admin)
This feature is deliberately *not* enabled by merging code alone.

1. Review and merge the pull request. Deployment of files in `src/**`
   follows the existing GitHub Actions -> `clasp` workflow.
2. In the Google Apps Script project backing **Native Elaneeru V8 - Fresh Operations**,
   open **Project Settings -> Script Properties**.
3. Add `NE_SHADOW_SERVICE_KEY` containing the **legacy Supabase service_role JWT**.
   Retrieve it privately from Supabase -> Project Settings -> API Keys ->
   Legacy API keys. **Never put it in GitHub, the browser, B2B/B2C apps,
   a Google Sheet, or this chat.** Limit Apps Script editor access because
   this server-side key is privileged.
4. Set `NE_SHADOW_ENABLED` to `true`.
5. In the Apps Script editor run `neShadowAdminStatusV1011` to check
   activation state; run `neShadowAdminTestV1011` once.
6. Check Supabase via SQL editor:
   `select source_sheet,count(*) from public.ne_shadow_records group by 1 order by 1;`
   The client roles `anon` and `authenticated` have no table grants.
7. Only after a first clean run, run `neShadowAdminInstallV1011` to install
   the 5-minute trigger. It replaces an existing trigger with the same handler.
8. Reconcile current orders and payments (counts and amounts) against Sheets;
   review exception rows and confirm every order is mirrored before a cutover.

### Important limitations
- Mirror is not fully real-time or transactional across systems; it is
  eventually consistent. A stale/missing mirror row must **not** block an
  order, change credit, or trigger payment retries.
- Each tick scans the last 30 rows for essential near-term updates, plus a
  rotating 40-row backfill window for every visited tab. Some older row edits
  are observed only when the cursor catches up.
- Only one Sheets workbook is configured. It does not mirror local browser
  storage from the Operations V2 prototype.
- Missing first-column IDs are not mirrored. PO items use PO ID + Line No.
- Field names containing PIN/password/secret/token/OTP/key/hash/credential are
  dropped by the Apps Script sender **and** the database RPC.
- Do not migrate PIN hashes to Supabase Auth. Build a verified user account
  linking and reset mechanism for future customer/vendor login cutover.
- Enforce the free plan storage limit and set up reliable backups before
  switching business-critical applications.

### Emergency pause
Run `neShadowAdminPauseV1011()` or set `NE_SHADOW_ENABLED=false`. This stops
mirror sends without affecting customer checkouts or the existing data in
either Google Sheets or Supabase.

### SQL data flow
`Google Sheets -> neShadowAdminTestV1011 (Apps Script server with protected service JWT)
 -> Supabase RPC public.ne_shadow_upsert -> public.ne_shadow_records`

The RPC accepts only a service-role connection, only allowed source tabs, a
maximum of 75 records per request, and individual object payloads <=25 kB.
It skips identical updates and has RLS enabled with no public/client access.

### Cutover acceptance criteria
The Apps Script token and trigger are live and verified; daily reconciliation
matches; high-value and ambiguous legacy records are resolved; Auth identity
mapping is tested; vendor credit and inventory invariants are validated;
Supabase advisors are reviewed; real mobile app login/order/payment/driver
workflows pass; backout instructions are tested. Until then, **do not change
frontend API destinations**.

## Anonymous-web-app security
The actual clock handler is `neShadowTickV1011(e)`; it **requires the
stored, private installable trigger UID**. Calls without that UID are rejected.
Owner-only controls `neShadowAdminStatusV1011`,
`neShadowAdminTestV1011`, `neShadowAdminInstallV1011` and
`neShadowAdminPauseV1011` require a nonempty active user email matching the
script's effective owner email. Other implementation helpers end with an
underscore so `google.script.run` cannot call them from customer pages.
The script editor must be operated by the Apps Script deploying account.
