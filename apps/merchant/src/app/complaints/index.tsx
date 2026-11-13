import { ActiveBusinessProvider } from '../../features/business/context/ActiveBusinessContext';
import { MerchantComplaintsScreen } from '../../features/complaints/components/MerchantComplaintsScreen';
import { MerchantRouteGate } from '../../features/navigation/MerchantRouteGate';

export default function MerchantComplaintsRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <MerchantComplaintsScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
