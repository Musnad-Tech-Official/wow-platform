import { View } from 'react-native';
import { Search } from 'lucide-react-native';
import { AppText } from '@wow/ui';

export interface OnboardingHeroDiscoveryProps {
  isDark?: boolean;
  isDesktop?: boolean;
}

export function OnboardingHeroDiscovery({ isDark = false, isDesktop = false }: OnboardingHeroDiscoveryProps) {
  const cardMaxWidth = isDesktop ? 330 : 284;

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        width: '100%',
      }}
    >
      {/* 1. Discovery Preview Phone/Card Frame */}
      <View
        style={{
          width: '100%',
          maxWidth: cardMaxWidth,
          borderRadius: 24,
          backgroundColor: isDark ? '#1A2333' : '#FEF9C3',
          borderWidth: 2,
          borderColor: isDark ? 'rgba(250, 204, 21, 0.4)' : '#FDE047',
          padding: 14,
          gap: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 5,
        }}
      >
        {/* Mock Search Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 38,
            gap: 8,
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#CBD5E1',
          }}
        >
          <Search size={16} color={isDark ? '#94A3B8' : '#64748B'} />
          <AppText
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: isDark ? '#94A3B8' : '#475569',
              flex: 1,
            }}
          >
            ابحث عن تاجر أو عرض...
          </AppText>
        </View>

        {/* Mock Category Chips */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: '#FACC15',
            }}
          >
            <AppText style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
              الكل
            </AppText>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDark ? '#475569' : '#CBD5E1',
            }}
          >
            <AppText style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155' }}>
              مطاعم وكافيهات
            </AppText>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDark ? '#475569' : '#CBD5E1',
            }}
          >
            <AppText style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155' }}>
              أزياء
            </AppText>
          </View>
        </View>

        {/* Mock Merchant Card */}
        <View
          style={{
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: isDark ? '#475569' : '#CBD5E1',
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A' }}>
              بطاقة تاجر
            </AppText>
            <AppText style={{ fontSize: 11, fontWeight: '900', color: isDark ? '#64748B' : '#94A3B8', letterSpacing: 1 }}>
              WOW
            </AppText>
          </View>
          <AppText style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#CBD5E1' : '#475569' }}>
            عروض منشورة
          </AppText>
          {/* Skeleton lines */}
          <View style={{ width: '60%', height: 6, borderRadius: 3, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
        </View>

        {/* Mock Offer Card */}
        <View
          style={{
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: isDark ? '#475569' : '#CBD5E1',
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A' }}>
              تفاصيل عرض
            </AppText>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(250, 204, 21, 0.25)' : '#FEF9C3',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 11, fontWeight: '900', color: isDark ? '#FACC15' : '#D97706' }}>%</AppText>
            </View>
          </View>
          <AppText style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#CBD5E1' : '#475569' }}>
            شروط - أسعار - فروع
          </AppText>
        </View>
      </View>
    </View>
  );
}