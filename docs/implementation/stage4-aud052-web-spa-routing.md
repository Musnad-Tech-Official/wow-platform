# Stage 4B — AUD-052 Expo Router web deep links

## Chosen architecture

All three Expo applications now use `web.output: "single"` (SPA). They contain runtime routes with dynamic identifiers such as `/business/[id]`, `/offer/[id]` and `/complaints/[id]`; the IDs are not enumerable at build time. A static `generateStaticParams` output would either omit future resources or require a server-generated manifest. `single` produces one `index.html` plus assets and lets Expo Router resolve arbitrary known route patterns on the client.

**Hosting requirement:** Production hosting MUST serve static JS/CSS/assets normally and rewrite **non-file application route paths** (including deep links on browser reload) to `/index.html` with HTTP **200**. For example, a verified hosting configuration should treat `/offer/<uuid>` as an SPA route, while requests for missing `.js` / `.css` / images must stay 404 rather than receive HTML. Configure this history-fallback at the actual hosting provider; do not add a universal rewrite that masks missing assets. The hosting provider/target is not yet adopted, so no deployment-specific configuration is claimed.

## Runtime and authorization

The SPA change does not bypass the existing Clerk route gates, Supabase RLS or customer onboarding gate. New arbitrary dynamic URLs must still validate identifiers and handle forbidden/nonexistent resources. No server-side API route or SSR requirement has been introduced.

## Regression and remaining gate

`scripts/test-stage4-web-deep-links.cjs` checks all three production export modes and the existing dynamic route files. Run as part of `scripts/verify-ui-v08.sh`.

**NOT VERIFIED:** production-like Expo export for all three apps, deployed HTTP 200 deep link and browser reload/history/back for at least two unlisted-at-build-time UUIDs, signed-in vs guest access, unknown-resource 404 behavior, route asset caching and CDN rewrites. This must be run in the selected hosting environment before stage acceptance. Changing `web.output` is a source-level architecture fix, **not** evidence of completed web routing acceptance.

Reference: Expo SDK 58 docs `https://docs.expo.dev/guides/publishing-websites/`.
