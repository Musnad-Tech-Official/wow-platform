---
name: wow-screen-fidelity
description: Use when creating, modifying or reviewing WOW Customer, Merchant or Admin Expo/React Native screens, design components, layouts or visual behavior, especially when a reference image or approved page design is supplied.
---

# WOW screen fidelity

1. Inspect the specific approved reference image or screen specification and the relevant `docs/design-system.md` rules. If the required image is unavailable, ask for it or state the limitation; do not invent a replacement design and claim it is approved.
2. Inspect existing `@wow/ui`, `@wow/theme` and `@wow/assets` APIs before implementing. Reuse established patterns; add only components actually needed. Use Expo Router routes and React Native primitives compatible with Expo SDK 57 and native/web.
3. Match the reference's screen sections, hierarchy, proportions, spacing, colors, icon semantics and typography. Arabic RTL and Tajawal are required; distinguish functional states and ensure minimum 48pt touch targets.
4. Implement explicit loading, empty, failed and unauthorized states as applicable. Do not imply backend success before confirmation; mock data is permitted only when clearly labeled as a development fixture.
5. Verify existing screen code using targeted typecheck/lint/tests. Where a visual renderer is available, compare screenshot to reference at representative mobile and web widths, light/dark and RTL. Otherwise mark visual/device QA as **not performed**, never as passed.
6. Report changed files, reference used, behavior implemented, tested commands/results and unresolved visual checks. Do not modify unrelated app shells or shared APIs.
