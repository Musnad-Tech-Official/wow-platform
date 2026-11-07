import { useLocalSearchParams } from 'expo-router';
import {
  CustomerFavoritesTabScreen,
  type CustomerFavoritesTabScreenProps,
} from '../../features/favorites/CustomerFavoritesTabScreen';

export default function FavoritesTabRoute() {
  const params = useLocalSearchParams<{
    preview?: CustomerFavoritesTabScreenProps['previewState'];
  }>();

  // Synthetic preview parameters are strictly restricted to development/testing environments
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
  const previewState = isDev ? (params.preview ?? 'live') : 'live';

  return <CustomerFavoritesTabScreen previewState={previewState} />;
}
