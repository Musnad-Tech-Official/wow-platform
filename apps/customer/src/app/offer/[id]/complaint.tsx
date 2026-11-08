import { useLocalSearchParams } from 'expo-router';
import { CustomerSubmitComplaintScreen } from '../../../features/complaint';
import { FIXTURE_OFFER } from '../../../features/complaint/complaint-display';

export default function SubmitComplaintRoute() {
  const { id, offerId: queryOfferId, fixture, guest } = useLocalSearchParams<{
    id?: string | string[];
    offerId?: string | string[];
    fixture?: string;
    guest?: string;
  }>();

  const rawId = Array.isArray(id) ? id[0] : id;
  const rawOfferId = Array.isArray(queryOfferId) ? queryOfferId[0] : queryOfferId;
  const offerId = rawId || rawOfferId || '';

  const isFixtureMode = __DEV__ && (fixture === 'true' || offerId === FIXTURE_OFFER.id);
  const isGuestMode = isFixtureMode && guest === 'true';

  return (
    <CustomerSubmitComplaintScreen
      offerId={offerId}
      isFixture={isFixtureMode}
      mockOffer={isFixtureMode ? FIXTURE_OFFER : undefined}
      initialAuthOverride={
        isFixtureMode
          ? {
              isLoaded: true,
              isSignedIn: !isGuestMode,
              userId: isGuestMode ? undefined : 'user_dev_cus07_fixture',
            }
          : undefined
      }
    />
  );
}
