import { useState } from 'react';
import { View } from 'react-native';
import { Store, MapPin, Building2 } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppButton, AppInput, BottomSheet } from '@wow/ui';

export interface BranchEditorData {
  id?: string;
  name: string;
  city: string;
  address_line: string;
  district?: string | null;
}

export interface BranchEditorModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: BranchEditorData | null;
  isSaving?: boolean;
  onSave: (data: BranchEditorData) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

interface BranchEditorFormProps {
  mode: 'create' | 'edit';
  initialData?: BranchEditorData | null;
  isSaving: boolean;
  onSave: (data: BranchEditorData) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

function BranchEditorForm({
  mode,
  initialData,
  isSaving,
  onSave,
  onClose,
}: BranchEditorFormProps) {
  const colors = useWowColors();

  const [name, setName] = useState(initialData?.name ?? '');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [addressLine, setAddressLine] = useState(initialData?.address_line ?? '');
  const [district, setDistrict] = useState(initialData?.district ?? '');

  const [nameError, setNameError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const validate = (): boolean => {
    let isValid = true;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('أدخل اسم الفرع للمتابعة.');
      isValid = false;
    } else if (trimmedName.length < 2 || trimmedName.length > 120) {
      setNameError('يجب أن يتراوح اسم الفرع بين 2 و 120 حرفًا.');
      isValid = false;
    } else {
      setNameError(null);
    }

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setCityError('أدخل اسم المدينة للمتابعة.');
      isValid = false;
    } else if (trimmedCity.length < 2 || trimmedCity.length > 120) {
      setCityError('يجب أن تتراوح المدينة بين 2 و 120 حرفًا.');
      isValid = false;
    } else {
      setCityError(null);
    }

    const trimmedAddress = addressLine.trim();
    if (!trimmedAddress) {
      setAddressError('أدخل عنوان التشغيل للمتابعة.');
      isValid = false;
    } else if (trimmedAddress.length < 5 || trimmedAddress.length > 500) {
      setAddressError('يجب أن يتراوح عنوان التشغيل بين 5 و 500 حرف.');
      isValid = false;
    } else {
      setAddressError(null);
    }

    return isValid;
  };

  const handleSavePress = async () => {
    if (!validate()) return;
    const result = await onSave({
      id: initialData?.id,
      name: name.trim(),
      city: city.trim(),
      address_line: addressLine.trim(),
      district: district.trim() ? district.trim() : null,
    });
    if (result !== false) {
      onClose();
    }
  };

  return (
    <View className="w-full gap-4 pt-1">
      <AppInput
        label="اسم الفرع"
        required
        leading={<Store size={20} color={colors.mutedForeground} strokeWidth={1.8} />}
        placeholder="مثال: فرع المنصورة"
        hint="اكتب اسماً واضحاً للفرع يسهل على العملاء والإدارة تمييزه."
        value={name}
        onChangeText={(val) => {
          setName(val);
          if (nameError) setNameError(null);
        }}
        error={nameError ?? undefined}
        editable={!isSaving}
      />

      <AppInput
        label="المدينة"
        required
        leading={<Building2 size={20} color={colors.mutedForeground} strokeWidth={1.8} />}
        placeholder="مثال: عدن"
        hint="المدينة التي يقع فيها هذا الفرع."
        value={city}
        onChangeText={(val) => {
          setCity(val);
          if (cityError) setCityError(null);
        }}
        error={cityError ?? undefined}
        editable={!isSaving}
      />

      <AppInput
        label="عنوان التشغيل"
        required
        leading={<MapPin size={20} color={colors.mutedForeground} strokeWidth={1.8} />}
        placeholder="مثال: حي التقنية، شارع الملك فهد"
        hint="اكتب عنواناً واضحاً يسهل على الإدارة مراجعته."
        value={addressLine}
        onChangeText={(val) => {
          setAddressLine(val);
          if (addressError) setAddressError(null);
        }}
        error={addressError ?? undefined}
        editable={!isSaving}
      />

      <AppInput
        label="الحي / المنطقة (اختياري)"
        placeholder="مثال: حي التقنية"
        value={district}
        onChangeText={setDistrict}
        editable={!isSaving}
      />

      <View className="w-full gap-2.5 pt-3">
        <AppButton
          title={isSaving ? 'جارٍ الحفظ...' : mode === 'create' ? 'إضافة الفرع' : 'حفظ التعديلات'}
          variant="primary"
          size="lg"
          loading={isSaving}
          disabled={isSaving}
          onPress={handleSavePress}
        />
        <AppButton
          title="إلغاء"
          variant="secondary"
          size="lg"
          disabled={isSaving}
          onPress={onClose}
        />
      </View>
    </View>
  );
}

export function BranchEditorModal({
  visible,
  mode,
  initialData,
  isSaving = false,
  onSave,
  onClose,
}: BranchEditorModalProps) {
  const title = mode === 'create' ? 'إضافة فرع جديد' : 'تعديل بيانات الفرع';

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      {visible ? (
        <BranchEditorForm
          key={`${mode}:${initialData?.id ?? 'new'}`}
          mode={mode}
          initialData={initialData}
          isSaving={isSaving}
          onSave={onSave}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}
