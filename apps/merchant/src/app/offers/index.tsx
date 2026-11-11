import { ActiveBusinessProvider } from '../../features/business/context/ActiveBusinessContext';
import { MerchantOffersScreen } from '../../features/offers/components/MerchantOffersScreen';
import { MerchantRouteGate } from '../../features/navigation/MerchantRouteGate';

export default function MerchantOffersRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider><MerchantOffersScreen /></ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
