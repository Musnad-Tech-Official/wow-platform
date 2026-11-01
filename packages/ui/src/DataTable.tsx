import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface DataTableColumn<Row> {
  key: string;
  title: string;
  width?: number;
  render: (row: Row) => ReactNode;
}
export interface DataTableProps<Row> {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string;
  emptyLabel?: string;
}

/** Horizontally scrollable on phones; never crush admin review columns. */
export function DataTable<Row>({ columns, rows, getRowKey, emptyLabel = 'لا توجد بيانات' }: DataTableProps<Row>) {
  const colors = useWowColors();
  return (
    <ScrollView {...rtlProps} horizontal showsHorizontalScrollIndicator
      contentContainerStyle={{ flexGrow: 1 }}>
      <View {...rtlProps} style={{ minWidth: columns.reduce((sum, col) => sum + (col.width ?? 160), 0),
        borderWidth: 1, borderRadius: 12, borderColor: colors.border, overflow: 'hidden' }}>
        <View {...rtlProps} className="flex-row" style={{ backgroundColor: colors.surface }}>
          {columns.map(col => <View key={col.key} style={{ width: col.width ?? 160, minHeight: 48,
            justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 }}>
            <AppText variant="label">{col.title}</AppText>
          </View>)}
        </View>
        {rows.length === 0 ? (
          <View style={{ padding: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
            <AppText muted>{emptyLabel}</AppText>
          </View>
        ) : rows.map(row => (
          <View {...rtlProps} key={getRowKey(row)} className="min-h-12 flex-row"
            style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
            {columns.map(col => (
              <View key={col.key} style={{ width: col.width ?? 160, minHeight: 52,
                paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' }}>
                {col.render(row)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
