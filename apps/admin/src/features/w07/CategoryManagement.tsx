import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { FolderTree, Search, ShieldCheck } from 'lucide-react-native';
import {
  useAdminCategories, useAdminBusinessCategories,
  useAdminUpsertCategory, useAdminSetBusinessCategories,
  type AdminCategory, type AdminBusinessCategoryRow,
} from '@wow/api';
import { AppButton, AppText, Badge, Card } from '@wow/ui';
import { useTheme, useWowColors } from '@wow/theme';
import type { AdminRole } from '../auth/admin-access';
import {
  canSubmitW06Decision, W06Header, W06Message, w06ErrorMessage,
} from '../w06/W06Shared';

const isSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

function ToggleRow({
  label, checked, onPress, disabled,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }}
      disabled={disabled} onPress={onPress}
      className={'flex-row gap-2 items-center rounded-xl border p-3 ' +
        (checked ? (isDark ? 'border-[#FACC15] bg-[#422E12]' : 'border-[#FACC15] bg-[#FEFCE8]') : 'border-border bg-background')}>
      <View className="h-5 w-5 rounded border border-[#A16207] items-center justify-center">
        {checked && <ShieldCheck size={15} color="#A16207" />}
      </View>
      <AppText className="flex-1 font-tajawal-medium text-sm text-right">{label}</AppText>
    </Pressable>
  );
}

export function CategoryManagement({ role }: { role: AdminRole | null }) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const categoriesQuery = useAdminCategories();
  const [businessSearch, setBusinessSearch] = useState('');
  const businessesQuery = useAdminBusinessCategories(businessSearch.trim().slice(0, 100), 30);
  const edit = useAdminUpsertCategory();
  const assign = useAdminSetBusinessCategories();
  const categories = categoriesQuery.data ?? [];
  const businesses = businessesQuery.data ?? [];
  const canEditCategories = role === 'super_admin';
  const canAssign = canSubmitW06Decision(role);

  // Category form: inactive entries are included, even though public discovery hides them.
  const [editId, setEditId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(false);
  const [confirmCategory, setConfirmCategory] = useState(false);

  // Assignments: explicit selection and reason; never write an empty list implicitly.
  const [selectedBusiness, setSelectedBusiness] = useState<AdminBusinessCategoryRow | null>(null);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmAssign, setConfirmAssign] = useState(false);
  const selectableCategories = categories.filter((category) => category.is_active &&
    (!category.parent_id || categories.some((parent) =>
      parent.id === category.parent_id && parent.is_active)));
  const parsedSortOrder = Number(sortOrder);
  const validCategory = canEditCategories && isSlug(slug.trim()) &&
    nameAr.trim().length >= 2 && Number.isInteger(parsedSortOrder) &&
    Math.abs(parsedSortOrder) <= 100000 && !edit.isPending;
  // Do not silently delete assignments omitted from the active-category picker.
  const hiddenAssignmentIds = (selectedBusiness?.category_ids ?? []).filter((id) =>
    !selectableCategories.some((category) => category.id === id));
  const validAssignment = canAssign && hiddenAssignmentIds.length === 0 &&
    Boolean(selectedBusiness) && assigned.length > 0 &&
    assigned.length <= 12 && primaryId !== null && assigned.includes(primaryId) &&
    reason.trim().length >= 10 && reason.trim().length <= 1000 && !assign.isPending;

  function beginEdit(category: AdminCategory | null) {
    setEditId(category?.id ?? null);
    setSlug(category?.slug ?? '');
    setNameAr(category?.name_ar ?? '');
    setNameEn(category?.name_en ?? '');
    setParentId(category?.parent_id ?? null);
    setSortOrder(String(category?.sort_order ?? 0));
    setActive(category?.is_active ?? false);
    setConfirmCategory(false);
    edit.reset();
  }

  function chooseBusiness(business: AdminBusinessCategoryRow) {
    const known = business.category_ids.filter((id) =>
      selectableCategories.some((category) => category.id === id));
    setSelectedBusiness(business);
    setAssigned(known);
    setPrimaryId(known.includes(business.primary_category_id ?? '') ?
      business.primary_category_id : known[0] ?? null);
    setReason('');
    setConfirmAssign(false);
    assign.reset();
  }

  function toggleCategory(id: string) {
    setAssigned((previous) => {
      const next = previous.includes(id) ? previous.filter((value) => value !== id) :
        previous.length >= 12 ? previous : [...previous, id];
      if (!next.includes(primaryId ?? '')) setPrimaryId(next[0] ?? null);
      return next;
    });
    setConfirmAssign(false);
  }

  async function saveCategory() {
    if (!validCategory || !confirmCategory) return;
    try {
      await edit.mutateAsync({
        id: editId, slug: slug.trim(), nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || null, parentId, sortOrder: parsedSortOrder, active,
      });
      beginEdit(null);
    } catch {
      setConfirmCategory(false);
    }
  }

  async function saveAssignment() {
    if (!validAssignment || !confirmAssign || !selectedBusiness) return;
    try {
      await assign.mutateAsync({
        businessId: selectedBusiness.business_id,
        categoryIds: assigned,
        primaryCategoryId: primaryId,
        reason: reason.trim(),
      });
      setSelectedBusiness(null);
      setAssigned([]);
      setPrimaryId(null);
      setReason('');
      setConfirmAssign(false);
    } catch {
      setConfirmAssign(false);
    }
  }

  const field = (label: string, value: string, change: (s: string) => void,
    placeholder = '', enabled = true) => (
    <View className="gap-1 flex-1">
      <AppText variant="caption" muted className="text-xs text-right">{label}</AppText>
      <TextInput value={value} onChangeText={(text) => { change(text); setConfirmCategory(false); }}
        editable={enabled} accessibilityLabel={label} placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        className="rounded-xl border border-border bg-background p-3 text-right font-tajawal"
        style={{ color: colors.foreground, minHeight: 44 }} />
    </View>
  );

  return (
    <View className="gap-6">
      <W06Header section="إدارة التصنيفات" title="التصنيفات وربط الأنشطة"
        description="التعديلات مرتبطة بصلاحيات المسؤول؛ التصنيفات غير النشطة لا تظهر للعميل." />
      {categoriesQuery.isPending && <W06Message title="جارٍ تحميل التصنيفات…" kind="info" />}
      {categoriesQuery.isError && <W06Message title="تعذر تحميل التصنيفات الإدارية"
        kind="error" retry={() => void categoriesQuery.refetch()} />}
      {categoriesQuery.isSuccess && categories.length === 0 &&
        <W06Message title="لا توجد تصنيفات مسجلة" detail="يمكن للمسؤول الأعلى إضافة التصنيف الأول." />}

      {categoriesQuery.isSuccess && (
        <View className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card className="border border-border p-4 sm:p-6 gap-4">
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <FolderTree size={19} color="#A16207" />
                <AppText className="text-lg font-tajawal-bold">شجرة التصنيفات</AppText>
              </View>
              {canEditCategories &&
                <AppButton title="تصنيف جديد" size="sm" variant="outline"
                  onPress={() => beginEdit(null)} />}
            </View>
            {categories.map((category) => (
              <Pressable key={category.id} accessibilityRole="button"
                accessibilityLabel={'عرض التصنيف ' + category.name_ar}
                onPress={() => { if (canEditCategories) beginEdit(category); }}
                className="rounded-xl border border-border p-3 flex-row items-center gap-3">
                <Badge label={category.is_active ? 'نشط' : 'متوقف'} variant="secondary" />
                <View className="flex-1 gap-1">
                  <AppText className="font-tajawal-bold text-sm text-right">{category.name_ar}</AppText>
                  <AppText variant="caption" muted className="text-xs text-right">
                    {category.slug} {category.parent_id ? '• تصنيف فرعي' : '• تصنيف رئيسي'}
                  </AppText>
                </View>
              </Pressable>
            ))}
            {!canEditCategories && <W06Message kind="info" title="تعديل التصنيفات محصور بالمسؤول الأعلى"
              detail="يمكن للمراجع المخوّل ربط التصنيفات النشطة بالأنشطة دون تعديل أسماء التصنيفات." />}
          </Card>

          <Card className="border border-border p-4 sm:p-6 gap-4">
            <AppText className="text-lg font-tajawal-bold text-right">
              {editId ? 'تعديل تصنيف' : 'إنشاء تصنيف'}
            </AppText>
            {!canEditCategories ? <W06Message kind="info" title="هذه العملية غير متاحة لدورك" /> : (
              <>
                <View className="gap-3">
                  {field('المعرّف النصي (slug)',slug,setSlug,'example-category')}
                  {field('الاسم العربي',nameAr,setNameAr,'اسم التصنيف')}
                  {field('الاسم الإنجليزي (اختياري)',nameEn,setNameEn)}
                  {field('ترتيب العرض',sortOrder,setSortOrder,'0')}
                  <AppText className="font-tajawal-bold text-sm text-right">التصنيف الأب</AppText>
                  <View className="flex-row flex-wrap gap-2">
                    {[{ id: null, name_ar: 'تصنيف رئيسي' },
                      ...categories.filter((category) => category.parent_id === null &&
                        category.id !== editId).map((category) => ({
                        id: category.id, name_ar: category.name_ar,
                      }))].map((parent) => (
                        <Pressable key={parent.id ?? 'root'} accessibilityRole="button"
                          accessibilityState={{ selected: parentId === parent.id }}
                          onPress={() => { setParentId(parent.id); setConfirmCategory(false); }}
                          className={'rounded-xl border px-3 py-2 ' +
                            (parentId === parent.id ? (isDark ? 'border-[#FACC15] bg-[#422E12]' : 'border-[#FACC15] bg-[#FEF3C7]') : 'border-border')}>
                          <AppText className="font-tajawal-medium text-xs text-right">{parent.name_ar}</AppText>
                        </Pressable>
                      ))}
                  </View>
                  <ToggleRow label="التصنيف نشط" checked={active}
                    onPress={() => { setActive((value) => !value); setConfirmCategory(false); }} />
                </View>
                {edit.isError && <W06Message kind="error" title="فشل حفظ التصنيف"
                  detail={w06ErrorMessage(edit.error)} />}
                <ToggleRow label="أؤكد حفظ هذا التعديل الإداري" checked={confirmCategory}
                  disabled={!validCategory}
                  onPress={() => setConfirmCategory((value) => !value)} />
                <AppButton title={edit.isPending ? 'جارٍ الحفظ…' : 'حفظ التصنيف'}
                  disabled={!validCategory || !confirmCategory}
                  onPress={() => void saveCategory()} />
              </>
            )}
          </Card>
        </View>
      )}

      <Card className="border border-border p-4 sm:p-6 gap-4">
        <AppText className="text-lg font-tajawal-bold text-right">ربط التصنيفات بالأنشطة</AppText>
        <AppText variant="caption" muted className="text-xs text-right">
          اختر النشاط، ثم التصنيفات النشطة (حتى 12) والتصنيف الأساسي. يَستبدل الخادم التعيين كاملاً مع تسجيل السبب.
        </AppText>
        <View className="flex-row items-center gap-2 border border-border rounded-xl p-2.5">
          <Search size={18} color={colors.mutedForeground} />
          <TextInput value={businessSearch} onChangeText={(value) => {
            setBusinessSearch(value); setSelectedBusiness(null); setConfirmAssign(false);
          }} placeholder="ابحث باسم النشاط أو معرّفه"
            placeholderTextColor={colors.mutedForeground}
            className="flex-1 font-tajawal text-sm text-right"
            style={{ color: colors.foreground, minHeight: 34 }}
            accessibilityLabel="البحث عن نشاط للتصنيفات" />
        </View>
        {businessesQuery.isPending && <W06Message title="جارٍ البحث عن الأنشطة…" kind="info" />}
        {businessesQuery.isError && <W06Message title="تعذر تحميل الأنشطة" kind="error"
          retry={() => void businessesQuery.refetch()} />}
        {businessesQuery.isSuccess && businesses.length === 0 &&
          <W06Message title="لا توجد أنشطة مطابقة" />}
        {businessesQuery.isSuccess && (
          <View className="gap-2">
            {businesses.map((business) => (
              <Pressable key={business.business_id} accessibilityRole="button"
                accessibilityState={{ selected: selectedBusiness?.business_id === business.business_id }}
                onPress={() => chooseBusiness(business)}
                className={'rounded-xl border p-3 gap-1 ' +
                  (selectedBusiness?.business_id === business.business_id
                    ? (isDark ? 'border-[#FACC15] bg-[#422E12]' : 'border-[#FACC15] bg-[#FEFCE8]') : 'border-border')}>
                <AppText className="text-sm font-tajawal-bold text-right">{business.business_name}</AppText>
                <AppText variant="caption" muted className="text-xs text-right">
                  {business.business_status} • {business.category_ids.length} تصنيفات معتمدة
                </AppText>
              </Pressable>
            ))}
          </View>
        )}
        {selectedBusiness && (
          <View className="gap-4 border-t border-border pt-4">
            <AppText className="text-base font-tajawal-bold text-right">
              التعيينات المعتمدة للنشاط: {selectedBusiness.business_name}
            </AppText>
            {!canAssign && <W06Message kind="info" title="تغيير التعيينات يتطلب دور مراجع أو مسؤول أعلى" />}
            {hiddenAssignmentIds.length > 0 && (
              <W06Message kind="error" title="توجد تعيينات تصنيفات غير ظاهرة في الخيارات"
                detail="لا يمكن حفظ استبدال التصنيفات بينما توجد تعيينات متوقفة أو غير متاحة؛ قد يؤدي الحفظ إلى حذفها دون قصد. يجب معالجة التصنيفات أولًا." />
            )}
            <View className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectableCategories.map((category) => (
                <ToggleRow key={category.id} label={category.name_ar}
                  checked={assigned.includes(category.id)} disabled={!canAssign}
                  onPress={() => toggleCategory(category.id)} />
              ))}
            </View>
            <AppText className="text-sm font-tajawal-bold text-right">التصنيف الأساسي</AppText>
            <View className="flex-row flex-wrap gap-2">
              {selectableCategories.filter((category) => assigned.includes(category.id)).map((category) => (
                <Pressable key={category.id} accessibilityRole="button"
                  accessibilityState={{ selected: primaryId === category.id }}
                  disabled={!canAssign}
                  onPress={() => { setPrimaryId(category.id); setConfirmAssign(false); }}
                  className={'rounded-xl border px-3 py-2 ' +
                    (primaryId === category.id ? (isDark ? 'border-[#FACC15] bg-[#422E12]' : 'border-[#FACC15] bg-[#FEF3C7]') : 'border-border')}>
                  <AppText className="text-xs font-tajawal-bold text-right">{category.name_ar}</AppText>
                </Pressable>
              ))}
            </View>
            {canAssign && (
              <>
                <TextInput multiline value={reason} onChangeText={(value) => {
                  setReason(value); setConfirmAssign(false);
                }} placeholder="سبب اعتماد هذه التصنيفات (10 أحرف على الأقل)"
                  placeholderTextColor={colors.mutedForeground}
                  className="rounded-xl border border-border p-3 font-tajawal text-right"
                  style={{ color: colors.foreground, minHeight: 88, textAlignVertical: 'top' }}
                  accessibilityLabel="سبب ربط التصنيفات بالنشاط" />
                {assign.isError && <W06Message kind="error" title="رفض الخادم تغيير التصنيفات"
                  detail={w06ErrorMessage(assign.error)} />}
                <ToggleRow label="أؤكد استبدال تصنيفات هذا النشاط وتسجيل سبب القرار"
                  checked={confirmAssign} disabled={!validAssignment}
                  onPress={() => setConfirmAssign((value) => !value)} />
                <AppButton title={assign.isPending ? 'جارٍ الحفظ…' : 'اعتماد التصنيفات للنشاط'}
                  disabled={!validAssignment || !confirmAssign}
                  onPress={() => void saveAssignment()} />
              </>
            )}
          </View>
        )}
      </Card>
    </View>
  );
}
