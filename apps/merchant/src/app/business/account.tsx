import { ActiveBusinessProvider } from '../../features/business/context/ActiveBusinessContext';
import { MerchantAccountScreen } from '../../features/account/components/MerchantAccountScreen';
import { MerchantRouteGate } from '../../features/navigation/MerchantRouteGate';

export default function MerchantAccountRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <MerchantAccountScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
