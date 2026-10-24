# Wow Platform 🚀

**A unified monorepo for the Wow (واو) platform.**

Wow is a platform for discovering local offers, shopping from merchants, and managing products and orders.

This repository contains three independent Expo applications and shared packages managed through **pnpm Workspaces**.

## 📋 Overview

| Application | Directory | Description |
|---|---|---|
| Customer | `apps/customer` | Customer-facing application for discovering offers, browsing products, and placing orders |
| Merchant | `apps/merchant` | Merchant application for managing stores, products, offers, and orders |
| Admin | `apps/admin` | Administration application for platform management and oversight |

All three applications live in a single Git repository but can be developed, run, and deployed independently.

## 🛠 Technology Stack

| Technology | Purpose |
|---|---|
| Expo SDK 57 | Application development framework |
| React 19.2.3 | UI framework |
| React Native 0.86.3 | Cross-platform development |
| TypeScript | Type safety |
| Expo Router | File-based navigation |
| pnpm Workspaces | Monorepo and dependency management |
| Git & GitHub | Version control and collaboration |

### Planned Technologies

The following may be introduced as development progresses:

- **NativeWind** — Utility-first styling for React Native.
- **Shared design system** — Reusable components, colors, typography, and themes.
- **Shared validation** — Reusable form and data validation schemas.
- **API integration** — Typed integration with backend services.

These are architectural plans, not a declaration that every dependency is already installed.

## 📁 Repository Structure

```text
wow-platform/
├── apps/
│   ├── customer/              # Customer Expo application
│   ├── merchant/              # Merchant Expo application
│   └── admin/                 # Admin Expo application
│
├── packages/
│   ├── ui/                    # Shared UI components
│   ├── api/                   # Shared API utilities
│   ├── utils/                 # General-purpose helpers
│   └── types/                 # Shared TypeScript types
│
├── .gitignore
├── package.json               # Root workspace configuration
├── pnpm-workspace.yaml        # Workspace definitions
└── pnpm-lock.yaml             # Shared dependency lockfile
```

### `apps/`

Contains the three independent Expo applications.

Each application maintains its own:

- Navigation and screens
- Assets and application identity
- Application configuration
- App-specific dependencies
- Business logic and features

### `packages/`

Contains reusable code shared between applications.

| Package | Import | Responsibility |
|---|---|---|
| UI | `@wow/ui` | Shared React Native UI components |
| API | `@wow/api` | API clients and request utilities |
| Utils | `@wow/utils` | Reusable helper functions |
| Types | `@wow/types` | Common TypeScript types and contracts |

These packages are internal workspace packages. They do not need to be published to npm.

---

## 🚀 Getting Started

### 1. Prerequisites

Install the following tools:

- Node.js — a version supported by the installed Expo SDK
- pnpm — compatible with the repository's lockfile
- Git
- Visual Studio Code or another preferred editor
- Android Studio / Android emulator, or an appropriate Expo-compatible physical device

**Recommended:** All developers should use the same Node.js and pnpm versions to minimize dependency differences.

### 2. Clone the Repository

```bash
git clone https://github.com/Musnad-Tech-Official/wow-platform.git
cd wow-platform
```

You must have access to the organization's private repository if it is configured as private.

### 3. Install Dependencies

Run the following command from the repository root:

```bash
pnpm install
```

pnpm automatically discovers the workspaces using `pnpm-workspace.yaml`.

**Important:** Always prefer installing workspace dependencies from the repository root.

Do not manually move or copy `node_modules` between applications.

### 4. Start an Application

**Customer**

```bash
pnpm --filter customer start
```

**Merchant**

```bash
pnpm --filter merchant start
```

**Admin**

```bash
pnpm --filter admin start
```

Each application starts its own Expo development server.

For specific platforms:

```bash
# Customer on Android
pnpm --filter customer android

# Merchant on web
pnpm --filter merchant web

# Admin on web
pnpm --filter admin web
```

The same pattern applies to the other applications.

To run multiple apps simultaneously, use separate terminal sessions and assign different Expo Metro ports where necessary.

---

## 📦 Understanding pnpm Workspaces

This project uses a single pnpm workspace that contains multiple independent packages.

The root `pnpm-workspace.yaml` defines which directories belong to the workspace:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

This allows pnpm to discover all applications and shared packages automatically.

### How Dependencies Work

With pnpm's isolated dependency layout, dependencies are managed through links and a shared virtual store.

You may see:

```text
wow-platform/
├── node_modules/
│   └── .pnpm/
├── apps/customer/node_modules/
└── packages/ui/node_modules/
```

This is normal.

Do not commit `node_modules` directories to Git.

### Workspace Dependencies

Applications reference internal packages using the `workspace:` protocol.

For example, in `apps/customer/package.json`:

```json
{
  "dependencies": {
    "@wow/ui": "workspace:*",
    "@wow/api": "workspace:*",
    "@wow/utils": "workspace:*",
    "@wow/types": "workspace:*"
  }
}
```

The `workspace:*` protocol ensures that pnpm resolves these dependencies from the local workspace rather than from the npm registry.

---

## 🧩 Working with Shared Packages

### Example: Shared UI Component

Create a component in:

`packages/ui/src/AppButton.tsx`

```tsx
import { Pressable, Text } from 'react-native';

type AppButtonProps = {
  title: string;
  onPress: () => void;
};

export function AppButton({
  title,
  onPress,
}: AppButtonProps) {
  return (
    <Pressable onPress={onPress}>
      <Text>{title}</Text>
    </Pressable>
  );
}
```

Export it from:

`packages/ui/src/index.ts`

```ts
export { AppButton } from './AppButton';
```

Now use it inside any application:

```tsx
import { AppButton } from '@wow/ui';
```

### Shared Package Rules

1. Export public APIs through the package's `src/index.ts`.
2. Import shared code through its package name, not through relative paths outside the application.
3. Declare required dependencies in each package's `package.json`.
4. Keep React and React Native versions compatible across applications and shared UI packages.
5. Avoid placing application-specific screens or navigation inside `@wow/ui`.
6. Do not introduce unnecessary circular dependencies between shared packages.

### Adding a New Shared Package

For example, to create a validation package:

```bash
mkdir -p packages/validation/src
```

Create `packages/validation/package.json`:

```json
{
  "name": "@wow/validation",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

Create `packages/validation/src/index.ts` with the intended public exports.

Install it in the customer application:

```bash
pnpm --filter customer add '@wow/validation@workspace:*'
```

You can then import its exported functions or types from `@wow/validation`.

---

## 📥 Dependency Management

### Install a Dependency in One Application

```bash
pnpm --filter customer add package-name
```

### Install a Development Dependency

```bash
pnpm --filter merchant add -D package-name
```

### Install a Dependency in a Shared Package

```bash
pnpm --filter @wow/ui add package-name
```

### Install a Shared Workspace Package

```bash
pnpm --filter customer add '@wow/ui@workspace:*'
```

### Check Installed React Versions

```bash
pnpm why -r react
pnpm why -r react-native
```

### Update the Lockfile

Run the appropriate pnpm installation command from the workspace root and commit the resulting `pnpm-lock.yaml` when dependencies change.

**Rules:**

- Use pnpm consistently.
- Do not create separate npm or Yarn lockfiles.
- Avoid incompatible React Native versions.
- Never manually edit the contents of `node_modules`.
- Do not install every dependency in the monorepo root unless it is genuinely a root-level development tool.

---

## ✅ Type Checking and Verification

Check TypeScript in each application:

```bash
pnpm --filter customer exec tsc --noEmit
pnpm --filter merchant exec tsc --noEmit
pnpm --filter admin exec tsc --noEmit
```

Check a shared package that has a TypeScript configuration:

```bash
pnpm --filter @wow/ui exec tsc --noEmit
```

Run linting in an Expo application:

```bash
pnpm --filter customer lint
```

Before opening a pull request, run the relevant checks for every application or shared package affected by the change.

> Passing TypeScript checks is not a substitute for testing an application's actual behavior on its supported platforms.

---

## 🏗 Architecture Guidelines

### Separation of Responsibilities

**Applications** should contain user-facing flows and application-specific behavior.

**Shared packages** should contain genuinely reusable functionality.

Examples:

| Feature | Recommended Location |
|---|---|
| Customer home screen | `apps/customer` |
| Merchant inventory screen | `apps/merchant` |
| Admin management screens | `apps/admin` |
| Reusable button | `packages/ui` |
| API request helper | `packages/api` |
| Price formatter | `packages/utils` |
| Product data type | `packages/types` |

### Security

Sharing code between applications does not mean sharing access permissions.

- Customer, merchant, and admin authorization must be enforced by the backend.
- Never rely on hidden UI elements as a security mechanism.
- Do not store private API secrets in client-side code.
- Do not commit credentials or local `.env` files.
- Public Expo environment variables must never contain secrets.

### Shared UI

We aim to use consistent reusable UI primitives while allowing each application to have its own navigation, screens, and experience.

Styling tools and theme packages should be added through reviewed architectural changes.

---

## 🌿 Git and Team Workflow

This repository is maintained under the **Musnad Tech** GitHub organization.

Repository:

https://github.com/Musnad-Tech-Official/wow-platform

### Branching Strategy

Use `main` for reviewed, stable changes.

Create separate feature branches for active development.

Recommended branch names:

```text
feat/customer-home
feat/merchant-products
feat/admin-dashboard
feat/shared-ui
fix/customer-navigation
chore/dependencies
```

These are recommended team conventions.

### Daily Workflow

Start by updating your local main branch:

```bash
git checkout main
git pull origin main
```

Create a feature branch:

```bash
git switch -c feat/customer-home
```

Make your changes, then commit:

```bash
git add .
git commit -m "feat(customer): implement home screen"
```

Push your feature branch:

```bash
git push -u origin feat/customer-home
```

Open a pull request targeting `main`.

### Commit Convention

We recommend Conventional Commits:

```text
feat(customer): add offers screen
feat(merchant): add product form
fix(admin): correct navigation issue
refactor(ui): simplify shared button
chore(deps): update workspace dependencies
docs: update monorepo README
```

### Pull Request Guidelines

Each pull request should:

1. Have a clear title and description.
2. Focus on one feature, fix, or closely related change.
3. Identify the affected applications and packages.
4. Pass relevant TypeScript and lint checks.
5. Include screenshots or recordings for meaningful UI changes.
6. Describe any shared-package API changes.
7. Be reviewed before merging when review requirements are enabled.

### Avoiding Team Conflicts

- Coordinate changes to shared packages.
- Keep feature branches focused.
- Review changes to the root configuration and lockfile.
- Do not force-push to shared branches.
- Keep unrelated changes out of feature pull requests.

---

## 🔧 Troubleshooting

### Cannot Find Module `@wow/ui`

Verify that:

- `packages/ui/package.json` contains `"name": "@wow/ui"`.
- `packages/ui/src/index.ts` exists.
- Its `main`, `types`, and `exports` fields point to valid files.
- The consuming app declares `"@wow/ui": "workspace:*"`.

Then run:

```bash
pnpm install
pnpm --filter customer exec tsc --noEmit
```

### Cannot Find `react/jsx-runtime`

Check that React and `@types/react` are correctly declared and installed in the package being type-checked.

Verify the appropriate TypeScript JSX configuration.

### VS Code Does Not Suggest Auto-Imports

Check that the component is exported from the shared package's entry point.

Then run:

`Ctrl + Shift + P` → `TypeScript: Restart TS Server`

VS Code should normally discover accessible exports from linked workspace packages.

### Expo Cannot Resolve a Package

Verify the workspace dependency and check for missing entry-point files.

For Expo SDK 57, standard monorepo support is already included in Expo's Metro configuration.

Do not add custom Metro workspace resolver settings unless they are specifically needed.

Clear Expo's cache if necessary:

```bash
pnpm --filter customer exec expo start --clear
```

### Installation Problems

If the npm registry times out, verify network connectivity and retry:

```bash
pnpm install
```

pnpm may reuse packages already available in its local store.

---

## 📚 Official Documentation

These are the primary references for understanding and maintaining this repository.

### Expo & React Native

- [Expo — Official Documentation](https://docs.expo.dev/)
- [Expo — Monorepos](https://docs.expo.dev/guides/monorepos/)
- [Expo — Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo — TypeScript](https://docs.expo.dev/guides/typescript/)
- [Expo — EAS Build with Monorepos](https://docs.expo.dev/build-reference/build-with-monorepos/)
- [React Native — Documentation](https://reactnative.dev/docs/getting-started)

### pnpm

- [pnpm — Workspaces](https://pnpm.io/workspaces)
- [pnpm — Filtering](https://pnpm.io/filtering)
- [pnpm — CLI](https://pnpm.io/cli/pnpm)
- [pnpm — Dependency Structure](https://pnpm.io/symlinked-node-modules-structure)

### TypeScript & React

- [TypeScript — Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript — Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [React — Documentation](https://react.dev/)

### Collaboration

- [GitHub — Pull Requests](https://docs.github.com/en/pull-requests)
- [GitHub — About Branches](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

### Future Styling Reference

- [NativeWind — Official Documentation](https://www.nativewind.dev/)

---

## 👥 Maintainers

Developed and maintained by **Musnad Tech**.

Website: https://musnadtech.com

GitHub Organization: https://github.com/Musnad-Tech-Official

---

**Wow Platform — Built together, maintained together.**