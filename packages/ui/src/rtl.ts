import { Platform, StyleSheet } from 'react-native';

// React Native Web also needs dir to propagate direction through its locale context.
export const rtlProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

export const rtlStyles = StyleSheet.create({
  // React Native Web accepts the dir prop, not direction in a style object.
  layout: Platform.OS === 'web' ? {} : { direction: 'rtl' as const },
  text: { writingDirection: 'rtl' },
});
