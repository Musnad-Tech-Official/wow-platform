import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Store, Tag, MessageSquareWarning, CreditCard,
  ShieldCheck, AlertTriangle, ClipboardList,
} from 'lucide-react-native';
import { AppText, Card, Badge } from '@wow/ui';
import { useWowColors } from '@wow/theme';
import {
  useAdminBusinessVerifications,
  useAdminPendingOffers,
  useAdminComplaints,
  useAdminSubscriptionPayments,
} from '@wow/api';
import { getRoleArabicLabel, type AdminRole } from '../auth/admin-access';

interface AdminDashboardScreenProps {
  currentRole?: AdminRole | null;
  isFixture?: boolean;
  isEmptyPreview?: boolean;
}

type Metric = {
  key: string;
  label: string;
  count: number | null;
  note: string;
  color: string;
  Icon: typeof Store;
};

type QueueEntry = { key: string; label: string; detail: string; source: string };

export function AdminDashboardScreen({
  currentRole,
  isFixture = false,
  isEmptyPreview = false,
}: AdminDashboardScreenProps) {
  const colors = useWowColors();
  // These hooks run only inside the protected route after a verified admin session.
  // Each RPC still independently enforces its own server-side permission boundary.
  const verifications = useAdminBusinessVerifications({ status: 'submitted', limit: 50 });
  const offers = useAdminPendingOffers({ limit: 50 });
  const complaints = useAdminComplaints({ limit: 50 });
  const canReviewBilling = currentRole === 'reviewer' || currentRole === 'super_admin';
  const payments = useAdminSubscriptionPayments({ limit: 50 }, canReviewBilling);

  const previewCounts = isEmptyPreview ? [0, 0, 0, 0] : [2, 3, 2, 3];
  const countOf = (query: { isSuccess: boolean; data?: unknown[] }, fixtureIndex: number) =>
    isFixture ? (previewCounts[fixtureIndex] ?? 0) : query.isSuccess && Array.isArray(query.data) ? query.data.length : null;

  const metrics: Metric[] = [
    { key: 'verification', label: 'طلبات التأهيل المقدمة', count: countOf(verifications, 0),
      note: 'القائمة الحالية، بحد أقصى 50', color: '#EAB308', Icon: Store },
    { key: 'offers', label: 'عروض تنتظر المراجعة', count: countOf(offers, 1),
      note: 'القائمة الحالية، بحد أقصى 50', color: '#3B82F6', Icon: Tag },
    { key: 'complaints', label: 'الشكاوى المسجلة', count: countOf(complaints, 2),
      note: 'لا يمثل الرقم الشكاوى المفتوحة فقط', color: '#F59E0B', Icon: MessageSquareWarning },
    { key: 'payments', label: 'سجلات مدفوعات الاشتراكات', count: canReviewBilling ? countOf(payments, 3) : null,
      note: 'القائمة الحالية، بحد أقصى 50', color: '#A855F7', Icon: CreditCard },
  ];

  const queries = canReviewBilling ? [verifications, offers, complaints, payments] : [verifications, offers, complaints];
  const anyFailure = !isFixture && queries.some((q) => q.isError);
  const isLoading = !isFixture && queries.some((q) => q.isPending);
  const allAvailable = isFixture || queries.every((q) => q.isSuccess);
  const total = metrics.reduce((sum, metric) => sum + (metric.count ?? 0), 0);

  // A malformed or unexpected API payload must never crash the protected shell.
  const verificationRows = Array.isArray(verifications.data) ? verifications.data : [];
  const offerRows = Array.isArray(offers.data) ? offers.data : [];
  const complaintRows = Array.isArray(complaints.data) ? complaints.data : [];
  const paymentRows = canReviewBilling && Array.isArray(payments.data) ? payments.data : [];

  const liveQueue: QueueEntry[] = [
    ...verificationRows.slice(0, 2).map((record) => ({
      key: 'business-' + record.id, source: 'تأهيل نشاط',
      label: record.business_name || 'طلب تأهيل',
      detail: 'رقم الطلب: ' + record.id,
    })),
    ...offerRows.slice(0, 2).map((record) => ({
      key: 'offer-' + record.version_id, source: 'مراجعة عرض',
      label: record.title || record.business_name || 'عرض مقدم',
      detail: 'رقم النسخة: ' + record.version_id,
    })),
    ...complaintRows.slice(0, 2).map((record) => ({
      key: 'complaint-' + record.id, source: 'شكوى',
      label: 'شكوى مسجلة',
      detail: 'رقم الشكوى: ' + record.id,
    })),
    ...paymentRows.slice(0, 2).map((record) => ({
      key: 'payment-' + record.payment_id, source: 'اشتراك',
      label: 'سجل دفع اشتراك',
      detail: 'رقم الدفعة: ' + record.payment_id,
    })),
  ];

  const fixtureQueue: QueueEntry[] = isEmptyPreview ? [] : [
    { key: 'fixture-v', source: 'تأهيل نشاط', label: 'طلب تأهيل تجريبي', detail: 'بيانات معاينة فقط' },
    { key: 'fixture-o', source: 'مراجعة عرض', label: 'نسخة عرض تجريبية', detail: 'بيانات معاينة فقط' },
    { key: 'fixture-c', source: 'شكوى', label: 'شكوى تجريبية', detail: 'بيانات معاينة فقط' },
  ];
  // Never mix real server data into preview mode.
  const queue = isFixture ? fixtureQueue : liveQueue.slice(0, 6);

  const retryQueries = () => {
    void Promise.all(queries.filter((q) => q.isError).map((q) => q.refetch()));
  };

  return (
    <View className="gap-8">
      {isFixture && (
        <View className="rounded-2xl p-4 bg-[#FEFCE8] dark:bg-[#422E12]/60 border border-[#FDE047] dark:border-[#854D0E]">
          <AppText className="font-tajawal-bold text-sm text-[#854D0E] dark:text-[#FEF08A] text-right">
            وضع المعاينة التطويرية (Fixture Mode)
          </AppText>
          <AppText className="text-xs text-[#854D0E] dark:text-[#FDE047] text-right">
            الأرقام والطلبات هنا تجريبية، ولا تمثل سجلات حقيقية أو صلاحيات إنتاجية.
          </AppText>
        </View>
      )}

      <View className="flex-row flex-wrap justify-between items-start gap-4">
        <View className="gap-1 flex-1">
          <AppText variant="caption" className="font-tajawal-bold text-[#A16207] dark:text-[#FACC15] text-right">
            WOW / مركز العمليات
          </AppText>
          <AppText className="text-2xl sm:text-3xl font-tajawal-bold text-right">
            نظرة واضحة على ما يحتاج إجراء
          </AppText>
          <AppText variant="caption" muted className="text-sm text-right">
            سجلات تشغيلية مأخوذة من استجابات الخادم، وليست إحصاءات كلية للنظام.
          </AppText>
        </View>
        <Badge label={getRoleArabicLabel(currentRole)} variant="secondary" />
      </View>

      {anyFailure && (
        <View className="p-4 rounded-xl border border-[#F59E0B] bg-[#FFFBEB] dark:bg-[#451A03]/40 flex-row gap-3 items-center">
          <AlertTriangle size={20} color="#D97706" />
          <View className="flex-1">
            <AppText className="font-tajawal-bold text-sm text-right text-[#92400E] dark:text-[#FDE68A]">
              بعض مصادر البيانات غير متاحة أو لا تسمح بها الصلاحيات الحالية
            </AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="إعادة محاولة تحميل المصادر المتعثرة" onPress={retryQueries} className="py-2">
              <AppText className="text-xs font-tajawal-bold text-right text-[#92400E] dark:text-[#FDE68A]">
                إعادة محاولة المصادر المتعثرة
              </AppText>
            </Pressable>
          </View>
        </View>
      )}

      <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ key, label, count, note, color, Icon }) => (
          <Card key={key} className="p-5 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-4">
            <View className="flex-row items-center justify-between gap-2">
              <View className="rounded-xl bg-background p-2.5">
                <Icon size={20} color={color} />
              </View>
              <AppText variant="caption" muted className="text-xs font-tajawal-bold text-right flex-1">
                {label}
              </AppText>
            </View>
            <AppText className="text-4xl font-tajawal-bold text-right">
              {count === null ? (isLoading ? '…' : '—') : count >= 50 && !isFixture ? '50+' : String(count).padStart(2, '0')}
            </AppText>
            <AppText variant="caption" muted className="text-xs text-right">
              {count === null ? (key === 'payments' && !canReviewBilling ? 'غير متاح لصلاحية المشاهدة' : 'لم يتأكد توفر بيانات هذا المصدر') : isFixture ? 'بيانات عرض تجريبية' : note}
            </AppText>
          </Card>
        ))}
      </View>

      <View className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-5">
          <View className="flex-row justify-between items-center border-b border-border pb-3">
            <View className="gap-1">
              <AppText className="font-tajawal-bold text-lg text-right">قوائم العمل المتاحة</AppText>
              <AppText variant="caption" muted className="text-xs text-right">
                عينة من السجلات المسترجعة، وليست قائمة أولويات محسوبة
              </AppText>
            </View>
            <Badge label={isLoading ? 'جارٍ التحميل' : queue.length + ' سجلات'} variant="secondary" />
          </View>
          {queue.length === 0 ? (
            <View className="py-10 items-center gap-3">
              <ClipboardList size={30} color={colors.mutedForeground} />
              <AppText className="font-tajawal-bold text-sm text-center">
                {isLoading ? 'جارٍ تحميل السجلات…' : allAvailable ? 'لا توجد سجلات في القوائم الحالية' : 'تعذر عرض السجلات المتاحة'}
              </AppText>
              <AppText variant="caption" muted className="text-xs text-center">
                لا توجد بعد شاشة تفاصيل مفعّلة لهذه القوائم؛ لا تتوفر روابط إجراءات في هذه الدفعة.
              </AppText>
            </View>
          ) : queue.map((entry) => (
            <View key={entry.key} className="p-3.5 rounded-xl bg-background border border-border flex-row items-center gap-3">
              <View className="h-9 w-9 rounded-lg bg-[#FACC15]/20 items-center justify-center">
                <FileItemIcon />
              </View>
              <View className="flex-1 gap-1 items-end">
                <AppText className="text-sm font-tajawal-bold text-right">{entry.label}</AppText>
                <AppText variant="caption" muted className="text-xs text-right">{entry.source} • {entry.detail}</AppText>
              </View>
            </View>
          ))}
        </Card>

        <Card className="lg:col-span-5 p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-4">
          <View className="border-b border-border pb-3">
            <AppText className="font-tajawal-bold text-lg text-right">توزيع السجلات المسترجعة</AppText>
            <AppText variant="caption" muted className="text-xs text-right">
              نسبة كل قائمة من مجموع السجلات المتاحة في الصفحات الحالية
            </AppText>
          </View>
          {!allAvailable ? (
            <AppText variant="caption" muted className="text-sm text-right py-8">
              لا يمكن حساب توزيع موثوق حتى تتوفر جميع المصادر المطلوبة.
            </AppText>
          ) : metrics.map((metric) => (
            <View key={metric.key} className="gap-2">
              <View className="flex-row justify-between gap-3">
                <AppText className="font-tajawal-bold text-xs">{metric.count ?? 0}</AppText>
                <AppText variant="caption" muted className="text-xs text-right">{metric.label}</AppText>
              </View>
              <View className="h-2 bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{
                  backgroundColor: metric.color,
                  width: `${total === 0 ? 0 : ((metric.count ?? 0) * 100 / total)}%` as const,
                }} />
              </View>
            </View>
          ))}
        </Card>
      </View>

      <View className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-5">
          <AppText className="font-tajawal-bold text-lg text-right">اتجاه النشاط التشغيلي</AppText>
          <View className="py-9 items-center gap-3">
            <ClipboardList size={28} color={colors.mutedForeground} />
            <AppText className="font-tajawal-bold text-sm text-center">لا تتوفر سلسلة زمنية معتمدة</AppText>
            <AppText variant="caption" muted className="text-xs text-center">
              لا يوجد عقد خادم يوفر الأحداث المجمّعة عبر الزمن حالياً؛ لن نعرض رسماً أو أرقاماً افتراضية.
            </AppText>
          </View>
        </Card>
        <Card className="lg:col-span-5 p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-4">
          <AppText className="font-tajawal-bold text-lg text-right">قواعد تفسير المؤشرات</AppText>
          <View className="flex-row gap-3 items-start p-3 rounded-xl bg-background border border-border">
            <ShieldCheck size={18} color="#EAB308" />
            <AppText variant="caption" muted className="flex-1 text-xs text-right">
              الأرقام تمثل حجم البيانات في الصفحة المسترجعة (حتى 50 سجلاً لكل مصدر)، وليست إجماليات شاملة.
            </AppText>
          </View>
          <View className="flex-row gap-3 items-start p-3 rounded-xl bg-background border border-border">
            <ShieldCheck size={18} color="#EAB308" />
            <AppText variant="caption" muted className="flex-1 text-xs text-right">
              لا يعني وجود سجل في القائمة امتلاك صلاحية مراجعته أو اتخاذ إجراء بشأنه.
            </AppText>
          </View>
        </Card>
      </View>
    </View>
  );
}

function FileItemIcon() {
  return <ClipboardList size={18} color="#CA8A04" />;
}
