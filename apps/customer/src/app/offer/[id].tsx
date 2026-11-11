import { useLocalSearchParams } from 'expo-router';
import { CustomerOfferDetailsScreen } from '../../features/offer/CustomerOfferDetailsScreen';
import { FIXTURE_OFFER } from '../../features/complaint';
import {
  FIXTURE_RATING_OFFER,
  FIXTURE_RATING_OFFER_ID,
} from '../../features/rating/rating-display';

export default function OfferDetailsRoute() {
  const { id, fixture } = useLocalSearchParams<{ id: string; fixture?: string }>();
  const offerId = Array.isArray(id) ? id[0] : id ?? '';
  const isFixture =
    __DEV__ &&
    (fixture === 'true' ||
      offerId === FIXTURE_OFFER.id ||
      offerId === FIXTURE_RATING_OFFER_ID);

  const mockOffer =
    isFixture && offerId === FIXTURE_RATING_OFFER_ID
      ? FIXTURE_RATING_OFFER
      : isFixture
      ? FIXTURE_OFFER
      : undefined;

  return (
    <CustomerOfferDetailsScreen
      offerId={offerId || FIXTURE_RATING_OFFER_ID}
      mockOffer={mockOffer}
    />
  );
}
