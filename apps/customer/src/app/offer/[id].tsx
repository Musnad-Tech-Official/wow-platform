import { useLocalSearchParams } from 'expo-router';
import { CustomerOfferDetailsScreen } from '../../features/offer/CustomerOfferDetailsScreen';
import { FIXTURE_OFFER } from '../../features/complaint';

export default function OfferDetailsRoute() {
  const { id, fixture } = useLocalSearchParams<{ id: string; fixture?: string }>();
  const offerId = Array.isArray(id) ? id[0] : id ?? '';
  const isFixture = __DEV__ && (fixture === 'true' || offerId === FIXTURE_OFFER.id);

  return (
    <CustomerOfferDetailsScreen
      offerId={offerId}
      mockOffer={isFixture ? FIXTURE_OFFER : undefined}
    />
  );
}
