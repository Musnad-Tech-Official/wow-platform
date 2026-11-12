import { useState, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { Check, FolderTree } from 'lucide-react-native';
import { usePublicCategories, type PublicCategory } from '@wow/api';
import { useWowColors } from '@wow/theme';
import { AppText, BottomSheet, DataState, SearchField } from '@wow/ui';

export interface CategorySelectSheetProps {
  visible: boolean;
  selectedCategoryId: string | null;
  /** When provided, restrict options to the merchant's approved activities. */
  allowedCategoryIds?: string[];
  onSelect: (category: PublicCategory) => void;
  onClose: () => void;
}

function normalizeArabicText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[يى]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء');
}

export function CategorySelectSheet({
  visible,
  selectedCategoryId,
  allowedCategoryIds,
  onSelect,
  onClose,
}: CategorySelectSheetProps) {
  const colors = useWowColors();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: allCategories = [],
    isLoading,
    isError,
    refetch,
  } = usePublicCategories();

  const categories = useMemo(() => {
    if (!allowedCategoryIds) return allCategories;
    const allowed = new Set(allowedCategoryIds);
    return allCategories.filter((category) => allowed.has(category.id));
  }, [allCategories, allowedCategoryIds]);

  // Create parent lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, PublicCategory>();
    for (const cat of categories) {
      map.set(cat.id, cat);
    }
    return map;
  }, [categories]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    const query = normalizeArabicText(searchQuery);
    if (!query) {
      // Sort parents first, then their children
      const parents = categories.filter(c => !c.parent_id);
      const childrenByParent = new Map<string, PublicCategory[]>();
      for (const cat of categories) {
        if (cat.parent_id) {
          const list = childrenByParent.get(cat.parent_id) ?? [];
          list.push(cat);
          childrenByParent.set(cat.parent_id, list);
        }
      }

      const organized: { category: PublicCategory; isChild: boolean; parentName?: string }[] = [];
      for (const parent of parents) {
        organized.push({ category: parent, isChild: false });
        const children = childrenByParent.get(parent.id) ?? [];
        for (const child of children) {
          organized.push({ category: child, isChild: true, parentName: parent.name_ar });
        }
      }
      return organized;
    }

    return categories
      .filter(cat => {
        const normAr = normalizeArabicText(cat.name_ar);
        const normEn = cat.name_en ? normalizeArabicText(cat.name_en) : '';
        return normAr.includes(query) || normEn.includes(query);
      })
      .map(cat => ({
        category: cat,
        isChild: !!cat.parent_id,
        parentName: cat.parent_id ? categoryMap.get(cat.parent_id)?.name_ar : undefined,
      }));
  }, [categories, searchQuery, categoryMap]);

  return (
    <BottomSheet visible={visible} title="اختر فئة النشاط" onClose={onClose}>
      <View className="gap-4">
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="ابحث عن فئة النشاط..."
          label="البحث عن فئة"
        />

        {isLoading ? (
          <DataState kind="loading" title="جارٍ تحميل الفئات..." />
        ) : isError ? (
          <DataState
            kind="error"
            title="تعذر تحميل الفئات. حاول مرة أخرى."
            actionLabel="إعادة المحاولة"
            onAction={() => void refetch()}
          />
        ) : categories.length === 0 ? (
          <DataState kind="empty" title={allowedCategoryIds ? 'لا توجد فئات معتمدة لهذا النشاط' : 'لا توجد فئات نشطة'} description={allowedCategoryIds ? 'أكمل اعتماد أنشطة النشاط التجاري أو اطلب إضافة فئة معتمدة.' : 'لم نتمكن من العثور على أي فئات نشطة.'} />
        ) : filteredCategories.length === 0 ? (
          <DataState kind="empty" title="لم نعثر على فئة مطابقة. جرّب كلمة أخرى." />
        ) : (
          <View className="gap-1">
            {filteredCategories.map(({ category, isChild, parentName }) => {
              const isSelected = category.id === selectedCategoryId;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${category.name_ar}${parentName ? ` (ضمن ${parentName})` : ''}`}
                  onPress={() => {
                    onSelect(category);
                    onClose();
                  }}
                  className={`min-h-12 flex-row items-center justify-between rounded-xl px-4 py-3 active:opacity-80 ${
                    isSelected ? 'border border-primary bg-primary/10' : 'bg-surface'
                  }`}
                  style={{
                    paddingRight: isChild ? 28 : 16,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? (colors.primary + '15') : colors.surface,
                  }}
                >
                  <View className="min-w-0 flex-1 items-start gap-0.5">
                    <View className="flex-row items-center gap-2">
                      {isChild ? (
                        <FolderTree size={14} color={colors.mutedForeground} strokeWidth={1.8} />
                      ) : null}
                      <AppText
                        className={isSelected ? 'font-tajawal-bold' : isChild ? 'font-tajawal' : 'font-tajawal-medium'}
                        style={{ color: colors.foreground }}
                      >
                        {category.name_ar}
                      </AppText>
                    </View>
                    {parentName ? (
                      <AppText variant="caption" muted style={{ fontSize: 12 }}>
                        فئة فرعية من: {parentName}
                      </AppText>
                    ) : null}
                  </View>

                  {isSelected ? (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={16} color={colors.primaryForeground} strokeWidth={2.5} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
