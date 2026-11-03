import { ScrollView } from 'react-native';
import { FilterChip } from '@wow/ui';
import type { CategoryId, CategoryItem } from './home-data';

export interface CategoryFiltersProps {
  categories: CategoryItem[];
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
}

export function CategoryFilters({
  categories,
  selectedCategory,
  onSelectCategory,
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
      {categories.map((category) => (
        <FilterChip
          key={category.id}
          label={category.label}
          selected={selectedCategory === category.id}
          onPress={() => onSelectCategory(category.id)}
        />
      ))}
    </ScrollView>
  );
}
