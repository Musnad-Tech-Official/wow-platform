import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, ChevronLeft } from 'lucide-react-native';
import {
  useAdminComplaints, useAdminRatings,
  type ComplaintStatus, type RatingModerationStatus,
} from '@wow/api';
import { AppText, Card, Badge, AppButton } from '@wow/ui';
import { useWowColors } from '@wow/theme';
import { W06Header, W06Message, W06Paging } from '../w06/W06Shared';
import type { AdminRole } from '../auth/admin-access';
import { RatingDecision } from './RatingDecision';

const PAGE_SIZE = 25;
const statuses: { value: ComplaintStatus | null; label: string }[] = [
  { value: null, label: 'الكل' },
  { value: 'new', label: 'جديدة' },
  { value: 'investigating', label: 'قيد التحقق' },
  { value: 'waiting', label: 'بانتظار الرد' },
  { value: 'closed', label: 'مغلقة' },
];
const moderation: { value: RatingModerationStatus | null; label: string }[] = [
  { value: null, label: 'الكل' },
  { value: 'normal', label: 'عادية' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'excluded', label: 'مستبعدة' },
];
const complaintNames: Record<ComplaintStatus, string> = {
  new: 'جديدة', investigating: 'قيد التحقق', waiting: 'بانتظار الرد', closed: 'مغلقة',
};
const ratingNames: Record<RatingModerationStatus, string> = {
  normal: 'عادية', under_review: 'قيد المراجعة', excluded: 'مستبعدة',
};
const conformityNames = {
  matches: 'مطابق', does_not_match: 'غير مطابق', could_not_verify: 'تعذر التحقق',
} as const;
const complaintTypes: Record<string, string> = {
  price_mismatch: 'اختلاف السعر', unavailable: 'غير متوفر',
  misleading_terms: 'شروط غير واضحة', product_mismatch: 'اختلاف المنتج',
  business_conduct: 'سلوك النشاط', other: 'أخرى',
};
const dateLabel = (date: string | null | undefined) => {
  if (!date) return 'تاريخ غير متاح';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'تاريخ غير متاح' :
    parsed.toLocaleDateString('ar');
};

function StatusFilter<T extends string>({ items, value, choose }: {
  items: { value: T | null; label: string }[];
  value: T | null;
  choose: (value: T | null) => void;
}) {
  const colors = useWowColors();
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable key={item.value ?? 'all'} accessibilityRole="button"
            accessibilityState={{ selected }} onPress={() => choose(item.value)}
            className="rounded-xl border px-3 py-2"
            style={{ borderColor: selected ? colors.focusRing : colors.border,
              backgroundColor: selected ? colors.warningSurface : colors.surface }}>
            <AppText className="font-tajawal-medium text-xs">{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AdminComplaintsQueue() {
  const router = useRouter();
  const colors = useWowColors();
  const [status, setStatus] = useState<ComplaintStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const query = useAdminComplaints({ status, offset, limit: PAGE_SIZE });
  const entries = Array.isArray(query.data) ? query.data : [];
  return (
    <View className="gap-6">
      <W06Header section="الشكاوى والبلاغات" title="الإشراف على الشكاوى"
        description="سجلات الخادم المصرّح بها فقط؛ لا تُعرض تفاصيل الشكوى أو مرفقاتها قبل فتحها بصلاحية موثّقة." />
      <Card className="border border-border p-4 sm:p-6 gap-4">
        <View className="flex-row flex-wrap justify-between gap-3 items-center">
          <AppText className="text-lg font-tajawal-bold">قائمة الشكاوى</AppText>
          <AppButton title="تحديث" variant="outline" size="sm"
            disabled={query.isFetching} onPress={() => void query.refetch()} />
        </View>
        <StatusFilter items={statuses} value={status} choose={(next) => { setStatus(next); setOffset(0); }} />
        {query.isPending && <W06Message title="جارٍ تحميل الشكاوى…" kind="info" />}
        {query.isError && <W06Message title="تعذر تحميل الشكاوى الإدارية" kind="error"
          retry={() => void query.refetch()} />}
        {query.isSuccess && entries.length === 0 &&
          <W06Message title="لا توجد شكاوى في هذه القائمة" />}
        {query.isSuccess && entries.map((item) => (
          <Pressable key={item.id} accessibilityRole="button"
            accessibilityLabel={'تفاصيل الشكوى ' + item.id}
            onPress={() => router.push(('/complaints/' + item.id) as never)}
            className="rounded-xl border border-border bg-background p-4 flex-row items-center gap-3">
            <ChevronLeft size={18} color={colors.mutedForeground} />
            <View className="flex-1 gap-2">
              <View className="flex-row justify-between flex-wrap gap-2">
                <Badge label={complaintNames[item.status] ?? item.status} variant="secondary" />
                <AppText className="font-tajawal-bold text-sm text-right">
                  {complaintTypes[item.complaint_type] ?? 'شكوى'}
                </AppText>
              </View>
              <AppText variant="caption" muted className="text-xs text-right">
                {dateLabel(item.created_at)} • {item.id}
              </AppText>
            </View>
          </Pressable>
        ))}
        {query.isSuccess && <W06Paging offset={offset} count={entries.length}
          pageSize={PAGE_SIZE} loading={query.isFetching}
          previous={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          next={() => setOffset(offset + PAGE_SIZE)} />}
      </Card>
    </View>
  );
}

export function AdminRatingsQueue({ role }: { role: AdminRole | null }) {
  const colors = useWowColors();
  const [status, setStatus] = useState<RatingModerationStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const query = useAdminRatings({ moderationStatus: status, offset, limit: PAGE_SIZE });
  const entries = Array.isArray(query.data) ? query.data : [];
  return (
    <View className="gap-6">
      <W06Header section="الإشراف على التقييمات" title="مراجعة تقييمات العروض"
        description="قائمة تشغيلية من الخادم. لا تتضمن هذه المرحلة قرارات إدارية تلقائية أو بيانات تجريبية." />
      <Card className="border border-border p-4 sm:p-6 gap-4">
        <View className="flex-row justify-between flex-wrap gap-3 items-center">
          <AppText className="text-lg font-tajawal-bold">التقييمات المسجلة</AppText>
          <AppButton title="تحديث" variant="outline" size="sm"
            disabled={query.isFetching} onPress={() => void query.refetch()} />
        </View>
        <StatusFilter items={moderation} value={status} choose={(next) => { setStatus(next); setOffset(0); }} />
        {query.isPending && <W06Message title="جارٍ تحميل التقييمات…" kind="info" />}
        {query.isError && <W06Message title="تعذر تحميل التقييمات الإدارية" kind="error"
          retry={() => void query.refetch()} />}
        {query.isSuccess && entries.length === 0 &&
          <W06Message title="لا توجد تقييمات في هذه القائمة" />}
        {query.isSuccess && entries.map((item) => (
          <View key={item.id} className="rounded-xl border border-border bg-background p-4 gap-2">
            <View className="flex-row justify-between flex-wrap gap-2 items-center">
              <Badge label={ratingNames[item.moderation_status] ?? item.moderation_status} variant="secondary" />
              <View className="flex-row items-center gap-2">
                <AppText className="font-tajawal-bold text-sm">
                  {conformityNames[item.conformity] ?? 'غير محدد'}
                </AppText>
                <Star size={18} color={colors.warning} />
              </View>
            </View>
            <AppText variant="caption" muted className="text-xs text-right">
              {'التجربة: ' + (item.experience_stars === null ? 'غير مقيّمة' : item.experience_stars + ' / 5')}
              {' • ' + dateLabel(item.created_at)}
            </AppText>
            <AppText variant="caption" muted className="text-xs text-right">
              {'معرّف التقييم: ' + item.id}
            </AppText>
            <RatingDecision key={item.id + ':' + item.moderation_status}
              ratingId={item.id} currentStatus={item.moderation_status} role={role} />
          </View>
        ))}
        {query.isSuccess && <W06Paging offset={offset} count={entries.length}
          pageSize={PAGE_SIZE} loading={query.isFetching}
          previous={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          next={() => setOffset(offset + PAGE_SIZE)} />}
      </Card>
    </View>
  );
}
