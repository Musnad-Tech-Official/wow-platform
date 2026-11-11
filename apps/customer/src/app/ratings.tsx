import { useLocalSearchParams } from 'expo-router';
import { CustomerMyRatingsScreen } from '../features/rating/CustomerMyRatingsScreen';

export default function MyRatingsRoute() {
  const { preview } = useLocalSearchParams<{
    preview?: string;
  }>();

  // Development-only preview query parameter for offline visual QA and screenshot capture
  const previewMode =
    __DEV__ && preview
      ? (preview as 'live' | 'populated' | 'empty' | 'guest' | 'loading' | 'error')
      : 'live';

  return <CustomerMyRatingsScreen previewMode={previewMode} />;
}
