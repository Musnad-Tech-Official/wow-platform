# MUSNAD-WOW — CUS-02 Search & Results

**Version:** 1.0 — Approved structural baseline  
**Workstream:** W01 — Customer Discovery  
**Platform:** Customer application (`apps/customer`)  
**Status:** Layout and interaction structure approved; implementation pending  
**Document purpose:** Single source of truth for implementing CUS-02 in Antigravity / Codex. **This is a structural wireframe, not an image or a replacement brand design.**

## 1. Decision and non-negotiable context

CUS-01 was revised and approved with a **compact search icon at the upper-left of the home header**. The earlier design for CUS-02 with a large home-page search field is obsolete and must **not** be implemented.

1. Tapping the existing CUS-01 search icon **navigates immediately to a dedicated full-screen CUS-02 search/results route**. Do not open the old `SearchSheet` first.
2. The CUS-02 screen itself has a prominent, focused search input, below a compact navigation header. This is **not** a return to placing a large search field on CUS-01.
3. Preserve the approved WOW design system: original logo/assets, yellow/citrine accents, Tajawal, Arabic-first RTL, light/dark themes, existing tokens and component library.
4. Do **not** reconstruct the obsolete CUS-02 design in the older UI reference PDF, and do **not** use a freshly generated UI illustration as the source of truth.
5. Mobile and responsive web share an Expo / React Native codebase. They have **distinct responsive layouts**, not a 480px-wide phone mock-up centered on desktop.
6. Do not invent geographic options, ratings, sponsorship status, extra offer content, prices, saved/favorite success, or unavailable APIs.

## 2. Page information architecture — exact reading order

### Mobile (320–599px): vertical, one-column screen

```text
+------------------------------------------------------+
| [ CUS-02 page title: "البحث والاستكشاف" ]  [ Back ]   |  01 compact header / RTL
+------------------------------------------------------+
| [ clear × ] [ ابحث عن تاجر أو عرض... ] [ search icon ] |  02 full-width search field
+------------------------------------------------------+
|                  التصنيفات                           |  03 section label
| [ additional chips  <--- horizontal scroll  ] [ الكل ]|     real categories, RTL rail
+------------------------------------------------------+
| [ Sort: الأحدث v ]                 [ نتائج البحث ]     |  04 result heading / sort
|                              [ N تاجر ]             |
+------------------------------------------------------+
| +--------------------------------------------------+ |
| | [ IMAGE ]   [ Merchant name (right-aligned RTL) ] | |
| | [ IMAGE ]   [ Actual category ]                  | |  05 full-width horizontal
| | [ IMAGE ]   [ N eligible offers ]                | |     merchant/result card
| |             [ Actual offer title and price ]      | |
| |--------------------------------------------------| |
| | [ View details ]         [ prev | 01 / 02 | next ]| |     offer preview carousel
| +--------------------------------------------------+ |
| +--------------------------------------------------+ |
| | [ IMAGE ]          [ Next merchant / offer ]      | |
| +--------------------------------------------------+ |
+------------------------------------------------------+
|                [ تحميل المزيد ]                      |  06 pagination when needed
+------------------------------------------------------+
```

This diagram is **semantic only**, not an exact pixel rendering. Actual RTL mirroring, accessible ordering, and text alignment must be correct on Android, iOS and web. Do not replicate the ASCII as left-to-right UI.

### Tablet (600–1023px)

- Header and search field remain at the top.
- Categories remain visible as horizontally scrollable chips or a natural wrapping row where space permits.
- Results use **two columns** of readable cards; avoid narrow clipped text and controls.
- Sorting stays adjacent to the results heading. Do not introduce an invented region dropdown.

### Desktop web (1024px and up)

```text
+--------------------------------------------------------------------------+
| [ Page title / back ]                                                     |
| [                 WIDE SEARCH FIELD                                     ] |
+--------------------------------------------------------------------------+
| RESULTS AREA (flexible)                       | FILTER SIDEBAR            |
| Results heading + total + sort               | التصنيفات                 |
| +------------------+ +-------------------+   | [ الكل ] [ categories ]  |
| | Merchant card A  | | Merchant card B   |   | الترتيب                  |
| +------------------+ +-------------------+   | [ الأحدث v ]             |
| +------------------+ +-------------------+   | منطقة: not available    |
| | Merchant card C  | | Merchant card D   |   | until verified backend  |
| +------------------+ +-------------------+   |                          |
| [ Load more when applicable ]               |                          |
+--------------------------------------------------------------------------+
```

- Layout is RTL: **filter sidebar is on the logical right**, results occupy the remaining width. The ASCII column placement is illustrative, not a forced LTR style.
- Results are a **two-column grid** in the desktop results area, with a comfortable maximum content width and no enormous cards or unbounded stretching.
- Reuse the same data, controls, query state and card model across mobile/tablet/desktop; adapt only layout and affordance placement.
- Avoid duplicate category/sort controls appearing in both sidebar and results at the same viewport.

## 3. Component-by-component requirements

### 01 — Compact header

- Arabic title: **البحث والاستكشاف**.
- A clearly accessible **back** button positioned according to RTL navigation convention; returns to CUS-01 without resetting unrelated home state.
- No welcome/mascot hero, sponsored card, or redundant full home header on this route.
- Use safe-area insets and maintain the approved typography and tap targets (minimum 48pt where the project requires it).

### 02 — Search field

- Placeholder: **ابحث عن تاجر أو عرض...**.
- An inline search icon and a clear-input `×` affordance (only when input is non-empty).
- On arriving via the home search icon, make the input ready for typing and focus it when platform/keyboard behavior permits; never cause layout overlap with the software keyboard.
- Search is applied to the public API using a trimmed query; empty input means browsing all currently discoverable businesses, **not** a fabricated suggestion feed.
- Debounce typing appropriately (roughly 300–400ms) and avoid unnecessary in-flight requests; keyboard submit works.
- Limit or validate query length against the existing public API contract (maximum 100 characters).

### 03 — Category rail / panel

- Arabic section label: **التصنيفات**.
- A persistent **الكل** chip maps to `categoryId: null`.
- Category IDs must come from `usePublicCategories()` as real UUIDs; use actual Arabic category names.
- Mobile chips scroll horizontally in natural RTL order without clipping or page-level horizontal overflow; show an appropriate overflow hint only if it is genuinely helpful.
- Desktop categories move into the sidebar; do not duplicate them in the content region.
- Selected state uses approved yellow accent and adequate light/dark contrast.
- Category and query filters work together. Changing a category updates results and resets pagination.

### 04 — Result heading, count and sorting

- Heading: **نتائج البحث**.
- Count is computed from the actual API `total`, not from the number of currently loaded cards. Use **تاجر / تجار** labeling appropriately, or a neutral result-count phrasing if grammatical inflection is uncertain.
- Sorting dropdown (API-supported only):
  - **الأحدث** -> `recent` (default)
  - **أعلى خصم** -> `discount`
  - **الاسم** -> `name`
- Sorting changes reset pagination and should never shuffle only the visible page while claiming global ordering.
- A clear reset-filters action is available when filters are active.

### 05 — Search result / merchant cards

- **Mobile:** one full-width, landscape-oriented card per merchant. Do **not** copy CUS-01's narrow two-column mobile card layout.
- **Tablet/desktop:** responsive two-column results grid, still with usable landscape card composition.
- Suggested contents, in priority order:
  1. Authentic eligible offer image; if missing, the approved WOW visual fallback — no fake merchant photography.
  2. Business name, real category name if present.
  3. Actual `offer_count` from public search (the response may contain only a *preview subset* of offers).
  4. Current preview offer title and price if available; format with authentic currency.
  5. Clear, separate action to open merchant details, and an offer-specific action where applicable.
  6. If more than one offer preview exists, prev/next carousel controls and readable isolated LTR counter such as `01 / 02`.
- Do not invent ratings, location, discounts, or offer terms missing from the public API.
- Do not treat a merchant ID as an offer ID when the offer list is empty.
- Use genuine offer UUIDs for offer interactions and a genuine merchant UUID for merchant interactions.
- Reuse approved visual patterns, `@wow/ui` components, `@wow/theme` tokens and existing authorized `OfferMediaImage` / media helpers where they fit; refactor/reuse instead of copying code unnecessarily.

### 06 — Pagination

- The public search RPC supports `limit` and `offset`. Use a bounded page size, such as **20**.
- **تحميل المزيد** only appears when more results remain according to API `total`.
- Preserve existing results during incremental loading; avoid duplicate cards when fetching additional pages.
- Any changed query/category/sort resets offset and the loaded collection.
- API errors while loading more must offer retry without silently discarding already loaded results.

## 4. States and expected messages

| State | Behavior | Arabic copy (suggested) |
| --- | --- | --- |
| First search load | Approved skeleton or compact progress placeholder; avoid empty flash | **جاري البحث عن العروض...** |
| No merchants published | Honest no-data state; optional retry | **لا توجد عروض منشورة حاليًا** |
| Search or filters yield no match | Explain and provide clear reset | **لا توجد نتائج مطابقة** / **جرّب تغيير كلمات البحث أو التصنيف** |
| API/network failure | Neutral error panel with functioning retry | **تعذّر تحميل نتائج البحث** / **إعادة المحاولة** |
| Unavailable offer | No invented details and no false success | **هذا العرض غير متاح حاليًا** |
| Missing/expired media | Approved placeholder; no leaked private path | No fake image |
| Changing filters | Keep UI stable; prevent stale data from being presented as current results | Small loading indication |

Treat category-loading errors distinctly where needed. Avoid showing an empty-state message when an actual error occurred.

## 5. Navigation contract

```text
CUS-01 Home
  -> tap existing upper-left search icon
  -> /discover (CUS-02 dedicated route)
  -> typing / category / sorting / pagination
  -> merchant details: CUS-03 (when a real route exists)
  -> offer details: CUS-04 (when a real route exists)
  -> back -> CUS-01 Home
```

- Implement or reuse `apps/customer/src/app/discover/index.tsx` and a screen component under `apps/customer/src/features/discovery/`; match the actual repository routes.
- Update the existing CUS-01 search icon navigation; avoid retaining the obsolete modal as the click destination.
- The CUS-02 screen should not claim CUS-03/CUS-04 have been built. If their destination routes do not yet exist, use a truthful temporarily unavailable action or a shared existing **public offer preview**, and document the dependency. Do not create misleading placeholder detail pages as if completed.
- On web, the route is addressable and browser-back behavior works; use Expo Router conventions.
- No region filter should be presented as operational until a trusted public region directory exists. Sponsorships are out of scope for CUS-02.

## 6. Backend, privacy and security constraints

- Reuse `@wow/api`: `usePublicCategories()`, `usePublicSearchBusinesses({query, categoryId, sort, limit, offset})`, and public detail hooks only when appropriate.
- Use only the established anonymous Supabase public client and audited public RPCs. Guests must search without Clerk sign-in.
- Search results are grouped **by business**, not an unrestricted list of raw offers. The `offers` field contains up to three eligible previews per business; `offer_count` is the total eligible count.
- Use authorized, short-lived media signing via existing APIs; do not expose private Storage keys as public URLs, or persist signed URLs indefinitely.
- No direct reads from protected tables. No production data writes, schema migrations, new RPCs, invented secrets or fake seed data.
- Errors, unavailable offers and zero-data states must be honest; no production fallback to design mock data.

## 7. Responsive / UI standards

- Use existing `useWowViewport` / `wowResponsiveTokens` or equivalent established responsive conventions; do not create a separate frontend.
- Design breakpoint targets: **320–599px** mobile single-column; **600–1023px** tablet two-column; **1024px+** desktop with logical-right filter sidebar and two-column results.
- Verify at **320, 375, 430, 768, 1024 and 1440px**; ensure content does not overflow horizontally, touch targets remain accessible, and no content is clipped by safe areas or keyboard.
- Maintain Arabic RTL, Tajawal font, semantic text contrast, theme toggling, and support for mouse, keyboard, touchscreen and screen readers.
- Reuse WOW cards/inputs/chips/icons/assets rather than introducing a new visual identity, new UI library or component gallery.
- Do not impose the CUS-01 `maxWidth: 480` phone-only canvas on the desktop CUS-02 route.

## 8. Implementation boundaries / expected files

Possible integration points; inspect actual code and adapt as necessary:

- `apps/customer/src/app/index.tsx` — home route; keep intact except necessary navigation wiring.
- `apps/customer/src/features/home/HomeHeader.tsx` / `CustomerHomeScreen.tsx` — update search action to navigate instead of opening `SearchSheet`.
- `apps/customer/src/app/discover/index.tsx` — search route (new if absent).
- `apps/customer/src/features/discovery/` — new CUS-02 screen, typed presentation cards, query logic, small reusable controls.
- `apps/customer/src/features/home/CategoryFilters.tsx`, `OfferMediaImage.tsx`, `home-data.ts` — reuse existing contracts where sensible; avoid breaking CUS-01.
- `packages/api/src/query/hooks/use-discovery.ts` — existing API; prefer **no API modifications** unless demonstrably required and documented.

**Do not** implement CUS-03, CUS-04, CUS-05, favorites or sponsorship in this task. Do not overwrite changes from other developers.

## 9. Definition of done / acceptance checklist

- [ ] The search icon in CUS-01 opens a dedicated CUS-02 route directly (no interim bottom sheet).
- [ ] Search input is accessible, focused safely, debounced, clearable and wired to real public data.
- [ ] Category chips use backend UUIDs; `الكل` means no filter.
- [ ] Sorting maps exactly to recent / discount / name.
- [ ] Result count uses the public API total; cards use real authorized content only.
- [ ] Mobile results are one-column horizontal merchant cards with optional authentic offer preview carousel.
- [ ] Tablet and desktop layouts use the approved responsive structure, including desktop-side filters.
- [ ] Pagination loads more with no duplicates and resets correctly on query changes.
- [ ] Loading, empty, error and unavailable states are distinct and functional.
- [ ] CUS-01's approved visual layout is otherwise unchanged.
- [ ] Guests can search without authentication and restricted table reads are absent.
- [ ] Light/dark/RTL, keyboard, accessibility and viewport smoke checks performed.
- [ ] No secrets or production mutations; no fake sponsored offers or geographic filters.
- [ ] Typecheck, lint, relevant query/integration/UI tests pass; new tests cover search behavior and result paging.
- [ ] Capture screenshots for 375px light/dark and 1440px desktop (plus 320/430/768/1024 responsiveness); compare with this structure and report deviations.

## 10. Review and handoff format

The implementation agent should finish with:

1. **Design fidelity checklist**, mapped to Sections 2–4.
2. **Changed files**, with brief reasons.
3. **Evidence of backend contract correctness** and security boundaries.
4. **Tests:** exact commands, pass/fail/skip, actual exit status.
5. **Screenshot paths** for mobile light/dark and desktop (screenshots should come from the running app, not generated illustrations).
6. **Open dependencies** such as CUS-03/CUS-04 and geographic directory.
7. **Git status**. Stop **without commit, push or merge** until user review.

---

**Priority rule:** User-approved CUS-02 structural decisions in this document take precedence over the obsolete CUS-02 PDF layout. Existing brand identity and data/security contracts remain authoritative and may not be overridden by layout instructions.

