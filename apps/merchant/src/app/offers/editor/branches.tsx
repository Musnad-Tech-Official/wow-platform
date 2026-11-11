import React from 'react';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';
import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { OfferEditorProvider } from '../../../features/offers/context/OfferEditorContext';
import { OfferBranchesScreen } from '../../../features/offers/components/OfferBranchesScreen';

export default function OfferEditorBranchesRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <OfferEditorProvider>
          <OfferBranchesScreen />
        </OfferEditorProvider>
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
