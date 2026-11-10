import { ActiveBusinessProvider } from '../../features/business/context/ActiveBusinessContext';
import { MerchantOffersScreen } from '../../features/offers/components/MerchantOffersScreen';

export default function MerchantOffersRoute() {
  return <ActiveBusinessProvider><MerchantOffersScreen /></ActiveBusinessProvider>;
}
