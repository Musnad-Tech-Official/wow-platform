import { ActiveBusinessProvider } from '../../features/business/context/ActiveBusinessContext';
import { MerchantSubscriptionScreen } from '../../features/subscription/components/MerchantSubscriptionScreen';
import { MerchantRouteGate } from '../../features/navigation/MerchantRouteGate';

export default function MerchantSubscriptionRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <MerchantSubscriptionScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
