import { type DimensionValue, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';

export interface UnavailableFavoriteCardProps {
  id: string;
  kind: 'offer' | 'business';
  cardWidth: DimensionValue;
  onRemove: () => void;
  isRemoving?: boolean;
}

export function UnavailableFavoriteCard({
  kind,
  cardWidth,
  onRemove,
  isRemoving = false,
}: UnavailableFavoriteCardProps) {
  const colors = useWowColors();

  const title = kind === 'offer' ? 'عرض غير متوفر حالياً' : 'متجر غير متوفر حالياً';
  const description = 'تمت إزالة هذا العنصر من العرض العام أو انتهت صلاحيته.';

  return (
    <View
      style={{
        width: cardWidth,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        padding: 12,
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 180,
      }}
    >
      <View style={{ gap: 8, alignItems: 'center', paddingTop: 8 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.neutralSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertCircle size={22} color={colors.mutedForeground} strokeWidth={1.8} />
        </View>

        <AppText
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: colors.foreground,
            textAlign: 'center',
          }}
        >
          {title}
        </AppText>

        <AppText
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
            textAlign: 'center',
            lineHeight: 18,
          }}
        >
          {description}
        </AppText>
      </View>

      <AppButton
        title={isRemoving ? 'جارٍ الإزالة...' : 'إزالة من المفضلة'}
        variant="outline"
        size="sm"
        disabled={isRemoving}
        onPress={onRemove}
        style={{ minHeight: 40, borderRadius: 10 }}
      />
    </View>
  );
}
