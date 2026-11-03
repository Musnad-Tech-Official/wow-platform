# WOW Public Discovery & Categories — Migration 007

This PR implements the **six public RPCs** defined in `007_public_discovery.sql` as typed `@wow/api` functions, plus six React Query hooks (four public reads, two authenticated admin writes). It does **not** change the database or authorize raw table access.

## Guest and customer reads

| React Query hook | RPC | Result |
| --- | --- | --- |
| `usePublicCategories()` | `wow_public_list_categories` | Active categories (active parent if nested), `[]` if none |
| `usePublicSearchBusinesses(options)` | `wow_public_search_businesses` | `{ total, limit, offset, items }`; up to three visible offer previews per business |
| `usePublicBusiness(businessId)` | `wow_public_get_business` | Approved business with discoverable offers and eligible branches, or `null` |
| `usePublicOffer(offerId)` | `wow_public_get_offer` | Current approved live offer details, item attributes and eligible branches, or `null` |

These calls work **without signing in to Clerk**. `createWowPublicSupabaseClient` uses only the approved public publishable/legacy anon key, never a service-role key and never a Clerk token. `useWowPublicSupabaseClient` provides a lazy accessor so the Supabase SDK object never appears directly in React props. The hooks can run inside the existing `WowQueryProvider` even for guest users; they use public RPCs, not `from('categories')`, `from('offers')`, or any other raw database table. There are no `anon` SELECT grants on those tables.

The public SDK is separate from the authenticated Clerk client used for `wow_admin_*` or Merchant RPC calls. Signed-in users can still use public discovery through the anon client; its results are deliberately identical to guest-visible results.

### Search contract

`usePublicSearchBusinesses` accepts:

- `query?: string | null` — up to 100 characters, literal case-insensitive substring search across store name, offer content and eligible branch address.
- `city?: string | null`, `district?: string | null` — exact case-insensitive names from approved branches (max 120 characters each).
- `categoryId?: string | null` — approved category UUID, matches a root or immediate child.
- `sort?: 'recent' | 'discount' | 'name'` (default `recent`).
- `limit?: number` 1–50 (default 20), `offset?: number` 0–5000 (default 0).

The backend validates these values. Results are grouped by business and only include businesses with at least one currently discoverable offer. This is **not** full-text search or GPS radius search, and it should not be presented as such.

### Public offer visibility

The SQL visibility helper checks **all** at request time: approved business and approved associated branch, active and merchant-available offer, current approved version, active offer time window, and a current subscription/trial/publication-granting agreement. Approved draft revisions remain hidden. Expiry and pauses are automatically excluded on the next read, without a cron job. Clients must not override these checks or fall back to direct SELECT.

Offer images from private Storage **are not exposed** by Migration 007; image URLs require a separate verified Migration 008 implementation. Do not fabricate public URLs from `offer_media.storage_key`.

## Admin category management

| Hook | RPC | Permission |
| --- | --- | --- |
| `useAdminUpsertCategory()` | `wow_admin_upsert_category` | Super-admin only |
| `useAdminSetBusinessCategories()` | `wow_admin_set_business_categories` | Authorized admin, excluding affiliated business members |

Category creation requires a slug and Arabic name; optional nesting is one level only. Do not auto-seed category data from client side. Approved category assignments are replaced atomically, require up to 12 active category IDs and a reviewer reason, and are audited in a private table. Merchants have no direct category-editing privilege. Both admin hooks use the **authenticated** Clerk-backed Supabase client, not the public client.

## Query caching and UI

All public cache keys use the `['discovery', ...]` prefix. Read hooks don't require `context.userId`, but are still hosted within the existing QueryClient boundary. Admin mutations invalidate discovery queries after success; offer, billing and merchant mutations from previous migrations already invalidate the same discovery prefix.

Example:

```tsx
const categories = usePublicCategories();
const list = usePublicSearchBusinesses({ city: 'Taiz', sort: 'discount', limit: 20 });
const business = usePublicBusiness(selectedBusinessId);
const offer = usePublicOffer(selectedOfferId);
```

Guest screens should avoid rendering private Merchant/Admin details. A missing or hidden business/offer legitimately returns `null`; display a normal unavailable state.

## Verification

Run locally after checking out `feat/api-discovery-categories`:

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test:query
pnpm.cmd test:integration
```

This PR adds four local tests: exact public RPC argument contracts, guest queries with no Clerk access token, admin category RPCs/cache invalidation, and malformed JSON/secret key rejection. Expected **29 Query tests**, **19 local integration guard tests**. These are not live tests; real Supabase anon grants, RLS, response projections, and production app lifecycle remain in the later integration campaign.
