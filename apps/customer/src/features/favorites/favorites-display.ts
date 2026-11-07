import type { PublicBusinessDetails, PublicOfferDetails } from '@wow/api';
import { formatDiscoveryPrice } from '../home/home-data';
import { formatOfferCount, isSafePublicImageUrl } from '../business/business-display';

export interface SavedOfferItem {
  id: string; // The saved_offers record id
  offerId: string; // The public offer uuid
  createdAt: string;
  details?: PublicOfferDetails | null;
  isUnavailable?: boolean;
}

export interface SavedBusinessItem {
  id: string; // The saved_businesses record id
  businessId: string; // The public business uuid
  createdAt: string;
  details?: PublicBusinessDetails | null;
  isUnavailable?: boolean;
}

export interface OfferStatusBadge {
  label: string;
  tone: 'success' | 'danger' | 'warning' | 'neutral';
}

/** Determines whether an offer is active, upcoming, or expired based on start and end dates. */
export function getOfferStatus(
  startsAt?: string | null,
  endsAt?: string | null,
): OfferStatusBadge {
  if (!startsAt || !endsAt) {
    return { label: 'متاح', tone: 'success' };
  }
  const now = Date.now();
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();

  if (!isNaN(startMs) && now < startMs) {
    return { label: 'قريباً', tone: 'warning' };
  }
  if (!isNaN(endMs) && now > endMs) {
    return { label: 'منتهي', tone: 'danger' };
  }
  return { label: 'متاح', tone: 'success' };
}

/** Formats saved offer count with authentic Arabic inflection. */
export function formatSavedOffersCount(count: number): string {
  if (count <= 0) return 'لا توجد عروض';
  const numAr = count.toLocaleString('ar-YE');
  if (count === 1) return 'عرض واحد';
  if (count === 2) return 'عروضان';
  if (count >= 3 && count <= 10) return `${numAr} عروض`;
  return `${numAr} عرض`;
}

/** Formats saved businesses count with authentic Arabic inflection. */
export function formatSavedBusinessesCount(count: number): string {
  if (count <= 0) return 'لا يوجد تجار';
  const numAr = count.toLocaleString('ar-YE');
  if (count === 1) return 'تاجر واحد';
  if (count === 2) return 'تاجران';
  if (count >= 3 && count <= 10) return `${numAr} تجار`;
  return `${numAr} تاجر`;
}

export type FavoriteCardPresentation =
  | { state: 'retry'; title: string; description: string; canRetry: true; canRemove: false }
  | { state: 'unavailable'; title: string; description: string; canRetry: false; canRemove: true }
  | { state: 'ready'; canRetry: false; canRemove: false };

/** Resolves favorite card UI presentation based on query error status and data presence. */
export function resolveFavoriteCardPresentation(options: {
  kind: 'offer' | 'business';
  isError: boolean;
  hasDetails: boolean;
}): FavoriteCardPresentation {
  if (options.isError) {
    return {
      state: 'retry',
      title: options.kind === 'offer' ? 'تعذر تحميل العرض' : 'تعذر تحميل المتجر',
      description: 'حدث خطأ أثناء الاتصال بالخادم. يمكنك إعادة المحاولة.',
      canRetry: true,
      canRemove: false,
    };
  }
  if (!options.hasDetails) {
    return {
      state: 'unavailable',
      title: options.kind === 'offer' ? 'عرض غير متوفر حالياً' : 'متجر غير متوفر حالياً',
      description: 'تمت إزالة هذا العنصر من العرض العام أو انتهت صلاحيته.',
      canRetry: false,
      canRemove: true,
    };
  }
  return {
    state: 'ready',
    canRetry: false,
    canRemove: false,
  };
}

export { formatDiscoveryPrice, formatOfferCount, isSafePublicImageUrl };
