import { View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { rtlProps } from './rtl';
import { clampPage } from './ui-math';

export interface PaginationProps {
  page: number; // 1-based
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const colors = useWowColors();
  const max = Math.max(1, Math.floor(totalPages));
  const current = clampPage(page, max);
  return (
    <View {...rtlProps} className="min-h-12 flex-row items-center justify-center gap-3">
      <IconButton accessibilityLabel="الصفحة السابقة" disabled={current <= 1} onPress={() => onPageChange(current - 1)}>
        <ChevronRight color={colors.foreground} size={20}/>
      </IconButton>
      <AppText variant="label" style={{ textAlign: 'center' }}>{current} من {max}</AppText>
      <IconButton accessibilityLabel="الصفحة التالية" disabled={current >= max} onPress={() => onPageChange(current + 1)}>
        <ChevronLeft color={colors.foreground} size={20}/>
      </IconButton>
    </View>
  );
}
