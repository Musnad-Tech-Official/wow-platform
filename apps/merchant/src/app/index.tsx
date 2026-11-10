import { ActiveBusinessProvider } from '../features/business/context/ActiveBusinessContext';
import { MerchantDashboardScreen } from '../features/dashboard/components/MerchantDashboardScreen';
import { MerchantRouteGate } from '../features/navigation/MerchantRouteGate';

export default function MerchantHomeScreen() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider><MerchantDashboardScreen /></ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
