import React from 'react';
import { MerchantRouteGate } from '../../features/navigation/MerchantRouteGate';
import { ActiveBusinessProvider } from '../../features/business/context/ActiveBusinessContext';
import { OfferDetailsScreen } from '../../features/offers/components/OfferDetailsScreen';

export default function OfferDetailsRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <OfferDetailsScreen />
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
