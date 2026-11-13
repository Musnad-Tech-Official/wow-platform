import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { MerchantTeamScreen } from '../../../features/team/components/MerchantTeamScreen';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';

export default function MerchantTeamRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <MerchantTeamScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
