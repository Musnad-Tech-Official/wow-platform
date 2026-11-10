import { ActiveBusinessProvider } from '../features/business/context/ActiveBusinessContext';
import { MerchantDashboardScreen } from '../features/dashboard/components/MerchantDashboardScreen';

export default function MerchantHomeScreen() {
  return <ActiveBusinessProvider><MerchantDashboardScreen /></ActiveBusinessProvider>;
}
