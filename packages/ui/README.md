# @wow/ui

Shared Expo/React Native components for Customer, Merchant and Admin. Components use semantic `@wow/theme` tokens, Tajawal typography, Arabic RTL and NativeWind where appropriate.

Import from the package root: `import { AppButton, AppText, Card, DataState } from '@wow/ui'`. The source-of-truth exports and prop types are in [src/index.ts](src/index.ts). Do not deep-import internal component files.

Use existing primitives for forms, buttons, navigation rows, list and data states. Add feature-specific components near the feature first; move them into this package only when genuinely shared. Prefer semantic palette tokens over fixed colors, provide accessible labels and at least 48pt touch targets, and check light/dark/system modes.

The full visual contract is [docs/design-system.md](../../docs/design-system.md). Validate with `bash scripts/verify-ui-v08.sh` from the repo root.
