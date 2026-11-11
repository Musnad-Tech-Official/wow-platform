import React from 'react';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';
import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { OfferEditorProvider } from '../../../features/offers/context/OfferEditorContext';
import { OfferEvidenceScreen } from '../../../features/offers/components/OfferEvidenceScreen';

export default function OfferEditorEvidenceRoute() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <OfferEditorProvider>
          <OfferEvidenceScreen />
        </OfferEditorProvider>
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
