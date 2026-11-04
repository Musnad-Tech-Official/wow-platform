import { ScrollView } from 'react-native';
import { FilterChip } from '@wow/ui';
import type { CategoryFilterItem } from './home-data';

export interface CategoryFiltersProps {
  categories: CategoryFilterItem[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  isLoading?: boolean;
}

export function CategoryFilters({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading = false,
}: CategoryFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        gap: 8,
        alignItems: 'center',
        flexDirection: 'row',
      }}
    >
      {categories.map((category) => {
        const isSelected = selectedCategoryId === category.id;
        return (
          <FilterChip
            key={category.id ?? 'all'}
            label={category.label}
            selected={isSelected}
            onPress={() => onSelectCategory(category.id)}
            disabled={isLoading}
          />
        );
      })}
    </ScrollView>
  );
}
