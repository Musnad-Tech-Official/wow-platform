import { ActiveBusinessProvider } from '../../features/business/context/ActiveBusinessContext';
import { MerchantComplaintDetailsScreen } from '../../features/complaints/components/MerchantComplaintDetailsScreen';
import { MerchantRouteGate } from '../../features/navigation/MerchantRouteGate';

export default function MerchantComplaintDetailsRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <MerchantComplaintDetailsScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
