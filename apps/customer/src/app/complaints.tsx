import { useLocalSearchParams } from 'expo-router';
import { CustomerMyComplaintsScreen } from '../features/complaint';

export default function MyComplaintsRoute() {
  const { preview } = useLocalSearchParams<{
    preview?: string;
  }>();

  // Development-only preview query parameter for offline visual QA and screenshot capture
  const previewMode =
    __DEV__ && preview
      ? (preview as 'live' | 'populated' | 'empty' | 'guest' | 'loading' | 'auth_loading' | 'error' | 'filtered_empty')
      : 'live';

  return <CustomerMyComplaintsScreen previewMode={previewMode} />;
}
