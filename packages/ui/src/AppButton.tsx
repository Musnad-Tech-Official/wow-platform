import { Pressable, Text } from 'react-native';

type AppButtonProps = {
  title: string;
  onPress: () => void;
};

export function AppButton({
  title,
  onPress,
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 14,
        backgroundColor: '#F5B700',
        borderRadius: 12,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#111', fontWeight: '600' }}>
        {title}
      </Text>
    </Pressable>
  );
}