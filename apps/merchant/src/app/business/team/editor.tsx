import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { MerchantTeamEditorScreen } from '../../../features/team/components/MerchantTeamEditorScreen';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';

export default function MerchantTeamEditorRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <MerchantTeamEditorScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
