import { Platform, StyleSheet } from 'react-native';

// React Native Web also needs dir to propagate direction through its locale context.
export const rtlProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

export const rtlStyles = StyleSheet.create({
  layout: { direction: 'rtl' },
  text: { writingDirection: 'rtl' },
});
