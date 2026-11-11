import { Platform, Pressable, View } from 'react-native';
import { ChevronLeft, FileText, Heart, Star } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppText } from '@wow/ui';

export interface CustomerActivitySectionProps {
  onPressComplaints: () => void;
  onPressFavorites: () => void;
  onPressRatings?: () => void;
}

export function CustomerActivitySection({
  onPressComplaints,
  onPressFavorites,
  onPressRatings,
}: CustomerActivitySectionProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  return (
    <View style={{ gap: 10, width: '100%' }}>
      {/* Section Header */}
      <AppText
        variant="heading"
        style={{
          fontSize: 16,
          fontWeight: '800',
          color: colors.foreground,
          textAlign: 'right',
          paddingHorizontal: 4,
        }}
      >
        نشاطي
      </AppText>

      {/* Rows Container */}
      <View
        {...rtlWebProps}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Row 1: My Complaints */}
        <Pressable
          {...rtlWebProps}
          onPress={onPressComplaints}
          accessibilityRole="button"
          accessibilityLabel="شكاواي ومتابعة البلاغات"
          accessibilityHint="يعرض تفاصيل مسار الشكاوى والبلاغات"
          style={({ pressed }) => ({
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: pressed
              ? isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.04)'
              : 'transparent',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} color={isDark ? '#E2E8F0' : '#334155'} strokeWidth={2} />
            </View>

            <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                شكاواي ومتابعة البلاغات
              </AppText>
              <AppText
                variant="caption"
                muted
                style={{
                  fontSize: 12,
                  textAlign: 'right',
                }}
              >
                سجل الشكاوى ومتابعة الإجراءات
              </AppText>
            </View>
          </View>

          <ChevronLeft
            size={18}
            color={isDark ? '#94A3B8' : '#64748B'}
            strokeWidth={2}
          />
        </Pressable>

        {/* Separator */}
        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />

        {/* Row 2: Saved Favorites */}
        <Pressable
          {...rtlWebProps}
          onPress={onPressFavorites}
          accessibilityRole="button"
          accessibilityLabel="العروض والمتاجر المفضلة"
          accessibilityHint="ينتقل إلى شاشة المفضلة"
          style={({ pressed }) => ({
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: pressed
              ? isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.04)'
              : 'transparent',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={18} color={wowBrandColors.yellow} strokeWidth={2} />
            </View>

            <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                العروض والمتاجر المحفوظة
              </AppText>
              <AppText
                variant="caption"
                muted
                style={{
                  fontSize: 12,
                  textAlign: 'right',
                }}
              >
                الوصول السريع إلى قائمتك المفضلة
              </AppText>
            </View>
          </View>

          <ChevronLeft
            size={18}
            color={isDark ? '#94A3B8' : '#64748B'}
            strokeWidth={2}
          />
        </Pressable>

        {/* Separator & Row 3: My Ratings (when handler provided) */}
        {onPressRatings && (
          <>
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />

            <Pressable
              {...rtlWebProps}
              onPress={onPressRatings}
              accessibilityRole="button"
              accessibilityLabel="تقييماتي للعروض"
              accessibilityHint="ينتقل إلى سجل تقييمات مطابقة العروض"
              style={({ pressed }) => ({
                minHeight: 56,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: pressed
                  ? isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)'
                  : 'transparent',
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Star size={18} color={wowBrandColors.yellow} strokeWidth={2} />
                </View>

                <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: colors.foreground,
                      textAlign: 'right',
                    }}
                  >
                    تقييماتي للعروض
                  </AppText>
                  <AppText
                    variant="caption"
                    muted
                    style={{
                      fontSize: 12,
                      textAlign: 'right',
                    }}
                  >
                    سجل تقييمات مطابقة العروض والتجربة
                  </AppText>
                </View>
              </View>

              <ChevronLeft
                size={18}
                color={isDark ? '#94A3B8' : '#64748B'}
                strokeWidth={2}
              />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
