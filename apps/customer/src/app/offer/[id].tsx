import { useLocalSearchParams } from 'expo-router';
import { CustomerOfferDetailsScreen } from '../../features/offer/CustomerOfferDetailsScreen';

export default function OfferDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const offerId = Array.isArray(id) ? id[0] : id ?? '';

  return <CustomerOfferDetailsScreen offerId={offerId} />;
}
