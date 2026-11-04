import type { DiscoverySort, PublicBusinessCard } from '@wow/api';
import { formatDiscoveryPrice } from '../home/home-data';

export type DiscoverySortOption = DiscoverySort;

export interface SortOptionItem {
  value: DiscoverySortOption;
  label: string;
}

export const SORT_OPTIONS: readonly SortOptionItem[] = [
  { value: 'recent', label: 'الأحدث' },
  { value: 'discount', label: 'أعلى خصم' },
  { value: 'name', label: 'الاسم' },
] as const;

export interface DiscoveryOfferItem {
  id: string; // Genuine offer UUID
  title: string;
  price: string;
  originalPrice: string | null;
  discountPercent: number | null;
  currency: string;
  startsAt?: string;
  endsAt?: string;
}

export interface DiscoveryMerchantCard {
  id: string; // Genuine business UUID
  name: string;
  initial: string;
  categoryName: string;
  offerCount: number;
  offers: DiscoveryOfferItem[];
  logoUrl?: string | null;
  coverUrl?: string | null;
}

/** Formats merchant count with natural Arabic inflection (تاجر / تجار). */
export function formatMerchantCount(total: number): string {
  if (total <= 0) return '0 تاجر';
  const numAr = total.toLocaleString('ar-YE');
  if (total === 1) return 'تاجر واحد';
  if (total === 2) return 'تاجران';
  if (total >= 3 && total <= 10) return `${numAr} تجار`;
  return `${numAr} تاجر`;
}

/** Maps a live PublicBusinessCard to the CUS-02 discovery presentation card model. */
export function mapPublicBusinessToDiscoveryCard(card: PublicBusinessCard): DiscoveryMerchantCard {
  const primaryCategory = card.categories?.find((c) => c.is_primary) ?? card.categories?.[0];
  const categoryName = primaryCategory?.name_ar ?? '';
  const trimmedName = card.name?.trim() ?? '';
  const initial = trimmedName.length > 0 ? trimmedName.charAt(0) : 'و';

  const offers: DiscoveryOfferItem[] = (card.offers ?? []).map((offer) => {
    const formattedPrice = formatDiscoveryPrice(offer.final_price, offer.currency);
    const discount =
      offer.discount_percent != null && Number(offer.discount_percent) > 0
        ? Number(offer.discount_percent)
        : null;

    return {
      id: offer.offer_id,
      title: offer.title,
      price: formattedPrice,
      originalPrice:
        offer.original_price != null
          ? formatDiscoveryPrice(offer.original_price, offer.currency)
          : null,
      discountPercent: discount,
      currency: offer.currency,
      startsAt: offer.starts_at,
      endsAt: offer.ends_at,
    };
  });

  return {
    id: card.id,
    name: trimmedName || 'متجر معتمد',
    initial,
    categoryName,
    offerCount: card.offer_count ?? offers.length,
    offers,
    logoUrl: card.logo_url,
    coverUrl: card.cover_url,
  };
}

export { formatDiscoveryPrice };

