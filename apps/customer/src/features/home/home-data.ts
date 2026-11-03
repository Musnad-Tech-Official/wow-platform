/**
 * MUSNAD-WOW — Customer Home Screen Baseline Preview Data
 *
 * This file contains approved baseline preview data for the CUS-01 customer home screen.
 * It strictly mirrors the approved design reference while remaining compatible with
 * the schema returned by `@wow/api` public discovery RPCs:
 *   - `usePublicSearchBusinesses`
 *   - `usePublicCategories`
 *
 * NOTE FOR PRODUCTION / SUPABASE INTEGRATION:
 * When connecting to live Supabase backend instances, replace this local preview provider
 * with the reactive `@wow/api` queries once `EXPO_PUBLIC_SUPABASE_URL` and
 * `EXPO_PUBLIC_SUPABASE_KEY` are provisioned in the deployment environment.
 */

export type CategoryId = 'all' | 'food' | 'fashion' | 'services' | 'home' | 'electronics';
export type AreaId = 'all' | 'center' | 'east';

export interface HomeOffer {
  id: string;
  title: string;
  price: string;
  benefit: string;
  category: CategoryId;
  areaId: AreaId;
  areaName: string;
  imageUrl?: string;
  conditions: string;
  sponsored?: boolean;
}

export interface HomeMerchant {
  id: string;
  name: string;
  shortName: string;
  categoryName: string;
  initial: string;
  offers: HomeOffer[];
}

export interface CategoryItem {
  id: CategoryId;
  label: string;
}

export interface AreaItem {
  id: AreaId;
  label: string;
}

export const APPROVED_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: 'الكل' },
  { id: 'food', label: 'مطاعم ومقاه' },
  { id: 'fashion', label: 'أزياء' },
  { id: 'services', label: 'خدمات' },
  { id: 'home', label: 'المنزل' },
  { id: 'electronics', label: 'إلكترونيات' },
];

export const APPROVED_AREAS: AreaItem[] = [
  { id: 'all', label: 'كل المناطق' },
  { id: 'center', label: 'وسط المدينة' },
  { id: 'east', label: 'المنطقة الشرقية' },
];

export const APPROVED_MERCHANTS: HomeMerchant[] = [
  {
    id: 'food-shop',
    name: 'ركن المذاق',
    shortName: 'ركن',
    categoryName: 'مطاعم ومقاه',
    initial: 'ر',
    offers: [
      {
        id: 'lunch',
        title: 'وجبة غداء متكاملة',
        price: '٣،٥٠٠ ر.ي',
        benefit: 'وجبة تشمل الأصناف المحددة',
        category: 'food',
        areaId: 'center',
        areaName: 'وسط المدينة',
        conditions: 'صالح حتى نفاد الكمية اليومية داخل الصالة أو سفري.',
      },
      {
        id: 'dinner',
        title: 'عشاء لشخصين',
        price: '٦،٢٠٠ ر.ي',
        benefit: 'عرض خاص للعائلات والأصدقاء',
        category: 'food',
        areaId: 'center',
        areaName: 'وسط المدينة',
        conditions: 'يسري العرض من الساعة ٧ مساءً وحتى الإغلاق.',
      },
    ],
  },
  {
    id: 'fashion-shop',
    name: 'أزياء المدينة',
    shortName: 'أزياء',
    categoryName: 'أزياء',
    initial: 'أ',
    offers: [
      {
        id: 'season',
        title: 'تشكيلة الموسم',
        price: '٨،٩٠٠ ر.ي',
        benefit: 'أسعار خاصة لمقاسات محددة',
        category: 'fashion',
        areaId: 'center',
        areaName: 'وسط المدينة',
        conditions: 'الخصم يشمل القطع المختارة في المتجر الرئيسي.',
      },
      {
        id: 'accessories',
        title: 'إكسسوارات مختارة',
        price: '٢،٤٠٠ ر.ي',
        benefit: 'قطعة إضافية مع كل شراء',
        category: 'fashion',
        areaId: 'center',
        areaName: 'وسط المدينة',
        conditions: 'العرض متوفر في جميع فروع وسط المدينة.',
      },
    ],
  },
  {
    id: 'services-shop',
    name: 'خدمات البيت',
    shortName: 'خدمات',
    categoryName: 'خدمات',
    initial: 'خ',
    offers: [
      {
        id: 'cleaning',
        title: 'خدمة تنظيف مختارة',
        price: '٥،٥٠٠ ر.ي',
        benefit: 'خدمة بنطاق محدد',
        category: 'services',
        areaId: 'center',
        areaName: 'وسط المدينة',
        conditions: 'الحجز مسبق عبر التطبيق مع تأكيد الموعد.',
      },
    ],
  },
  {
    id: 'home-shop',
    name: 'متجر الأفق',
    shortName: 'الأفق',
    categoryName: 'المنزل',
    initial: 'م',
    offers: [
      {
        id: 'home-goods',
        title: 'منتجات منزلية',
        price: '٤،٢٠٠ ر.ي',
        benefit: 'منتجات مختارة',
        category: 'home',
        areaId: 'east',
        areaName: 'المنطقة الشرقية',
        conditions: 'يشمل التوصيل المجاني للطلبات داخل المنطقة الشرقية.',
      },
    ],
  },
];

export const DEFAULT_SPONSORED_OFFER = {
  merchantName: 'ركن المذاق',
  offer: {
    id: 'sponsored-1',
    title: 'وجبة غداء متكاملة',
    price: '٣،٥٠٠ ر.ي',
    benefit: 'محتوى ترويجي معلن من التاجر',
    category: 'food' as CategoryId,
    areaId: 'center' as AreaId,
    areaName: 'وسط المدينة',
    conditions: 'عرض خاص برعاية الشريك الترويجي.',
    sponsored: true,
  },
} as const;
