# @wow/ui

Shared React Native components styled with NativeWind and `@wow/theme` tokens.
Wrap your app in `ThemeProvider`, load `wowFonts`, and import the shared theme CSS
in the app's NativeWind stylesheet, as the workspace apps already do.

```tsx
import { useState } from 'react';
import { AppButton, AppInput, AppText, Badge, Card, Checkbox, Divider } from '@wow/ui';

export function ProfileForm() {
  const [name, setName] = useState('');
  const [notifications, setNotifications] = useState(false);

  return (
    <Card>
      <AppText variant="heading">Profile</AppText>
      <Badge label="Customer" />
      <AppInput label="Name" value={name} onChangeText={setName} />
      <Divider />
      <Checkbox label="Enable notifications" checked={notifications} onCheckedChange={setNotifications} />
      <AppButton title="Save" size="md" onPress={() => { /* Save profile */ }} />
    </Card>
  );
}
```

| Component | Options |
| --- | --- |
| `AppText` | `variant`: title, heading, body (default), label, caption; `muted` |
| `AppButton` | `title`; `variant`: primary (default), secondary; `size`: sm, md, lg (default); `loading`, `disabled` |
| `AppInput` | Native TextInput props plus `label`, `hint`, `error`, `containerClassName` |
| `Card` | Native View props; padded surface with border |
| `Badge` | `label`; `variant`: primary (default), secondary |
| `Divider` | `orientation`: horizontal (default), vertical |
| `IconButton` | Required `accessibilityLabel` and icon children; native Pressable props |
| `Checkbox` | Required `label`, controlled `checked`, and `onCheckedChange`; `disabled` |

All components accept `className` and native props, including refs. `AppInput`
applies `className` to the input and `containerClassName` to the enclosing view.
An error takes precedence over hint text. Buttons are disabled while loading.
Shared components default to RTL on native and web: rows start on the right,
labels and inputs align right, and text uses RTL writing direction. Buttons keep
centered labels. Pass native `style` props to override text alignment or writing
direction for fields such as email addresses. Pressable style callbacks remain
supported.

All three apps configure `expo-localization` with `supportsRTL: true`,
`forcesRTL: true`, and `supportedLocales: ["ar", "en"]`. Rebuild the native apps
for these plugin settings to take effect. Their root views also declare RTL for
web. Use `flex-row` and logical start/end alignment and spacing in consumers;
manual `flex-row-reverse` workarounds would reverse an RTL row a second time.

The existing `ThemeSwitcher`, `AnimatedBell`, and `AnimatedHeart` remain available.

Run `pnpm --filter @wow/ui exec tsc --noEmit` to check the package.
