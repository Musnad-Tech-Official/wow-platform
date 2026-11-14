import React from 'react';
import { View } from 'react-native';
import { AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { AppText, AppButton, Card } from '@wow/ui';
import { useWowColors } from '@wow/theme';
import { useAdminAccess } from '../auth/use-admin-access';
import { AdminAccessScreen } from '../screens/AdminAccessScreen';
import { AdminShell } from '../shell/AdminShell';
import type { AdminRole } from '../auth/admin-access';

export function canSubmitW06Decision(role: AdminRole | null | undefined): boolean {
  return role === 'reviewer' || role === 'super_admin';
}

export function W06GuardedPage({
  title, children,
}: {
  title: string;
  children: (role: AdminRole | null) => React.ReactNode;
}) {
  const access = useAdminAccess();
  // Do not authorize these live workflows using visual preview fixtures.
  if (access.status !== 'authorized' || access.isFixture) {
    return (
      <AdminAccessScreen
        status={access.isFixture ? 'unauthorized' : access.status}
        errorMessage={access.error?.message}
        onRetry={access.retry}
        onSignOut={access.signOut}
        userEmail={access.user?.primaryEmailAddress?.emailAddress}
      />
    );
  }
  return (
    <AdminShell
      currentRole={access.role}
      userEmail={access.user?.primaryEmailAddress?.emailAddress}
      userName={access.user?.fullName || access.user?.firstName || 'المسؤول المخوّل'}
      onSignOut={access.signOut}
      pageTitle={title}
    >
      {children(access.role)}
    </AdminShell>
  );
}

export function W06Header({ section, title, description }: {
  section: string;
  title: string;
  description: string;
}) {
  return (
    <View className="gap-1">
      <AppText variant="caption" className="font-tajawal-bold text-[#A16207] dark:text-[#FACC15] text-right">
        WOW / مركز العمليات / {section}
      </AppText>
      <AppText className="text-2xl sm:text-3xl font-tajawal-bold text-right">{title}</AppText>
      <AppText variant="caption" muted className="text-sm text-right">{description}</AppText>
    </View>
  );
}

export function W06Message({
  title, detail, kind = 'empty', retry,
}: {
  title: string;
  detail?: string;
  kind?: 'empty' | 'error' | 'info';
  retry?: () => void;
}) {
  const colors = useWowColors();
  return (
    <Card className="p-5 sm:p-6 border border-border gap-3">
      <View className="flex-row items-center gap-2">
        {kind === 'error' ? <AlertTriangle size={20} color={colors.danger} /> : <ShieldCheck size={20} color="#A16207" />}
        <AppText className="text-base font-tajawal-bold text-right flex-1">{title}</AppText>
      </View>
      {detail ? <AppText variant="caption" muted className="text-sm text-right">{detail}</AppText> : null}
      {retry ? <AppButton title="إعادة المحاولة" variant="outline" onPress={retry} size="sm" /> : null}
    </Card>
  );
}

export function W06AuthorityNotice({ role, action }: {
  role: AdminRole | null;
  action: string;
}) {
  if (canSubmitW06Decision(role)) return null;
  return (
    <View className="rounded-xl bg-[#FEFCE8] dark:bg-[#422E12] border border-[#FDE047] p-4 gap-1">
      <AppText className="text-sm font-tajawal-bold text-[#854D0E] dark:text-[#FEF08A] text-right">
        {action} غير متاح حالياً
      </AppText>
      <AppText className="text-xs text-[#854D0E] dark:text-[#FEF08A] text-right">
        لم يثبت الخادم دور مراجع مخوّل لهذه الجلسة. لا يُستنتج حق اتخاذ القرار من مجرد إمكانية عرض القائمة.
      </AppText>
    </View>
  );
}

export function W06Paging({ offset, count, pageSize, loading, previous, next }: {
  offset: number;
  count: number;
  pageSize: number;
  loading: boolean;
  previous: () => void;
  next: () => void;
}) {
  return (
    <View className="flex-row flex-wrap justify-between items-center gap-3">
      <AppText variant="caption" muted className="text-xs">
        السجلات المعروضة: {offset + (count ? 1 : 0)}–{offset + count}
      </AppText>
      <View className="flex-row items-center gap-2">
        <AppButton title="السابق" size="sm" variant="outline" disabled={loading || offset === 0} onPress={previous} />
        <AppButton title="التالي" size="sm" variant="outline" disabled={loading || count < pageSize} onPress={next} />
      </View>
    </View>
  );
}

export function w06ErrorMessage(error: unknown): string {
  if (!error) return 'تعذر إتمام الطلب.';
  const message = error instanceof Error ? error.message : String(error);
  if (/42501|permission|not authorized|reviewer|forbidden/i.test(message)) {
    return 'رفض الخادم العملية لعدم توفر الصلاحية المطلوبة أو لوجود تعارض مصالح.';
  }
  if (/22023|invalid|only submitted|not found/i.test(message)) {
    return 'رفض الخادم العملية بسبب حالة الطلب أو البيانات المدخلة. حدّث القائمة وتحقق من التفاصيل.';
  }
  return 'تعذر إتمام العملية من الخادم؛ تحقق من حالتها قبل إعادة الإرسال.';
}
