import { useState, useCallback } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Paperclip, FileText, Trash2, RefreshCw } from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';

export interface SelectedEvidenceFile {
  name: string;
  size: number;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  bytes?: ArrayBuffer;
  storageKey?: string | null;
  isUploaded?: boolean;
}

export interface EvidencePickerProps {
  value: SelectedEvidenceFile | null;
  onChange: (file: SelectedEvidenceFile | null) => void;
  disabled?: boolean;
  error?: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

export function EvidencePicker({
  value,
  onChange,
  disabled = false,
  error: externalError,
}: EvidencePickerProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [internalError, setInternalError] = useState<string | null>(null);

  const error = externalError ?? internalError;

  const handlePickFile = useCallback(() => {
    if (disabled) return;
    setInternalError(null);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,application/pdf,.jpg,.jpeg,image/jpeg,.png,image/png';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        // Size check: reject empty or oversize (> 10MB)
        if (file.size <= 0) {
          setInternalError('الملف المختار فارغ. يرجى اختيار ملف صالح.');
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          setInternalError('حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت).');
          return;
        }

        // MIME / Extension check
        const ext = file.name.split('.').pop()?.toLowerCase();
        let mime: 'application/pdf' | 'image/jpeg' | 'image/png' | null = null;

        if (file.type === 'application/pdf' || ext === 'pdf') {
          mime = 'application/pdf';
        } else if (file.type === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') {
          mime = 'image/jpeg';
        } else if (file.type === 'image/png' || ext === 'png') {
          mime = 'image/png';
        }

        if (!mime) {
          setInternalError('نوع الملف غير مدعوم. يرجى اختيار ملف بصيغة PDF أو JPG أو PNG.');
          return;
        }

        try {
          const arrayBuffer = await file.arrayBuffer();
          onChange({
            name: file.name,
            size: file.size,
            mimeType: mime,
            bytes: arrayBuffer,
            isUploaded: false,
          });
        } catch {
          setInternalError('تعذر قراءة الملف المختار. يرجى إعادة المحاولة.');
        }
      };

      input.click();
    } else {
      // In synthetic preview or native environments without web DOM input
      setInternalError(null);
    }
  }, [disabled, onChange]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    setInternalError(null);
    onChange(null);
  }, [disabled, onChange]);

  return (
    <View className="w-full gap-2.5">
      {/* Dashed Upload Card */}
      <View
        className="w-full rounded-2xl border-2 border-dashed p-4 transition-colors"
        style={{
          borderColor: error
            ? colors.danger
            : value
            ? colors.primary
            : isDark
            ? '#334155'
            : '#CBD5E1',
          backgroundColor: value
            ? isDark
              ? '#1E293B'
              : '#F8FAFC'
            : isDark
            ? '#0F172A'
            : '#F8FAFC',
        }}
      >
        {!value ? (
          /* Empty / Unselected State */
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إضافة مستند إثبات: اختر ملفاً للمعاينة بصيغة PDF أو JPG أو PNG حتى 10 ميجابايت"
            accessibilityHint="اضغط لاختيار ملف إثبات صفة التمثيل من جهازك"
            disabled={disabled}
            onPress={handlePickFile}
            className="min-h-16 w-full flex-row items-center justify-between gap-3 active:opacity-75"
          >
            {/* Right side in RTL: Title & Help copy */}
            <View className="min-w-0 flex-1 items-start gap-1">
              <AppText
                className="font-tajawal-bold text-base"
                style={{ color: colors.foreground }}
              >
                إضافة مستند إثبات
              </AppText>
              <AppText
                variant="caption"
                muted
                className="font-tajawal-medium leading-5"
                style={{ fontSize: 13 }}
              >
                اختر ملفاً للمعاينة (PDF أو JPG أو PNG حتى 10MB)
              </AppText>
            </View>

            {/* Left side in RTL: Paperclip icon in surface container */}
            <View
              className="shrink-0 items-center justify-center rounded-xl"
              style={{
                width: 48,
                height: 48,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Paperclip size={22} color={colors.foreground} strokeWidth={2} />
            </View>
          </Pressable>
        ) : (
          /* Selected File State */
          <View className="w-full gap-3">
            <View className="flex-row items-center justify-between gap-3">
              {/* Right side in RTL: File Info */}
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <View
                  className="shrink-0 items-center justify-center rounded-xl"
                  style={{
                    width: 44,
                    height: 44,
                    backgroundColor: `${colors.primary}15`,
                    borderWidth: 1,
                    borderColor: `${colors.primary}30`,
                  }}
                >
                  <FileText size={22} color={colors.primary} strokeWidth={2} />
                </View>

                <View className="min-w-0 flex-1 items-start gap-0.5">
                  <AppText
                    numberOfLines={1}
                    className="font-tajawal-bold text-base text-right"
                    style={{ color: colors.foreground }}
                  >
                    {value.name}
                  </AppText>
                  <View className="flex-row items-center gap-2">
                    <AppText variant="caption" muted style={{ fontSize: 12 }}>
                      {formatFileSize(value.size)}
                    </AppText>
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: value.isUploaded
                          ? isDark
                            ? '#064E3B'
                            : '#D1FAE5'
                          : isDark
                          ? '#422006'
                          : '#FEF3C7',
                      }}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          fontSize: 11,
                          color: value.isUploaded
                            ? isDark
                              ? '#6EE7B7'
                              : '#047857'
                            : isDark
                            ? '#FDE047'
                            : '#B45309',
                        }}
                      >
                        {value.isUploaded ? 'تم الحفظ والرفع' : 'تم اختيار الملف محلياً'}
                      </AppText>
                    </View>
                  </View>
                </View>
              </View>

              {/* Left side in RTL: Actions */}
              <View className="flex-row items-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="تغيير الملف"
                  disabled={disabled}
                  onPress={handlePickFile}
                  className="min-h-12 min-w-12 items-center justify-center rounded-xl active:opacity-75"
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <RefreshCw size={18} color={colors.foreground} strokeWidth={2} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="حذف الملف"
                  disabled={disabled}
                  onPress={handleClear}
                  className="min-h-12 min-w-12 items-center justify-center rounded-xl active:opacity-75"
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Trash2 size={18} color={colors.danger} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Explanatory Policy Copy */}
      <AppText
        variant="caption"
        muted
        className="font-tajawal text-center"
        style={{ fontSize: 13, lineHeight: 20 }}
      >
        المستندات خاصة بمراجعة الإدارة ولا تظهر للعامة.
      </AppText>

      {/* Error message */}
      {error ? (
        <AppText
          variant="caption"
          tone="danger"
          accessibilityLiveRegion="polite"
          className="text-right"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
