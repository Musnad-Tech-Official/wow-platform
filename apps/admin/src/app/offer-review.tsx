import React from 'react';
import { W06GuardedPage } from '../features/w06/W06Shared';
import { OfferQueue } from '../features/w07/OfferQueue';

export default function AdminOfferQueuePage() {
  return <W06GuardedPage title="مراجعة العروض">{() => <OfferQueue />}</W06GuardedPage>;
}
