# MUSNAD-WOW — W01 / Customer Public Business Details
## Approved UI Structure V1.0 — Merchant Profile (Legacy visual reference: CUS-10)

**Status:** Approved implementation specification  
**Primary app:** `apps/customer` — Expo / React Native / Web  
**Feature:** W01 public business/storefront details  
**Route target:** `/business/[id]` (use the repository's typed Expo Router conventions)  
**Reference image supplied with this handoff:** `WOW_Original_Merchant_Profile_CUS10.png`  
**Related approved screens:** CUS-01 home and CUS-02 search/results, **as implemented in the latest `origin/main`**  
**Backend:** Existing `usePublicBusiness(businessId)` from `@wow/api`  
**Design language:** WOW / Beacon Card, authentic brand assets, Tajawal, Arabic-first RTL, citrine/yellow `#FACC15` accent, accessible light/dark themes.

> **Naming clarification:** The original customer design package calls the **merchant profile CUS-10** and **offer details CUS-03**. This document specifies the public merchant/business details feature **only**, not the full offer-details page. Do not confuse these IDs or relabel a dedicated offer page as a business page. W01 issue #11 groups both capabilities.

---

## 1. Binding Design Decision — Hybrid of Two Approved Concepts

### Preserve from the original CUS-10 screenshot

- A clear, large merchant cover area with the merchant identity immediately underneath/overlapping its lower edge.
- Prominent merchant name, logo/monogram fallback, and primary category.
- Strong section heading for **عروض التاجر**, followed by visible, individually actionable offer cards.
- A clearly separated **الفروع المتاحة** section with readable location information.
- Warm, rounded cards, subtle borders, and restrained WOW yellow accents.

### Improve using the new W01 proposal and current live CUS-01/CUS-02 implementation

- More compact and useful merchant hero on small phones (do **not** reproduce the original screen's excessive vertical cover height).
- Make offers the main task: merchant header, offer shortcuts, actual offers, description, and branches.
- Reuse or visually align with current CUS-02 merchant/offer cards, not the legacy unimplemented component library.
- Adaptive tablet/desktop layout using full available web width (bounded content max width 1200px), not a 480px phone canvas.
- Only functional, real, public information and actions. No mock reviews, fabricated ratings, fake offers, arbitrary locations, made-up opening hours, or placeholder navigation buttons.
- **Original screenshot is a structural/visual inspiration, not the source of truth for obsolete typography, header, colors, APIs, or navigation.** Current CUS-01/CUS-02 and repository design tokens prevail wherever inconsistent.

### Explicit exclusions

- No "Saved"/favorite toggle unless the existing project exposes a tested, authorized, persistent favorite feature. Otherwise omit it; never show an interactive fake saved state.
- No separate category filtering for a merchant's offers unless the actual public business-offer contract supports per-offer category assignment. Merchant categories can be shown as *informational chips*, not misleading offer filters.
- No region selector on this screen; show only genuine branches returned by the backend.
- No custom raw-table Supabase queries, direct private storage paths, or schema/RPC changes.
- No standalone offer detail screen in this task; connect offer selections to existing authorized detail preview and leave dedicated offer-details routing to the separately scoped feature.

---

## 2. Structural Hierarchy (Order Is Mandatory)

**All text is Arabic and right-aligned; content order is semantic RTL, irrespective of the device/system locale.** The following outline is a logical element tree, not an LTR mockup.

```text
BusinessDetailsScreen (RTL; responsive content container maxWidth 1200)
  ScreenHeader
    [RIGHT] Back action (48x48 or greater, RTL arrow) + "الملف العام للتاجر"
    [LEFT] Optional share action only if platform-safe and actually implemented
  BusinessHero
    CoverImageOrBrandFallback
    IdentityRow (at cover base / slightly overlapping)
      MerchantLogoOrBrandFallback
      MerchantName (headline; right aligned)
      PrimaryCategory + OtherCategoryTags (informational)
      ActiveOfferCount (if real)
  BusinessQuickActions
    "استعراض العروض" -> scroll/focus offers section
    "الفروع" -> scroll/focus branches section, only when branches exist
    "اتصال" -> safe telephone link, only when public contact_phone exists
  MainContent
    OffersSection "عروض التاجر" (primary content)
      OfferCount / optional supporting text (actual values only)
      PublicOfferCard[] (live offers from current business RPC)
        AuthorizedOfferMediaOrFallback
        OfferTitle
        Genuine final price + currency (when supplied)
        Genuine old price and discount only if valid
        End date/status only if true and meaningful
        "تفاصيل العرض" -> existing authorized public offer preview
    BusinessAboutSection "نبذة عن المتجر"
      Real business description; omit section if absent
    BranchesSection "الفروع المتاحة"
      BranchCard[]
        Real name, primary branch marker if true
        City + district + address as supplied
        "الاتجاهات" only with valid latitude and longitude
  ScreenState
    Loading | Invalid ID | Not found/unavailable | Error+retry
    Empty offers | Empty branches handled independently
```

**Mobile reading order:** Header → Cover & identity → Quick actions → Offers → About → Branches. On wide screens, keep the hero at top and split below it into an **offers content column on the logical LEFT** and a **merchant/branches information panel on the logical RIGHT**, preserving Arabic reading order and accessibility traversal.

---

## 3. Layout Measurements and Presentation Guidance

### 3.1 Screen header

- Current WOW app header language; approximately 56–64px high plus platform safe area as appropriate.
- Right side: arrow for **رجوع** and title **الملف العام للتاجر**. Ensure back acts on the navigator and provides a safe fallback for direct web entry (`router.canGoBack()` or corresponding repository-supported navigation).
- All interactive targets at least **48pt in each direction**. Keyboard focus and screen-reader labels required.
- Do not introduce a new global header design, bottom navigation, or floating controls unrelated to business details.

### 3.2 Merchant cover and identity

- Cover should read as the strongest visual block, but never overwhelm a 320px screen.
- Suggested target cover height: **180–210px mobile**, **220–260px tablet**, **260–320px desktop**; adjust for content, never force an entire viewport of cover.
- Corner radius around 16–20px and safe image `cover` cropping; honor aspect ratio and avoid image distortion.
- Merchant logo: roughly 56–72px mobile, 72–88px on desktop, placed at the right side of identity row/overlap and never hide the merchant name.
- Identity: `name`, primary category, other categories as space allows, optionally real active offer count. Never invent badges such as "Verified", "Open now", or review scores.
- Cover/logo must be sourced only from backend-supported public/authorized URLs. Audit `logo_url`/`cover_url` first; do not assume they are public merely because fields exist. If absent or not safely usable, show a branded neutral fallback with WOW initials or an appropriate existing icon, not an invented photograph.
- Cover fallback uses existing WOW colors/assets and stays attractive in both modes.

### 3.3 Action row

- Primary CTA: **استعراض العروض**, WOW yellow accent where contrast permits, navigates/scrolls to visible offers.
- Secondary CTA: **الفروع**, shown if `branches.length > 0`, navigates/scrolls to branches.
- Contact CTA **اتصال**, shown if the actual `contact_phone` is present and validated; use platform-appropriate `tel:` with error handling. Do not surface a phone number from a private field.
- Mobile: two actions per row if narrow, or wrap naturally; no clipped Arabic labels. All targets >=48pt.
- Do **not** create a fake favorites experience. Existing real favorites functionality, if discovered, must be verified before integrating.

### 3.4 Merchant offers (highest-priority body section)

- Heading: **عروض التاجر**; optional real count.
- Actual public offers are provided in `PublicBusinessDetails.offers[]` (`id`, `title`, `offer_kind`, `original_price`, `final_price`, `currency`, `discount_percent`, `starts_at`, `ends_at`).
- Cards: horizontal/landscape composition. Offer media at the RTL-leading side (logical right), text aligned right, simple detail CTA. Reuse appropriate components or extract narrowly scoped shared UI; avoid duplicating CUS-02 semantics without reason.
- Use real offer media by existing audited public media hooks and short-lived signed URL helpers, if authorized; otherwise use WOW fallback.
- Display final price and official currency; format Arabic/Yemeni rial only when currency is actually YER. No arbitrary exchange conversion. Show strikethrough old price only if both values are valid and old > current. Show discount only if valid and positive.
- Never fabricate descriptive text: the business-offer preview contract has no offer `description`, so do not invent one. Detailed descriptions/terms are available through `usePublicOffer` only after opening an authorized offer preview.
- Clicking an offer must open the existing permitted public offer detail preview (or a compatible extracted component), including clear loading, unavailable, and retry behavior. Do not create a dead link to an unimplemented `/offer/...` route.
- For large merchant offer lists, avoid one giant unvirtualized render; use a suitable list strategy. No server pagination unless an actual RPC contract supports it.
- A merchant with zero public offers should show **لا توجد عروض متاحة حاليًا** without displaying fictional cards.

### 3.5 Merchant description

- Heading: **نبذة عن المتجر**.
- Use only `PublicBusinessDetails.description` and render clean multiline Arabic. Omit empty content rather than filling with invented marketing copy.
- If very long, use a genuinely working **عرض المزيد / عرض أقل** expansion.

### 3.6 Branch list

- Heading **الفروع المتاحة**; real count if helpful.
- Branch info from `PublicBusinessDetails.branches[]`: `id`, `name`, `city`, `district`, `address_line`, `latitude`, `longitude`, `is_primary`.
- Display localized real values, with a subtle **الفرع الرئيسي** marker if `is_primary === true`.
- Show **الاتجاهات** only when both coordinates are finite valid numbers; open a legitimate external map destination using validated coordinates. Otherwise display the address plainly, with no disabled-looking fake directions button.
- No invented maps, locations, contact numbers or hours.
- If no public branches are returned, show an honest compact unavailable state, not seeded fixtures.

---

## 4. Responsive Breakpoints (No Phone-Sized Desktop)

| Width | Layout contract |
| --- | --- |
| 320–599px | One column, 16px horizontal padding, compact hero, scrollable offer cards, wrap actions, no horizontal overflow. |
| 600–1023px | Fluid max-width body, 20–24px gutters, larger hero; offers may use a two-column layout only if cards remain legible; otherwise retain one column. |
| >=1024px | Centered outer container max-width 1200px with fluid margins; wide hero; offers in 2/3 main region (logical left) and identity/about/branches secondary panel in 1/3 (logical right). Never force `maxWidth: 480` on the whole screen. |

At **320, 375, 430, 768, 1024, 1440** widths, test content/controls, price truncation, image aspect ratio, RTL direction, and light/dark modes. At desktop, the merchant name and key actions must remain prominent near the hero, not hidden below the sidebar.

### RTL implementation requirements

- Preserve the existing Expo application-level RTL setup, but do not depend on OS/browser locale for correct structure.
- Arabic text has explicit right alignment where needed; directional row order must be visually validated on native and web.
- Back arrow points in the correct RTL back direction (right); page buttons and image/text grouping respect RTL leading/trailing edges.
- Numeric counts and price/currency bidi isolation prevent reversal or concatenation. Offer dates use locale-aware formatting.
- Horizontal carousels and keyboard navigation respect reading direction. Do not reverse arrays merely to compensate for an unnoticed RTL container bug.

---

## 5. Backend, Routes, and Integration Contracts

### Authoritative read path

- Use `usePublicBusiness(businessId)` from `@wow/api`, which calls `wow_public_get_business` via the public anonymous Supabase client.
- `PublicBusinessDetails` supports `id`, `name`, `description`, `contact_phone`, `logo_url`, `cover_url`, `categories`, `branches`, `offers`.
- An unknown, malformed or nonpublic ID must show an unavailable/not-found state, never expose a draft business or raw backend error.
- Do not query `public.businesses`, `public.offers`, private evidence tables, raw storage paths, or alter RLS/grants.

### Navigation

- Introduce route `apps/customer/src/app/business/[id].tsx` or repository-conformant equivalent.
- From **CUS-01 home**, merchant/header press should navigate to `/business/{id}`, replacing the prior "under development" notice.
- From **CUS-02 `/discover`**, merchant name/card press should navigate to the same route.
- Preserve direct offer preview actions from CUS-01/CUS-02 and do not conflate merchant tap with offer tap.
- Support refresh and direct deep links, browser back, invalid IDs, and repeated navigation without crashing or reopening stale content.

### Public offer media and brand artwork

- Reuse `OfferMediaImage` and the existing authorized `usePublicOfferMedia`/signed URL flow when appropriate.
- Merchants' `cover_url`/`logo_url` are not automatically permission to expose private objects; inspect existing backend/frontend contract and use only a safe supported mechanism. If source is absent/inaccessible, gracefully fall back to existing WOW brand elements without network leakage.
- Maintain stable dimensions and informative accessible labels without arbitrary imagery.

### Zero new backend scope

- No SQL migration, backend schema change, production write, new RPC, paid sponsorship or private bucket configuration. If a required field is unavailable, degrade gracefully and document the limitation rather than inventing a data source.

---

## 6. Screen States and UX Quality

| State | Expected behavior |
| --- | --- |
| Loading | Appropriate skeleton/indicator while business data loads, without a blank page or layout jump. |
| Error | Arabic message **تعذّر تحميل بيانات المتجر** and working **إعادة المحاولة**; no raw backend error details. |
| Invalid ID | Clear safe not-found view; do not execute an unsafe RPC request with invalid input. |
| Not found/not public | **هذا المتجر غير متاح حاليًا** with navigation back to discovery. |
| Empty offers | Show honest empty offers panel; still render merchant identity and branches. |
| Empty branches | Compact unavailable branches state with no fake addresses. |
| Image failure | Stable branded fallback preserving layout and readable content. |
| No phone | Hide contact action entirely. |
| Deep link | Can load directly in web/native and return safely without a prior navigation stack. |

Accessibility: semantic headings, 48pt interactive targets, meaningful image labels, keyboard/focus handling, no inaccessible color-only states, dark-mode contrast consistent with existing WOW design-system tests.

---

## 7. Minimum Automated and Visual Acceptance Criteria

1. `origin/main` synced; feature branch created safely; latest current CUS-01/CUS-02 functionality preserved.
2. Customer home merchant press and search-results merchant press navigate to the correct public business ID route.
3. Guest browser can fetch a permitted business via `usePublicBusiness` without Clerk sign-in.
4. No fabricated content or unauthorized private data; not-found and error states are distinct.
5. Offer previews use authorized media, actual prices, and a functional `usePublicOffer` detail path.
6. Branch directions only when valid coordinates; contact only when phone is actually available.
7. RTL works in mobile/native/web regardless of device language; current light/dark/system theme conventions retained.
8. Responsive layouts verified at 320, 375, 430, 768, 1024, 1440 (at least light and dark); provide genuine app screenshots, positive data and empty/error states where possible.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test:query`, `pnpm test:customer-discovery`, applicable UI/integration scripts, and new feature-focused tests pass. If Docker/local Supabase is disabled, **do not start it or claim live RLS verified**; report skips clearly.
10. Visual comparison is made with both the supplied original CUS-10 reference image (hero/identity/branches) and the latest approved CUS-01/CUS-02 look and feel (tokens, icons, cards, spacing).
11. Git changes restricted to W01 business details, related navigation, appropriate tests and documentation. No generated artifacts or unrelated `apps/customer/.gitignore` added unintentionally.
12. Any PR contains the verified summary, tests, unverified checks, screenshots/locations, and `Part of #11`.

---

## 8. Suggested Architecture (Adapt to Actual Repository)

```text
apps/customer/src/app/business/[id].tsx             # Expo Router route
apps/customer/src/features/business/
  CustomerBusinessDetailsScreen.tsx                  # Fetch + state handling + layout
  BusinessHero.tsx                                   # Cover / identity / fallback
  PublicBusinessOfferCard.tsx                        # Authorized public offer item
  BusinessBranchCard.tsx                             # Valid branch directions only
  business-display.ts                               # Pure labels / money / validation
scripts/test-customer-business-details.cjs           # Focused tests (or extend existing suite)
docs/ui/WOW_W01_BUSINESS_DETAILS_CUS10_STRUCTURE_V1.md
```

These filenames are guidance, not justification for unnecessary wrappers. Prefer existing WOW components. Test actual screen navigation and UI states, not just string presence.

---

## 9. Delivery & Git Acceptance

- The implementation agent should: inspect working tree → fetch remote → create dedicated feature branch from latest `origin/main` → implement → test → capture/inspect screenshots → review diff → stage scoped files → commit → push → open PR to `main` **as the user's personal GitHub account** when authenticated and authorized.
- Feature branch: `feat/w01-customer-business-details`.
- Proposed commit title: `feat(customer): implement public business details screen`.
- Proposed PR title: `feat(customer): implement responsive public business details screen (W01)`.
- PR body should include key UI sections, navigation changes, authorized RPC/media handling, accessibility, verification evidence, caveats and `Part of #11`.
- **Do not merge the PR automatically**. If branch creation, authentication, checks, or PR creation fails, stop and report exact blocker. Never discard prior work or claim success without evidence.
- Preserve untracked user files. Never use `git reset --hard`, `git clean`, force push, automatic stash/discard of user changes, or production DB writes.
