import type { PublicBusinessCard } from '@wow/api';

/**
 * MUSNAD-WOW — Customer Home Screen Presentation Data Models & Helpers
 *
 * Provides typed presentation models for mapping real Supabase public discovery
 * RPC responses into CUS-01 UI components.
 */

export interface LiveOfferItem {
  id: string; // Genuine offer UUID
  title: string;
  price: string;
  originalPrice?: string | null;
  discountPercent?: number | null;
  benefit?: string;
  areaName?: string | null;
  startsAt?: string;
  endsAt?: string;
}

export interface LiveMerchantCard {
  id: string; // Genuine business UUID
  name: string;
  initial: string;
  categoryName: string;
  offerCount: number;
  offers: LiveOfferItem[];
  logoUrl?: string | null;
  coverUrl?: string | null;
}

export interface CategoryFilterItem {
  id: string | null; // null for "الكل", UUID for backend categories
  label: string;
}

export type AreaId = 'all';

export interface AreaItem {
  id: AreaId;
  label: string;
  city?: null;
  district?: null;
}

/**
 * Authoritative regional directory status:
 * Migration 007 supports p_city and p_district in wow_public_search_businesses,
 * but no public region directory RPC (e.g. wow_public_list_cities) exists.
 * To prevent fabricating non-existent cities or presenting unsupported filters
 * as functional, only "all" (كل المناطق) is provided until an authoritative
 * backend region directory capability is provisioned.
 */
export const APPROVED_AREAS: AreaItem[] = [
  { id: 'all', label: 'كل المناطق', city: null },
];

/** Formats a price amount and currency symbol in authentic Arabic numerals. */
export function formatDiscoveryPrice(
  amount: string | number | null | undefined,
  currency: string = 'YER',
): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const num = typeof amount === 'number' ? amount : Number(amount);
  const currencySymbol =
    currency === 'YER' || currency === 'ر.ي'
      ? 'ر.ي'
      : currency === 'SAR' || currency === 'ر.س'
        ? 'ر.س'
        : currency;

  if (isNaN(num)) return `${amount} ${currencySymbol}`;
  return `${num.toLocaleString('ar-YE')} ${currencySymbol}`;
}

/** Maps a live PublicBusinessCard from usePublicSearchBusinesses to the UI card presentation model. */
export function mapPublicBusinessToCard(card: PublicBusinessCard): LiveMerchantCard {
  const primaryCategory = card.categories?.find((c) => c.is_primary) ?? card.categories?.[0];
  const categoryName = primaryCategory?.name_ar ?? '';
  const trimmedName = card.name?.trim() ?? '';
  const initial = trimmedName.length > 0 ? trimmedName.charAt(0) : 'و';

  const offers: LiveOfferItem[] = (card.offers ?? []).map((offer) => {
    const formattedPrice = formatDiscoveryPrice(offer.final_price, offer.currency);
    const discount = offer.discount_percent != null ? Number(offer.discount_percent) : null;
    const benefit = discount && discount > 0 ? `خصم ${discount}%` : offer.title;

    return {
      id: offer.offer_id,
      title: offer.title,
      price: formattedPrice,
      originalPrice:
        offer.original_price != null
          ? formatDiscoveryPrice(offer.original_price, offer.currency)
          : null,
      discountPercent: discount && discount > 0 ? discount : null,
      benefit,
      areaName: null,
      startsAt: offer.starts_at,
      endsAt: offer.ends_at,
    };
  });

  return {
    id: card.id,
    name: card.name,
    initial,
    categoryName,
    offerCount: card.offer_count ?? offers.length,
    offers,
    logoUrl: card.logo_url,
    coverUrl: card.cover_url,
  };
}

// Backwards-compatible baseline preview types for components not yet refactored
export type CategoryId = 'all' | 'food' | 'fashion' | 'services' | 'home' | 'electronics';

export interface HomeOffer {
  id: string;
  title: string;
  price: string;
  benefit: string;
  category?: CategoryId;
  areaId?: AreaId;
  areaName?: string;
  imageUrl?: string;
  conditions?: string;
  sponsored?: boolean;
}

export interface HomeMerchant {
  id: string;
  name: string;
  shortName?: string;
  categoryName: string;
  initial: string;
  offers: HomeOffer[];
}

export type CategoryItem = CategoryFilterItem;

export const APPROVED_CATEGORIES: CategoryFilterItem[] = [
  { id: null, label: 'الكل' },
];

export const DEFAULT_SPONSORED_OFFER = {
  merchantName: 'ركن المذاق',
  offer: {
    id: 'sponsored-1',
    title: 'وجبة غداء متكاملة',
    price: '٣،٥٠٠ ر.ي',
    benefit: 'محتوى ترويجي معلن من التاجر',
    conditions: 'عرض خاص برعاية الشريك الترويجي.',
    sponsored: true,
  },
} as const;
