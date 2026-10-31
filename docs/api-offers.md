# WOW — Offers API (Migration 004)

Source of truth: `004_offers_workflow.sql` and the RLS hardening in `010_database_hardening.sql`.

## Scope

This PR adds `@wow/api` request functions, React Query hooks, cache keys and local contract tests for the seven offer-workflow RPCs. No schema changes or new backend. No Expo screen implementations.

### Merchant

| Function | Hook | Backend |
| --- | --- | --- |
| `getBusinessOffers(client, businessId)` | `useBusinessOffers(businessId)` | `public.offers` SELECT with RLS |
| `getOfferVersions(client, offerId)` | `useOfferVersions(offerId)` | `public.offer_versions` SELECT with RLS |
| `getOfferVersionDetails(client, versionId)` | `useOfferVersionDetails(versionId)` | Version, items, attributes, branches, media SELECT with RLS |
| `createOffer(client, { businessId })` | `useCreateOffer()` | `wow_create_offer` |
| `saveOfferDraft(client, { offerId, payload })` | `useSaveOfferDraft()` | `wow_save_offer_draft` |
| `submitOffer(client, offerId)` | `useSubmitOffer()` | `wow_submit_offer` |
| `setOfferAvailability(client, input)` | `useSetOfferAvailability()` | `wow_set_offer_availability` |

### Admin

| Function | Hook | Backend |
| --- | --- | --- |
| `listAdminPendingOffers(client, options)` | `useAdminPendingOffers(options)` | `wow_admin_list_pending_offers` |
| `getAdminOfferReview(client, versionId)` | `useAdminOfferReview(versionId)` | `wow_admin_get_offer_review` |
| `decideAdminOffer(client, input)` | `useAdminDecideOffer()` | `wow_admin_decide_offer` |

This is **seven RPCs**, plus merchant reads via RLS-protected table SELECT. Admin-only detail includes private evidence keys; never pass it into Customer screens or persist it.

## Draft contract

`OfferDraftPayload` requires complete `items` and `branches` arrays; Migration 004 expects **1–50 of each**. Item attributes are optional, up to 20 per item. On every save, SQL atomically *replaces* all draft items, attributes, associated media and branch relations. If adding images, call the separate Migration 008 attachment RPC **after** the draft save. Re-saving the draft deletes its prior media links; the client must reattach explicitly.

`saveOfferDraft` returns a **version ID**, while `createOffer` and `setOfferAvailability` return an **offer ID**. `submitOffer` returns the submitted **version ID**. Rejecting a revision preserves any existing published version.

Example:

```ts
const create = useCreateOffer();
const save = useSaveOfferDraft();
const submit = useSubmitOffer();

const offerId = await create.mutateAsync({ businessId });
const versionId = await save.mutateAsync({
  offerId,
  payload: {
    title: 'Local special',
    offer_kind: 'product',
    final_price: '4200.00',
    original_price: '5000.00',
    currency: 'YER',
    starts_at: '2026-11-01T08:00:00+03:00',
    ends_at: '2026-11-08T21:00:00+03:00',
    items: [{ item_type: 'product', name: 'Cooking oil 1L', quantity: 1, unit: 'bottle' }],
    branches: [approvedBranchId],
  },
});
await submit.mutateAsync(offerId);
```

The example is illustrative. Merchant submission only works for an approved business and approved branches with assigned permissions. Version ID is useful for displaying the resulting draft and attaching images.

## Cache and identity

All merchant/admin private keys include Clerk user ID. The existing session-scoped `WowQueryProvider` controls QueryClient lifetime, and hooks request their Supabase client lazily through `requireWowApiSession`. Mutations have no retries. Successful mutations invalidate relevant merchant offers and admin queues; availability/decision updates also invalidate future discovery and billing cache prefixes.

## Safety

- Authorization is **only** enforced on the server by Clerk JWT claims, PostgreSQL RLS and secure RPCs; the Admin app is not itself an access control boundary.
- Do not expose `offer_media.storage_key` as a public URL. Public approved image delivery is a separate Migration 008 RPC/Storage workflow.
- `getOfferVersionDetails` returns `null` for inaccessible or missing versions and never bypasses RLS.
- Employees can only read versions allowed by Migration 010 branch-scoped authorization. This can produce an incomplete visible offer list; don't work around it with service-role credentials.
- Currency and amount fields use `OfferMoney` (`string | number`); precise calculations should operate on decimal string or a safe money library, never floating-point arithmetic for payments.
- Draft save may delete previous media references, so coordinate images with the save path.

## Local checks to run before merge

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test:query
pnpm.cmd test:integration
```

**Not live-tested** against Clerk/Supabase or Expo devices. No GitHub Actions or hosted CI; these checks run on a developer machine.
