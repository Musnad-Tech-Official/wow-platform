import { useState } from 'react';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import { useTheme, useWowColors } from '@wow/theme';

export interface FavoriteButtonProps {
  kind: 'offer' | 'business';
  targetId: string;
  isSaved?: boolean;
  onToggle?: (nextSaved: boolean) => void | Promise<void>;
  size?: number;
  variant?: 'floating' | 'inline';
  accessibilityLabel?: string;
  disabled?: boolean;
  isPending?: boolean;
  style?: StyleProp<ViewStyle>;
}

export interface FavoriteToggleOptions {
  isSaved: boolean;
  isSignedIn: boolean;
  disabled?: boolean;
  isPending?: boolean;
  onToggle?: (nextSaved: boolean) => void | Promise<void>;
  setPending?: (pending: boolean) => void;
}

export async function executeFavoriteToggle({
  isSaved,
  isSignedIn,
  disabled = false,
  isPending = false,
  onToggle,
  setPending,
}: FavoriteToggleOptions): Promise<boolean> {
  if (disabled || isPending || !isSignedIn) {
    return false;
  }

  try {
    setPending?.(true);
    await onToggle?.(!isSaved);
    return true;
  } catch {
    // Catch mutation rejection safely to prevent unhandled promise rejections
    return false;
  } finally {
    setPending?.(false);
  }
}

export function FavoriteButton({
  isSaved = true,
  onToggle,
  size = 36,
  variant = 'floating',
  accessibilityLabel,
  disabled = false,
  isPending: externalPending = false,
  style,
}: FavoriteButtonProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isSignedIn } = useAuth();

  const [localPending, setLocalPending] = useState(false);
  const isPending = externalPending || localPending;

  async function handlePress() {
    await executeFavoriteToggle({
      isSaved,
      isSignedIn: Boolean(isSignedIn),
      disabled,
      isPending,
      onToggle,
      setPending: setLocalPending,
    });
  }

  const defaultLabel = isSaved ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة';
  const iconSize = Math.max(18, Math.round(size * 0.52));

  if (variant === 'inline') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? defaultLabel}
        accessibilityState={{ selected: isSaved, disabled: disabled || isPending }}
        disabled={disabled || isPending}
        onPress={handlePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          {
            minWidth: 48,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#FACC15" />
        ) : (
          <Heart
            size={iconSize}
            color={isSaved ? (isDark ? '#FACC15' : '#CA8A04') : colors.mutedForeground}
            fill={isSaved ? (isDark ? '#FACC15' : '#FACC15') : 'none'}
            strokeWidth={2}
          />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? defaultLabel}
      accessibilityState={{ selected: isSaved, disabled: disabled || isPending }}
      disabled={disabled || isPending}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        {
          width: size,
          height: size,
          minWidth: 36,
          minHeight: 36,
          borderRadius: size / 2,
          backgroundColor: isDark ? 'rgba(32, 32, 36, 0.92)' : 'rgba(255, 255, 255, 0.96)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
    >
      {isPending ? (
        <ActivityIndicator size="small" color="#FACC15" />
      ) : (
        <Heart
          size={iconSize}
          color={isSaved ? (isDark ? '#FACC15' : '#B45309') : colors.mutedForeground}
          fill={isSaved ? '#FACC15' : 'none'}
          strokeWidth={2}
        />
      )}
    </Pressable>
  );
}

