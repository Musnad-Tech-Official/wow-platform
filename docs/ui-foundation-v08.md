# MUSNAD-WOW — V0.8 Design System Completion Candidate

**Baseline:** V0.7 theme stabilization merged to `main` in PR #23 (commit `3251039`).  
**Branch:** `feat/ui-v08-completion` based on that exact main commit.  
**Date:** 2026-11-02.

## 1. Purpose

Complete the missed V0.8 portion of the previously delivered `WOW_UI_V07_V08_COMPLETION.zip` package. This is an incremental shared design-system hardening pass, not a redesign and not a screen implementation. It leaves the approved WOW identity and customer/merchant/admin designs unchanged.

## 2. Semantic colors and visibility

The branded yellow `#FACC15` remains the filled primary background. Yellow text alone is not suitable on white. The shared token palette therefore differentiates:

- `primary` / `primaryForeground` for filled yellow controls.
- `actionForeground` and `focusRing` for textual actions, visible hover icons, selected control edges, progress and keyboard focus: light `#744A00`; dark `#FACC15`.
- `controlBorder` for high-visibility input/picker boundaries: light `#858B98`; dark `#A1A1AA`.

Light muted text uses `#5C6B80` for improved contrast on the existing Customer, Merchant and Admin canvases. Neutral surface borders remain soft. Theme CSS and JS semantic colors are kept aligned.

The existing AppButton, AppText, AppInput, ThemeSwitcher, SegmentedTabs, FilterChip, RadioFieldGroup, SwitchField, ProgressBar, SelectField, TextAreaField, AnimatedWowIcon, SectionHeader, SearchField, Card, ListRow and PageScaffold are updated without breaking public component props. Focus and user-provided event handlers are preserved.

## 3. Responsive and visual QA

`V08AcceptanceGallery` is mounted inside the existing developer-only `/design-preview` route. It shows both color palettes side by side, interactive buttons, fields, switches, selected tabs, feedback, icons, and progress, with synthetic state only. There is no backend/auth import or network/upload action. Earlier V0.6 and V0.7 preview sections are preserved.

`node scripts/test-ui-v08.cjs` checks **44 color combinations**: 24 text pairs, 8 UI indicator pairs and 12 light application-canvas combinations. The same script checks component structure, RTL contracts, layout dimensions and TS/TSX syntax. Run the complete prior and current tests with `bash scripts/verify-ui-v08.sh`.

## 4. Open-source component strategy

Retain the tested open-source foundations: `lucide-react-native` for icons, `react-native-reanimated` for reduced-motion-aware interaction, `NativeWind` for shared utility layout, and `expo-image` for approved illustrations. No new package is introduced solely to imitate animate-ui; web-only DOM components cannot be shared directly by native Expo apps. Gluestack and other component kits may be evaluated later in isolated feature-specific PRs when their compatibility is demonstrated.

## 5. Manual acceptance gate (not claimed as passed)

| Target | Checks |
| --- | --- |
| Web widths 320 / 375 / 390 / 768 / 1024 / 1440 px | No clipped labels, wrapping and scrolling as designed |
| Web Chrome / Firefox / Safari | Light / dark / system, hover, keyboard focus, modal dismissal |
| Android / iOS | RTL, font rendering, touch targets, TextInput keyboard, native modal |
| Accessibility | Screen-reader semantics, 48pt touch targets, reduced motion |

The source-level contrast calculations and syntax checks do not establish complete rendered contrast, keyboard focus return, physical device support, or production readiness. Existing Supabase RLS/Storage live tests remain a separate pre-release security gate.

## 6. Handoff and ownership

The approved design baseline is documented in `docs/design-approval-and-handoff.md`. Developers can improve shared components or add reusable components via coordinated reviewed PRs when needed by more than one page, without silently changing approved app design.

Task allocation across three developers, collaboration rules and their conversation/branch layout are **not** decided or enacted by V0.8. That strategy is the next user discussion.
