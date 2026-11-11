import React from 'react';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';
import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { OfferEditorProvider } from '../../../features/offers/context/OfferEditorContext';
import { OfferReviewScreen } from '../../../features/offers/components/OfferReviewScreen';

export default function OfferEditorReviewRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <OfferEditorProvider>
          <OfferReviewScreen />
        </OfferEditorProvider>
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
