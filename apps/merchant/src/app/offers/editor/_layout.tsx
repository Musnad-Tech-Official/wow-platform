import React from 'react';
import { Slot } from 'expo-router';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';
import { ActiveBusinessProvider } from '../../../features/business/context/ActiveBusinessContext';
import { OfferEditorProvider } from '../../../features/offers/context/OfferEditorContext';

/**
 * Keep one editor provider mounted across all five steps.
 * Previously each step re-created its own provider, discarding unsaved state.
 */
export default function OfferEditorLayout() {
  return (
    <MerchantRouteGate>
      <ActiveBusinessProvider>
        <OfferEditorProvider>
          <Slot />
        </OfferEditorProvider>
      </ActiveBusinessProvider>
    </MerchantRouteGate>
  );
}
