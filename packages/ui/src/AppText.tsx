import { Text, type TextProps } from 'react-native';
import { useWowColors } from '@wow/theme';
import { rtlProps, rtlStyles } from './rtl';

const variants = {
  title: 'font-tajawal-bold text-3xl',
  heading: 'font-tajawal-bold text-xl',
  body: 'font-tajawal text-base',
  label: 'font-tajawal-medium text-sm',
  caption: 'font-tajawal text-xs',
} as const;

/** Use semantic text colors, not a default Tailwind class competing with a caller's color. */
export type WowTextTone =
  | 'default' | 'muted' | 'primary' | 'onPrimary'
  | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type AppTextProps = TextProps & {
  variant?: keyof typeof variants;
  muted?: boolean;
  tone?: WowTextTone;
};

const semanticClassTones: Record<string, WowTextTone> = {
  'text-foreground': 'default',
  'text-muted-foreground': 'muted',
  'text-primary': 'primary',
  'text-primary-foreground': 'onPrimary',
  'text-success': 'success',
  'text-warning': 'warning',
  'text-danger': 'danger',
  'text-info': 'info',
  'text-neutral': 'neutral',
};

// Preserve legacy className color overrides in existing pages, while allowing
// a first-class tone prop for all new components. Text size/align are NOT colors.
const textColorUtility = /(?:^|\s)text-(?:foreground|muted-foreground|primary|primary-foreground|success|warning|danger|info|neutral|white|black|transparent|current|inherit|[a-z][a-z-]*-(?:50|[1-9]00|950)|\[#[0-9a-fA-F]{3,8}\])(?=\s|$)/g;

function getLegacyColorClass(className: string | undefined): string | undefined {
  const matches = className?.match(textColorUtility);
  return matches?.at(-1)?.trim();
}

export function AppText({
  variant = 'body', muted = false, tone, className, style, ...props
}: AppTextProps) {
  const colors = useWowColors();
  const legacyColorClass = getLegacyColorClass(className);
  const selectedTone = tone ?? (legacyColorClass ? semanticClassTones[legacyColorClass] : undefined)
    ?? (muted ? 'muted' : 'default');
  const toneColors = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    primary: colors.primary,
    onPrimary: colors.primaryForeground,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
    neutral: colors.neutral,
  };

  // If a legacy caller explicitly requests a nonsemantic Tailwind color, let
  // NativeWind own that color. Explicit style.color retains final precedence.
  const hasExternalClassColor = Boolean(legacyColorClass && !semanticClassTones[legacyColorClass]);
  const resolvedColor = !tone && hasExternalClassColor ? undefined : toneColors[selectedTone];

  return (
    <Text
      {...rtlProps}
      {...props}
      style={[rtlStyles.text, resolvedColor ? { color: resolvedColor } : undefined, style]}
      className={`text-right ${variants[variant]} ${className ?? ''}`}
    />
  );
}
