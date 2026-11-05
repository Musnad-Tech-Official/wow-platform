import { View } from 'react-native';
import { AppButton, BottomSheet, SearchField } from '@wow/ui';

export interface SearchSheetProps {
  visible: boolean;
  query: string;
  onChangeQuery: (text: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  onClose: () => void;
}

export function SearchSheet({
  visible,
  query,
  onChangeQuery,
  onApplySearch,
  onClearSearch,
  onClose,
}: SearchSheetProps) {
  return (
    <BottomSheet visible={visible} title="البحث في العروض" onClose={onClose}>
      <View style={{ gap: 16 }}>
        <SearchField
          value={query}
          onChangeText={onChangeQuery}
          onSubmitSearch={() => {
            onApplySearch();
            onClose();
          }}
          label="البحث"
          placeholder="ابحث عن عرض أو تاجر..."
          autoFocus={visible}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton
              title="تطبيق البحث"
              variant="primary"
              onPress={() => {
                onApplySearch();
                onClose();
              }}
            />
          </View>

          {query.trim().length > 0 && (
            <View style={{ flex: 1 }}>
              <AppButton
                title="مسح البحث"
                variant="outline"
                onPress={() => {
                  onClearSearch();
                  onClose();
                }}
              />
            </View>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}
