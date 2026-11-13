import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { MerchantBranchEditorScreen } from '../../../features/branches/components/MerchantBranchEditorScreen';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';

export default function MerchantBranchEditorRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <MerchantBranchEditorScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
