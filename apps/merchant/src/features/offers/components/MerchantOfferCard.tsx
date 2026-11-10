import React from 'react';
import { View, Pressable, Image } from 'react-native';
import {
  MoreVertical,
  Eye,
  Tag,
  Headphones,
  Smartphone,
  Footprints,
  Briefcase,
} from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';

export type OfferCardStatus = 'visible' | 'pending' | 'needs_changes' | 'draft' | 'expired' | 'paused';

export interface MerchantOfferItem {
  id: string;
  code: string;
  title: string;
  category: string;
  status: OfferCardStatus;
  finalPrice: string;
  originalPrice?: string | null;
  currency?: string;
  metaText: string;
  footerNote: string;
  viewsCount?: number;
  iconType?: 'headphones' | 'phone' | 'shoes' | 'bag' | 'general';
  imageUrl?: string | null;
  updatedAt?: string;
}

export interface MerchantOfferCardProps {
  offer: MerchantOfferItem;
  onPrimaryAction?: (offer: MerchantOfferItem) => void;
  onViewDetails?: (offer: MerchantOfferItem) => void;
  onMenuPress?: (offer: MerchantOfferItem) => void;
}

export function MerchantOfferCard({
  offer,
  onPrimaryAction,
  onViewDetails,
  onMenuPress,
}: MerchantOfferCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const renderIcon = () => {
    const size = 32;
    const color = isDark ? '#A1A1AA' : '#475569';
    switch (offer.iconType) {
      case 'headphones':
        return <Headphones size={size} color={color} strokeWidth={1.5} />;
      case 'phone':
        return <Smartphone size={size} color={color} strokeWidth={1.5} />;
      case 'shoes':
        return <Footprints size={size} color={color} strokeWidth={1.5} />;
      case 'bag':
        return <Briefcase size={size} color={color} strokeWidth={1.5} />;
      default:
        return <Tag size={size} color={color} strokeWidth={1.5} />;
    }
  };

  const statusConfig = {
    visible: {
      badgeText: '• مفعّل',
      badgeBg: isDark ? '#064E3B' : '#ECFDF5',
      badgeColor: '#059669',
      primaryBtnText: 'إيقاف مؤقتًا',
      primaryBtnBg: '#FACC15',
      primaryBtnTextColor: '#0F172D',
    },
    pending: {
      badgeText: 'قيد مراجعة الإدارة',
      badgeBg: isDark ? '#422006' : '#FEF3C7',
      badgeColor: '#D97706',
      primaryBtnText: 'متابعة الحالة',
      primaryBtnBg: isDark ? '#27272A' : '#FEF3C7',
      primaryBtnTextColor: '#92400E',
    },
    needs_changes: {
      badgeText: '! يحتاج تعديل',
      badgeBg: isDark ? '#451B20' : '#FFF1F2',
      badgeColor: '#E11D48',
      primaryBtnText: 'عرض الحالة',
      primaryBtnBg: '#FACC15',
      primaryBtnTextColor: '#0F172D',
    },
    draft: {
      badgeText: 'مسودة',
      badgeBg: isDark ? '#1E293B' : '#EFF6FF',
      badgeColor: '#2563EB',
      primaryBtnText: 'عرض المسودة',
      primaryBtnBg: '#FACC15',
      primaryBtnTextColor: '#0F172D',
    },
    expired: {
      badgeText: 'منتهي',
      badgeBg: isDark ? '#27272A' : '#F1F5F9',
      badgeColor: '#64748B',
      primaryBtnText: 'عرض الحالة',
      primaryBtnBg: '#FACC15',
      primaryBtnTextColor: '#0F172D',
    },
    paused: {
      badgeText: 'متوقف مؤقتًا',
      badgeBg: isDark ? '#27272A' : '#F1F5F9',
      badgeColor: '#64748B',
      primaryBtnText: 'تفعيل العرض',
      primaryBtnBg: '#FACC15',
      primaryBtnTextColor: '#0F172D',
    },
  }[offer.status];

  return (
    <View
      className="w-full rounded-2xl border p-4 mb-3 gap-3.5"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
    >
      {/* Top Section: Details & Thumbnail */}
      <View className="flex-row items-start justify-between gap-3">
        {/* Thumbnail on left in RTL */}
        <View
          className="w-16 h-16 rounded-2xl items-center justify-center overflow-hidden shrink-0"
          style={{
            backgroundColor: isDark ? '#27272A' : '#F8FAFC',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {offer.imageUrl ? (
            <Image
              source={{ uri: offer.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            renderIcon()
          )}
        </View>

        {/* Text info on right in RTL */}
        <View className="flex-1 items-end gap-1">
          <AppText
            variant="heading"
            numberOfLines={2}
            className="font-tajawal-bold text-sm text-right leading-5"
          >
            {offer.title}
          </AppText>

          <AppText variant="caption" muted className="text-[11px] text-right">
            {offer.code} • {offer.category}
          </AppText>

          {/* Status Badge */}
          <View
            className="rounded-full px-2.5 py-0.5 mt-0.5"
            style={{ backgroundColor: statusConfig.badgeBg }}
          >
            <AppText
              variant="caption"
              className="font-tajawal-bold text-[11px]"
              style={{ color: statusConfig.badgeColor }}
            >
              {statusConfig.badgeText}
            </AppText>
          </View>
        </View>
      </View>

      {/* Price & Date Section */}
      <View className="items-end gap-1">
        <View className="flex-row items-baseline gap-2">
          {offer.originalPrice && (
            <AppText
              variant="caption"
              muted
              className="line-through text-xs"
              style={{ color: isDark ? '#71717A' : '#94A3B8' }}
            >
              {offer.originalPrice} {offer.currency || 'ر.ي'}
            </AppText>
          )}
          <AppText variant="heading" className="font-tajawal-bold text-lg">
            {offer.finalPrice} {offer.currency || 'ر.ي'}
          </AppText>
        </View>

        <AppText variant="caption" muted className="text-[11px]">
          {offer.metaText}
        </AppText>
      </View>

      {/* Action Buttons Row */}
      <View className="w-full flex-row items-center gap-2 pt-1 border-t border-border">
        {/* Secondary Details Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`عرض تفاصيل ${offer.title}`}
          onPress={() => onViewDetails?.(offer)}
          className="flex-1 min-h-[44px] items-center justify-center rounded-xl border active:opacity-75"
          style={{
            backgroundColor: isDark ? '#27272A' : '#FFFFFF',
            borderColor: colors.border,
          }}
        >
          <AppText variant="label" className="font-tajawal-bold text-xs">
            عرض التفاصيل
          </AppText>
        </Pressable>

        {/* Primary Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${statusConfig.primaryBtnText} ${offer.title}`}
          onPress={() => onPrimaryAction?.(offer)}
          className="flex-1 min-h-[44px] items-center justify-center rounded-xl active:opacity-85 shadow-sm"
          style={{ backgroundColor: statusConfig.primaryBtnBg }}
        >
          <AppText
            variant="label"
            className="font-tajawal-bold text-xs"
            style={{ color: statusConfig.primaryBtnTextColor }}
          >
            {statusConfig.primaryBtnText}
          </AppText>
        </Pressable>
      </View>

      {/* Footer Info & Menu */}
      <View className="w-full flex-row items-center justify-between pt-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="خيارات العرض"
          onPress={() => onMenuPress?.(offer)}
          className="w-10 h-10 items-center justify-center rounded-xl active:opacity-70"
        >
          <MoreVertical size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          {offer.viewsCount !== undefined && (
            <Eye size={12} color={isDark ? '#A1A1AA' : '#64748B'} />
          )}
          <AppText variant="caption" muted className="text-[11px]">
            {offer.footerNote}
          </AppText>
        </View>
      </View>
    </View>
  );
}
