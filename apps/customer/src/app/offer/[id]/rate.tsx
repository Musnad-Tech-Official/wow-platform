import { useLocalSearchParams } from 'expo-router';
import { CustomerRateOfferScreen } from '../../../features/rating/CustomerRateOfferScreen';
import {
  FIXTURE_RATING_OFFER,
  FIXTURE_RATING_OFFER_ID,
} from '../../../features/rating/rating-display';

export default function RateOfferRoute() {
  const { id, offerId: queryOfferId, fixture, guest, preview } = useLocalSearchParams<{
    id?: string | string[];
    offerId?: string | string[];
    fixture?: string;
    guest?: string;
    preview?: string;
  }>();

  const rawId = Array.isArray(id) ? id[0] : id;
  const rawOfferId = Array.isArray(queryOfferId) ? queryOfferId[0] : queryOfferId;
  const offerId = rawId || rawOfferId || '';

  const isFixtureMode =
    __DEV__ && (fixture === 'true' || offerId === FIXTURE_RATING_OFFER_ID || Boolean(preview));
  const isGuestMode = isFixtureMode && (guest === 'true' || preview === 'guest');

  return (
    <CustomerRateOfferScreen
      offerId={offerId || FIXTURE_RATING_OFFER_ID}
      mockOffer={isFixtureMode ? FIXTURE_RATING_OFFER : undefined}
      previewMode={
        isFixtureMode && preview
          ? (preview as 'live' | 'form' | 'success' | 'guest' | 'error_14day' | 'could_not_verify' | 'already_rated')
          : isGuestMode
          ? 'guest'
          : 'live'
      }
      initialAuthOverride={
        isFixtureMode
          ? {
              isLoaded: true,
              isSignedIn: !isGuestMode,
              userId: isGuestMode ? undefined : 'usr_dev_rating_fixture',
            }
          : undefined
      }
    />
  );
}
