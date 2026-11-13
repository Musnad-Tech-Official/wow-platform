import { useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { AppText } from '@wow/ui';
import { useWowColors } from '@wow/theme';

export interface ProfileImageSelection {
  name: string;
  size: number;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  bytes: ArrayBuffer;
  uploadedKey?: string;
}

const LIMIT = 5 * 1024 * 1024;
function normalizeMime(name: string, type?: string | null): ProfileImageSelection['mimeType'] | null {
  const ext = name.split('.').pop()?.toLowerCase();
  const expected = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : null;
  if (!expected || (type && type !== expected)) return null;
  return expected;
}

export function ProfileMediaPicker({
  label, value, onChange, disabled = false,
}: {
  label: string;
  value: ProfileImageSelection | null;
  onChange: (file: ProfileImageSelection | null) => void;
  disabled?: boolean;
}) {
  const colors = useWowColors();
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    if (disabled) return;
    setError(null);
    try {
      let data: ProfileImageSelection | null = null;
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        data = await new Promise((resolve) => {
          const control = document.createElement('input');
          control.type = 'file';
          control.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
          control.onchange = async () => {
            const file = control.files?.[0];
            if (!file) return resolve(null);
            const mime = normalizeMime(file.name, file.type);
            if (!mime || file.size < 1 || file.size > LIMIT) {
              setError('الصورة يجب أن تكون JPG أو PNG أو WebP وبحجم لا يتجاوز 5MB.');
              return resolve(null);
            }
            resolve({ name: file.name, size: file.size, mimeType: mime, bytes: await file.arrayBuffer() });
          };
          control.click();
        });
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/jpeg', 'image/png', 'image/webp'],
          multiple: false,
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const mime = normalizeMime(asset.name, asset.mimeType);
        if (!mime || !asset.size || asset.size < 1 || asset.size > LIMIT) {
          setError('الصورة يجب أن تكون JPG أو PNG أو WebP وبحجم لا يتجاوز 5MB.');
          return;
        }
        const bytes = await new ExpoFile(asset.uri).arrayBuffer();
        if (bytes.byteLength !== asset.size) throw new Error('Incomplete file read');
        data = { name: asset.name, size: asset.size, mimeType: mime, bytes };
      }
      if (data) onChange(data);
    } catch {
      setError('تعذرت قراءة الصورة. اختر ملفًا آخر وحاول مجددًا.');
    }
  };

  return (
    <View className="gap-2">
      <AppText variant="label" className="font-tajawal-bold text-xs text-right">{label}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={`اختيار ${label}`}
        disabled={disabled} onPress={() => void pick()}
        className="rounded-xl border p-3 min-h-12 items-center justify-center"
        style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
        <AppText variant="caption" className="text-xs text-center">
          {value ? `${value.name} — ${Math.round(value.size / 1024)} KB` : 'اختيار صورة JPG / PNG / WebP — حتى 5MB'}
        </AppText>
      </Pressable>
      {value ? (
        <Pressable disabled={disabled} accessibilityRole="button" onPress={() => onChange(null)}>
          <AppText variant="caption" tone="danger" className="text-xs text-right">إلغاء اختيار الصورة</AppText>
        </Pressable>
      ) : null}
      {error ? <AppText variant="caption" tone="danger" className="text-xs text-right">{error}</AppText> : null}
    </View>
  );
}
