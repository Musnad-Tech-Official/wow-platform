import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useAdminModerateRating, type RatingModerationStatus } from '@wow/api';
import { AppButton, AppText } from '@wow/ui';
import { useWowColors } from '@wow/theme';
import type { AdminRole } from '../auth/admin-access';
import { canSubmitW06Decision, W06AuthorityNotice, W06Message, w06ErrorMessage } from '../w06/W06Shared';

const decisions: { value: RatingModerationStatus; label: string }[] = [
  { value: 'under_review', label: 'إحالة للمراجعة' },
  { value: 'excluded', label: 'استبعاد التقييم' },
  { value: 'normal', label: 'إعادة إتاحة التقييم' },
];

/** The existing server RPC authorizes this action and creates the moderation audit. */
export function RatingDecision({ ratingId, currentStatus, role }: {
  ratingId: string;
  currentStatus: RatingModerationStatus;
  role: AdminRole | null;
}) {
  const colors = useWowColors();
  const mutation = useAdminModerateRating();
  const [choice, setChoice] = useState<RatingModerationStatus | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    setChoice(null);
    setReason('');
    setConfirmed(false);
    mutation.reset();
    // Reset pending selection if the server changes the rating being reviewed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingId, currentStatus]);
  if (!canSubmitW06Decision(role)) {
    return <W06AuthorityNotice role={role} action="قرار الإشراف على التقييم" />;
  }
  const note = reason.trim();
  const valid = choice !== null && choice !== currentStatus &&
    note.length >= 5 && note.length <= 2000 && confirmed && !mutation.isPending;
  async function submit() {
    if (!valid || !choice) return;
    try {
      await mutation.mutateAsync({ ratingId, status: choice, reason: note });
      setChoice(null);
      setReason('');
      setConfirmed(false);
    } catch {
      setConfirmed(false);
    }
  }
  return (
    <View className="gap-3 border-t border-border pt-3">
      <AppText className="font-tajawal-bold text-sm text-right">قرار الإشراف</AppText>
      <View className="flex-row flex-wrap gap-2">
        {decisions.filter((item) => item.value !== currentStatus).map((item) => (
          <Pressable key={item.value} accessibilityRole="button"
            accessibilityState={{ selected: choice === item.value, disabled: mutation.isPending }}
            disabled={mutation.isPending}
            onPress={() => { setChoice(item.value); setConfirmed(false); mutation.reset(); }}
            className="rounded-xl border px-3 py-2"
            style={{ borderColor: choice === item.value ? colors.focusRing : colors.border,
              backgroundColor: choice === item.value ? colors.warningSurface : colors.surface }}>
            <AppText className="text-xs font-tajawal-medium">{item.label}</AppText>
          </Pressable>
        ))}
      </View>
      <TextInput value={reason} multiline editable={!mutation.isPending}
        onChangeText={(text) => { setReason(text); setConfirmed(false); mutation.reset(); }}
        accessibilityLabel="سبب قرار الإشراف على التقييم"
        placeholder="سبب القرار (5 أحرف على الأقل)"
        placeholderTextColor={colors.mutedForeground}
        className="rounded-xl border border-border bg-background p-3 text-right font-tajawal"
        style={{ color: colors.foreground, minHeight: 82, textAlignVertical: 'top' }} />
      <Pressable accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed, disabled: !choice || note.length < 5 || mutation.isPending }}
        disabled={!choice || note.length < 5 || mutation.isPending}
        onPress={() => setConfirmed((value) => !value)}
        className="rounded-xl border border-border p-3"
        style={{ backgroundColor: confirmed ? colors.warningSurface : colors.surface }}>
        <AppText className="text-sm font-tajawal-medium text-right">
          {confirmed ? '☑' : '□'} أؤكد تنفيذ قرار الإشراف على هذا التقييم
        </AppText>
      </Pressable>
      {mutation.isError && <W06Message kind="error" title="تعذر حفظ قرار التقييم"
        detail={w06ErrorMessage(mutation.error)} />}
      <AppButton title={mutation.isPending ? 'جارٍ اعتماد القرار…' : 'اعتماد قرار التقييم'}
        disabled={!valid} onPress={() => void submit()} />
    </View>
  );
}
