import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { MerchantBranchesScreen } from '../../../features/branches/components/MerchantBranchesScreen';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';

export default function MerchantBranchesRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <MerchantBranchesScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
