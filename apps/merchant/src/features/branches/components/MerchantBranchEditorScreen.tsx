import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { MapPin, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import {
  useBusinessBranches,
  useCreateBranch,
  useUpdateBranchDraft,
  useSubmitProfileRevision,
  type Branch,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';

interface BranchFormProps {
  initialBranch?: Branch;
  isEditMode: boolean;
  branchId?: string;
  businessId: string;
  isSyntheticPreview: boolean;
  onBack: () => void;
}

function BranchEditorForm({
  initialBranch,
  isEditMode,
  branchId,
  businessId,
  isSyntheticPreview,
  onBack,
}: BranchFormProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const createBranchMutation = useCreateBranch();
  const updateBranchMutation = useUpdateBranchDraft();
  const submitProfileRevision = useSubmitProfileRevision();

  const [name, setName] = useState(initialBranch?.name || '');
  const [city, setCity] = useState(initialBranch?.city || (isSyntheticPreview ? 'تعز' : ''));
  const [addressLine, setAddressLine] = useState(initialBranch?.address_line || '');
  const [district, setDistrict] = useState(initialBranch?.district || '');
  const [contactNote, setContactNote] = useState('');
  const [lat, setLat] = useState(initialBranch?.latitude != null ? String(initialBranch.latitude) : '');
  const [lon, setLon] = useState(initialBranch?.longitude != null ? String(initialBranch.longitude) : '');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      setFormError('يرجى إدخال اسم الفرع.');
      return;
    }
    if (name.trim().length < 2 || name.trim().length > 120) {
      setFormError('اسم الفرع يجب أن يكون بين حرفين و120 حرفًا.');
      return;
    }
    if (city.trim().length < 2 || city.trim().length > 120) {
      setFormError('يرجى إدخال اسم مدينة صحيح.');
      return;
    }
    if (addressLine.trim().length < 5 || addressLine.trim().length > 500) {
      setFormError('العنوان يجب أن يكون بين 5 و500 حرف.');
      return;
    }
    if (lat.trim().length !== 0 || lon.trim().length !== 0) {
      const latitude = Number(lat.trim());
      const longitude = Number(lon.trim());
      if (!lat.trim() || !lon.trim() ||
          !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        setFormError('أدخل إحداثيي الموقع معًا ضمن الحدود الصحيحة، أو اتركهما فارغين.');
        return;
      }
    }
    if (isEditMode && (!branchId || !initialBranch)) {
      setFormError('الفرع غير متاح أو خارج نطاق النشاط الحالي.');
      return;
    }
    if (!businessId) {
      setFormError('لم يتم تحديد النشاط التجاري.');
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    setSaving(true);

    try {
      if (isSyntheticPreview) {
        setFormSuccess('تم حفظ بيانات الفرع بنجاح (معاينة)');
        setTimeout(() => onBack(), 1000);
        return;
      }

      const parsedLat = lat.trim() ? Number(lat.trim()) : null;
      const parsedLon = lon.trim() ? Number(lon.trim()) : null;

      if (isEditMode && branchId && initialBranch) {
        const patch = {
          name: name.trim(),
          city: city.trim(),
          address_line: addressLine.trim(),
          district: district.trim() || null,
          latitude: parsedLat,
          longitude: parsedLon,
        };
        if (initialBranch.status === 'approved') {
          await submitProfileRevision.mutateAsync({ businessId, branchId, patch });
          setFormSuccess('أُرسل مقترح تعديل الفرع إلى الإدارة؛ البيانات المنشورة لم تتغير.');
        } else if (initialBranch.status === 'draft') {
          const saved = await updateBranchMutation.mutateAsync({ businessId, branchId, patch });
          if (saved !== true) throw new Error('لم تؤكد قاعدة البيانات حفظ مسودة الفرع.');
          setFormSuccess('تم حفظ مسودة الفرع.');
        } else {
          throw new Error('الفرع في مرحلة مراجعة أو حالة لا تسمح بالتعديل.');
        }
      } else {
        await createBranchMutation.mutateAsync({
          businessId,
          name: name.trim(),
          city: city.trim(),
          addressLine: addressLine.trim(),
          district: district.trim() || null,
          latitude: parsedLat,
          longitude: parsedLon,
        });
        setFormSuccess('تمت إضافة الفرع بنجاح.');
      }

      setTimeout(() => onBack(), 1200);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'تعذر حفظ بيانات الفرع.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-5 pb-10">
      {/* Banner with Mascot (Matching Reference MER-07-01) */}
      <View
        className="rounded-2xl border p-4 flex-row items-center justify-between"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View className="flex-1 items-end pr-2">
          <AppText variant="caption" muted className="text-[11px] font-tajawal-bold text-right">
            WOW · FOR BUSINESS
          </AppText>
          <AppText variant="heading" className="font-tajawal-bold text-base text-right mt-0.5">
            بيانات الفرع بوضوح
          </AppText>
          <AppText variant="body" muted className="text-xs text-right mt-1 leading-relaxed">
            العنوان الصحيح يساعد العملاء على معرفة الموقع المناسب للعرض.
          </AppText>
        </View>

        <Image
          source={wowIllustrations.merchant.mer0701BranchEditorMascot}
          alt="مساعد واو لبيانات الفرع"
          style={{ width: 80, height: 80 }}
          contentFit="contain"
        />
      </View>

      {/* Section 1: Basic Information */}
      <View
        className="rounded-2xl border p-4 gap-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          معلومات الفرع
        </AppText>

        {/* Branch Name */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-xs text-right">
            اسم الفرع *
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="الفرع الرئيسي أو اسم الفرع"
            placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
            className="w-full rounded-xl p-3 border text-right text-sm"
            style={{
              backgroundColor: isDark ? '#18181B' : '#F8FAFC',
              borderColor: colors.border,
              color: colors.foreground,
            }}
          />
        </View>

        {/* City */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-xs text-right">
            المدينة *
          </AppText>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="المدينة (مثل تعز أو صنعاء أو عدن)"
            placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
            className="w-full rounded-xl p-3 border text-right text-sm"
            style={{
              backgroundColor: isDark ? '#18181B' : '#F8FAFC',
              borderColor: colors.border,
              color: colors.foreground,
            }}
          />
        </View>

        {/* Address Line */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-xs text-right">
            عنوان التشغيل *
          </AppText>
          <TextInput
            value={addressLine}
            onChangeText={setAddressLine}
            multiline
            numberOfLines={2}
            placeholder="عنوان توضيحي واضح للعملاء (الشارع، المعلم القريب)..."
            placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
            className="w-full rounded-xl p-3 border text-right text-sm"
            style={{
              backgroundColor: isDark ? '#18181B' : '#F8FAFC',
              borderColor: colors.border,
              color: colors.foreground,
              minHeight: 64,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* District */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-xs text-right">
            المنطقة
          </AppText>
          <TextInput
            value={district}
            onChangeText={setDistrict}
            placeholder="المنطقة/المديرية"
            placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
            className="w-full rounded-xl p-3 border text-right text-sm"
            style={{
              backgroundColor: isDark ? '#18181B' : '#F8FAFC',
              borderColor: colors.border,
              color: colors.foreground,
            }}
          />
        </View>

        {/* Operational Contact */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-xs text-right">
            وسيلة تواصل تشغيلية (إن لزم)
          </AppText>
          <TextInput
            value={contactNote}
            onChangeText={setContactNote}
            placeholder="لا تُعرض دون موافقة"
            placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
            className="w-full rounded-xl p-3 border text-right text-sm"
            style={{
              backgroundColor: isDark ? '#18181B' : '#F8FAFC',
              borderColor: colors.border,
              color: colors.foreground,
            }}
          />
        </View>
      </View>

      {/* Section 2: Location Reference */}
      <View className="gap-2">
        <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
          مرجع الموقع
        </AppText>

        <View
          className="rounded-2xl border p-5 items-center justify-center gap-2 border-dashed"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <MapPin size={24} color="#FACC15" />
          <AppText variant="label" className="font-tajawal-bold text-sm text-center">
            يلزم تحديد موقع حقيقي معتمد
          </AppText>
          <AppText variant="caption" muted className="text-xs text-center max-w-xs leading-relaxed">
            لا تتوفر هنا خدمة إحداثيات أو خريطة تشغيلية، ولن ننشئ موقعاً وهمياً.
          </AppText>

          {/* Optional coordinates manual inputs */}
          <View className="w-full flex-row items-center gap-2 pt-2">
            <View className="flex-1 gap-1">
              <AppText variant="caption" muted className="text-[11px] text-right">
                خط الطول (اختياري)
              </AppText>
              <TextInput
                value={lon}
                onChangeText={setLon}
                placeholder="44.0123"
                placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
                keyboardType="numeric"
                className="w-full rounded-xl p-2.5 border text-right text-xs"
                style={{
                  backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.foreground,
                }}
              />
            </View>
            <View className="flex-1 gap-1">
              <AppText variant="caption" muted className="text-[11px] text-right">
                خط العرض (اختياري)
              </AppText>
              <TextInput
                value={lat}
                onChangeText={setLat}
                placeholder="13.5789"
                placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
                keyboardType="numeric"
                className="w-full rounded-xl p-2.5 border text-right text-xs"
                style={{
                  backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.foreground,
                }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Review notice */}
      <View
        className="p-3.5 rounded-xl border border-amber-500/20"
        style={{ backgroundColor: isDark ? '#451A03' : '#FFFBEB' }}
      >
        <AppText
          variant="caption"
          className="text-amber-800 dark:text-amber-200 text-xs text-center leading-relaxed"
        >
          قد تتطلب التغييرات الجوهرية إعادة تأهيل الفرع قبل استخدامها في عروض ظاهرة.
        </AppText>
      </View>

      {/* Success / Error Messages */}
      {formSuccess ? (
        <View className="p-3 rounded-xl bg-emerald-500/10 flex-row items-center gap-2">
          <CheckCircle2 size={16} color="#16A34A" />
          <AppText variant="caption" className="text-emerald-600 text-xs flex-1 text-right">
            {formSuccess}
          </AppText>
        </View>
      ) : null}

      {formError ? (
        <View className="p-3 rounded-xl bg-rose-500/10 flex-row items-center gap-2">
          <AlertCircle size={16} color="#E11D48" />
          <AppText variant="caption" className="text-rose-600 text-xs flex-1 text-right">
            {formError}
          </AppText>
        </View>
      ) : null}

      {/* Actions */}
      <View className="flex-row items-center gap-3 pt-2">
        <View className="flex-1">
          <AppButton
            title={saving ? 'جارٍ الحفظ...' : isEditMode ? 'حفظ التعديلات' : 'إضافة الفرع'}
            variant="primary"
            size="lg"
            disabled={saving}
            onPress={handleSave}
          />
        </View>
        <View className="flex-1">
          <AppButton
            title="إلغاء"
            variant="secondary"
            size="lg"
            disabled={saving}
            onPress={onBack}
          />
        </View>
      </View>
    </View>
  );
}

export function MerchantBranchEditorScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    branchId?: string;
    businessId?: string;
    preview?: string;
  }>();

  const isEditMode = params.mode === 'edit' || Boolean(params.branchId);
  const branchId = params.branchId;

  const {
    activeBusinessId,
    isSyntheticPreview,
  } = useActiveBusiness();

  const { data: branches = [], isLoading: branchesLoading, error: branchesError, refetch: refetchBranches } = useBusinessBranches(activeBusinessId);

  // Find target branch if in edit mode
  const currentBranch: Branch | undefined = branches.find((b) => b.id === branchId) || (
    isSyntheticPreview && isEditMode
      ? {
          id: branchId || 'branch-tahrir-uuid',
          name: 'الفرع الرئيسي',
          business_id: activeBusinessId || 'dev-synthetic-business-uuid',
          city: 'تعز',
          address_line: 'عنوان توضيحي',
          district: 'المنطقة/المديرية',
          status: 'approved',
          is_primary: true,
        }
      : undefined
  );

  const unavailable = isEditMode && !isSyntheticPreview && !currentBranch;
  const handleBack = () => {
    router.replace({
      pathname: '/business/branches',
      params: {
        ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  return (
    <MerchantScaffold
      currentTab="businesses"
      title="بيانات الفرع"
      subtitle="بيانات موقع الفرع التشغيلي وعنوانه المعتمد"
      showBusinessSelector={false}
    >
      {unavailable ? (
        <View className="rounded-2xl border border-border p-5 gap-3">
          <AppText variant="heading" className="text-right">
            {branchesLoading ? 'جارٍ تحميل بيانات الفرع...' : branchesError ? 'تعذر تحميل الفرع' : 'الفرع غير متاح'}
          </AppText>
          <AppText muted className="text-right">
            {branchesLoading ? 'يرجى انتظار التحقق من الفرع والصلاحيات.' :
              'لم يُعثر على فرع مسموح بتعديله ضمن النشاط الحالي.'}
          </AppText>
          {branchesError ? <AppButton title="إعادة المحاولة" onPress={() => void refetchBranches()} /> : null}
          <AppButton title="العودة إلى الفروع" variant="outline" onPress={handleBack} />
        </View>
      ) : <BranchEditorForm
        key={currentBranch?.id || 'new-branch'}
        initialBranch={currentBranch}
        isEditMode={isEditMode}
        branchId={branchId}
        businessId={activeBusinessId || ''}
        isSyntheticPreview={isSyntheticPreview}
        onBack={handleBack}
      />}
    </MerchantScaffold>
  );
}
