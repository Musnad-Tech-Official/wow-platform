import type { PublicBusinessDetails } from '@wow/api';
import { formatDiscoveryPrice } from '../discovery/discovery-data';

/** Validates that a string is a standard UUID. */
export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Formats active offer count with authentic Arabic inflection. */
export function formatOfferCount(total: number): string {
  if (total <= 0) return 'لا توجد عروض';
  const numAr = total.toLocaleString('ar-YE');
  if (total === 1) return 'عرض واحد';
  if (total === 2) return 'عرضان';
  if (total >= 3 && total <= 10) return `${numAr} عروض`;
  return `${numAr} عرض`;
}

/** Formats branch count with authentic Arabic inflection. */
export function formatBranchCount(total: number): string {
  if (total <= 0) return 'لا توجد فروع مسجلة';
  const numAr = total.toLocaleString('ar-YE');
  if (total === 1) return 'فرع واحد';
  if (total === 2) return 'فرعان';
  if (total >= 3 && total <= 10) return `${numAr} فروع`;
  return `${numAr} فرع`;
}

/** Validates that coordinates are legitimate finite numeric values within geographic ranges. */
export function hasValidCoordinates(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!isFinite(latitude) || !isFinite(longitude)) return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/** Returns a clean map URL for directions if coordinates are valid. */
export function getDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/** Checks if a cover or logo URL is a safe, publicly loadable HTTP/HTTPS image URL. */
export function isSafePublicImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim().length === 0) return false;
  const trimmed = url.trim();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}

export { formatDiscoveryPrice };

/**
 * Isolated development fixtures for CUS-10 visual review and regression test suite.
 * Strictly guarded; never used in live production data reads.
 */
export const FIXTURE_PUBLIC_BUSINESS: PublicBusinessDetails = {
  id: 'b0000000-0000-4000-8000-000000000001',
  name: 'ركن المذاق اليمني',
  description:
    'مطعم ومقهى يقدم أشهى المأكولات والمشروبات اليمنية التقليدية والحديثة بأعلى معايير الجودة والضيافة، مع توفير جلسات عائلية مريحة وخدمات سريعة.',
  contact_phone: '+967770000001',
  logo_url: null,
  cover_url: null,
  categories: [
    { id: 'cat-1', slug: 'restaurants', name_ar: 'مطاعم وكافيهات', name_en: 'Restaurants & Cafes', is_primary: true },
    { id: 'cat-2', slug: 'traditional', name_ar: 'مأكولات شعبية', name_en: 'Traditional Food', is_primary: false },
  ],
  branches: [
    {
      id: 'br-1',
      name: 'الفرع الرئيسي - حدة',
      city: 'صنعاء',
      district: 'حدة',
      address_line: 'شارع حدة، أمام مجمع الكميم',
      latitude: 15.3345,
      longitude: 44.1872,
      is_primary: true,
    },
    {
      id: 'br-2',
      name: 'فرع الستين الغربي',
      city: 'صنعاء',
      district: 'الستين الغربي',
      address_line: 'شارع الستين، بالقرب من جولة مذبح',
      latitude: 15.3694,
      longitude: 44.191,
      is_primary: false,
    },
  ],
  offers: [
    {
      id: 'e0000000-0000-4000-8000-000000000001',
      title: 'وجبة غداء متكاملة لشخصين مع مشروبين',
      offer_kind: 'percentage_discount',
      original_price: '6000',
      final_price: '4500',
      currency: 'YER',
      discount_percent: '25',
      starts_at: '2026-10-01T00:00:00Z',
      ends_at: '2026-12-31T23:59:59Z',
    },
    {
      id: 'e0000000-0000-4000-8000-000000000002',
      title: 'عرض المساء على جميع المشروبات الساخنة',
      offer_kind: 'fixed_price',
      original_price: null,
      final_price: '2800',
      currency: 'YER',
      discount_percent: '0',
      starts_at: '2026-10-01T00:00:00Z',
      ends_at: '2026-12-31T23:59:59Z',
    },
  ],
};

export const FIXTURE_PUBLIC_BUSINESS_NO_OFFERS: PublicBusinessDetails = {
  ...FIXTURE_PUBLIC_BUSINESS,
  id: 'b0000000-0000-4000-8000-000000000002',
  name: 'مخبوزات الأصالة',
  description: 'مخبز تراثي متخصص في إعداد الخبز اليمني التقليدي والمعجنات الطازجة.',
  offers: [],
};

export const FIXTURE_PUBLIC_BUSINESS_NO_BRANCHES: PublicBusinessDetails = {
  ...FIXTURE_PUBLIC_BUSINESS,
  id: 'b0000000-0000-4000-8000-000000000003',
  name: 'متجر الهدايا الرقمي',
  branches: [],
};

export const FIXTURE_PUBLIC_BUSINESS_MISSING_MEDIA: PublicBusinessDetails = {
  ...FIXTURE_PUBLIC_BUSINESS,
  id: 'b0000000-0000-4000-8000-000000000004',
  name: 'صيدلية الأمل الحديثة',
  cover_url: null,
  logo_url: null,
};

export const FIXTURE_PUBLIC_BUSINESS_LONG_CONTENT: PublicBusinessDetails = {
  ...FIXTURE_PUBLIC_BUSINESS,
  id: 'b0000000-0000-4000-8000-000000000005',
  name: 'مجموعة المذاق العربي والمأكولات التراثية الحديثة للتجارة والخدمات الفندقية والتموين الغذائي المحدودة',
  description:
    'مجموعة رائدة ومتكاملة في مجال خدمات الأغذية والضيافة في اليمن، تقدم تشكيلة واسعة من الأطباق التراثية والحديثة مع الالتزام بأعلى معايير النظافة والجودة، وتوفر صالات مخصصة للعائلات وخدمات التوصيل السريع وتنظيم الولائم والمناسبات عبر طاقم عمل متخصص ومدرب على أعلى المستويات.',
};
