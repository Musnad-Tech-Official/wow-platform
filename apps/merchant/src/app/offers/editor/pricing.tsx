import React from 'react';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';
import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { OfferEditorProvider } from '../../../features/offers/context/OfferEditorContext';
import { OfferPricingScreen } from '../../../features/offers/components/OfferPricingScreen';

export default function OfferEditorPricingRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <OfferEditorProvider>
          <OfferPricingScreen />
        </OfferEditorProvider>
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
