import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

let consumers = 0;
let subscription: ReturnType<typeof AppState.addEventListener> | undefined;

// focusManager is shared by TanStack, so concurrent providers share one listener.
export function subscribeToNativeFocus(): () => void {
  if (Platform.OS === 'web') return () => {};
  if (consumers++ === 0) {
    if (AppState.currentState) focusManager.setFocused(AppState.currentState === 'active');
    subscription = AppState.addEventListener('change', status => {
      focusManager.setFocused(status === 'active');
    });
  }
  return () => {
    if (--consumers === 0) {
      subscription?.remove();
      subscription = undefined;
      focusManager.setFocused(undefined);
    }
  };
}
