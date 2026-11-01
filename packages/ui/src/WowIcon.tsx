import type { ComponentProps } from 'react';
import {
  AlertCircle, ArrowLeft, Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Eye, FileText, Filter, Heart, Info, LayoutDashboard, MapPin, Menu,
  Plus, Search, Settings, Share2, ShieldCheck, Star, Store, Trash2, Upload,
  UserRound, Users, X,
} from 'lucide-react-native';
import { useWowColors } from '@wow/theme';

/** SVG registry for all platforms; do not wrap Lucide SVGs in nativewind.styled(). */
export const wowIcons = {
  alert: AlertCircle, arrowBack: ArrowLeft, bell: Bell, calendar: CalendarDays,
  check: CheckCircle2, chevronBack: ChevronRight, chevronNext: ChevronLeft,
  clock: Clock3, eye: Eye, file: FileText, filter: Filter, heart: Heart,
  info: Info, dashboard: LayoutDashboard, location: MapPin, menu: Menu,
  plus: Plus, search: Search, settings: Settings, share: Share2,
  shield: ShieldCheck, star: Star, store: Store, delete: Trash2,
  upload: Upload, user: UserRound, users: Users, close: X,
} as const;
export type WowIconName = keyof typeof wowIcons;
export type WowIconProps = Omit<ComponentProps<typeof Heart>, 'ref' | 'accessible'> & {
  name: WowIconName;
  decorative?: boolean;
};

export function WowIcon({ name, decorative = true, color, size = 20, strokeWidth = 1.9, ...props }: WowIconProps) {
  const colors = useWowColors();
  const Icon = wowIcons[name] as typeof Heart;
  // React Native SVG props are forwarded to DOM on Web. In particular,
  // passing accessible={false} can trigger a React non-boolean attribute warning.
  // Parents of interactive icons own the accessible button label.
  return (
    <Icon
      {...props}
      accessibilityLabel={decorative ? undefined : (props.accessibilityLabel ?? name)}
      color={color ?? colors.foreground}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
