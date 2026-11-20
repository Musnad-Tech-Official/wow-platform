import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export type DiscoveryMoney = string | number;
export type DiscoverySort = 'recent' | 'discount' | 'name';

export interface PublicCategory {
  id: string;
  parent_id: string | null;
  slug: string;
  name_ar: string;
  name_en: string | null;
}

export interface PublicBusinessCategory extends Omit<PublicCategory, 'parent_id'> {
  is_primary: boolean;
}

export interface PublicBranch {
  id: string;
  name: string;
  city: string;
  district: string | null;
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean;
}

export interface PublicOfferPreview {
  offer_id: string;
  title: string;
  original_price: DiscoveryMoney | null;
  final_price: DiscoveryMoney | null;
  currency: string;
  discount_percent: DiscoveryMoney;
  starts_at: string;
  ends_at: string;
}

export interface PublicBusinessCard {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  offer_count: number;
  max_discount_percent: DiscoveryMoney;
  newest_offer_start: string;
  offers: PublicOfferPreview[];
  categories: PublicBusinessCategory[];
}

export interface PublicBusinessOffer extends Omit<PublicOfferPreview, 'offer_id'> {
  id: string;
  offer_kind: string;
}

export interface PublicBusinessDetails {
  id: string;
  name: string;
  description: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  categories: PublicBusinessCategory[];
  branches: PublicBranch[];
  offers: PublicBusinessOffer[];
}

export interface PublicOfferAttribute {
  name: string;
  value: string;
}

export interface PublicOfferItem {
  item_type: 'product' | 'service';
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  quantity: DiscoveryMoney;
  unit: string;
  reference_value: DiscoveryMoney | null;
  attributes: PublicOfferAttribute[];
}

export interface PublicOfferDetails {
  id: string;
  business_id: string;
  business: {
    id: string;
    name: string;
    contact_phone: string | null;
    logo_url: string | null;
  };
  title: string;
  description: string | null;
  offer_kind: string;
  original_price: DiscoveryMoney | null;
  final_price: DiscoveryMoney;
  currency: string;
  discount_percent: DiscoveryMoney;
  benefit_details: string | null;
  mandatory_fees: string | null;
  terms: string | null;
  stock_or_condition_notice: string | null;
  starts_at: string;
  ends_at: string;
  items: PublicOfferItem[];
  branches: PublicBranch[];
}

export interface PublicSearchOptions {
  query?: string | null;
  city?: string | null;
  district?: string | null;
  categoryId?: string | null;
  sort?: DiscoverySort;
  limit?: number;
  offset?: number;
}

export interface PublicSearchResult {
  total: number;
  limit: number;
  offset: number;
  items: PublicBusinessCard[];
}

export interface AdminUpsertCategoryInput {
  id?: string | null;
  slug: string;
  nameAr: string;
  nameEn?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface AdminSetBusinessCategoriesInput {
  businessId: string;
  categoryIds: string[];
  primaryCategoryId?: string | null;
  reason: string;
}

function requireArray<T>(value: unknown, rpc: string): T[] {
  if (!Array.isArray(value)) throw new Error(`${rpc} did not return a JSON array.`);
  return value as T[];
}

function requireObject<T>(value: unknown, rpc: string): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${rpc} did not return a JSON object.`);
  }
  return value as T;
}

function requireUuid(value: unknown, rpc: string): string {
  if (!uuid(value)) throw new Error(`${rpc} did not return a scalar UUID. Verify write outcome before retrying.`);
  return value;
}

/** RPC only. public.categories is inaccessible to anon and authenticated roles. */
export async function listPublicCategories(client: WowSupabaseClient): Promise<PublicCategory[]> {
  const { data, error } = await client.rpc('wow_public_list_categories');
  if (error) throw error;
  return requireArray<PublicCategory>(data, 'wow_public_list_categories');
}

/** Only currently discoverable approved businesses and their active offers are returned. */
export async function searchPublicBusinesses(
  client: WowSupabaseClient,
  options: PublicSearchOptions = {},
): Promise<PublicSearchResult> {
  const { data, error } = await client.rpc('wow_public_search_businesses', {
    p_query: options.query ?? null,
    p_city: options.city ?? null,
    p_district: options.district ?? null,
    p_category_id: options.categoryId ?? null,
    p_sort: options.sort ?? 'recent',
    p_limit: options.limit ?? 20,
    p_offset: options.offset ?? 0,
  });
  if (error) throw error;
  const result = requireObject<PublicSearchResult>(data, 'wow_public_search_businesses');
  if (!Array.isArray(result.items) || typeof result.total !== 'number' ||
      typeof result.limit !== 'number' || typeof result.offset !== 'number') {
    throw new Error('wow_public_search_businesses returned an unexpected result shape.');
  }
  return result;
}

/** Returns null when business is not discoverable. No merchant draft or private data. */
export async function getPublicBusiness(
  client: WowSupabaseClient,
  businessId: string,
): Promise<PublicBusinessDetails | null> {
  const { data, error } = await client.rpc('wow_public_get_business', { p_business_id: businessId });
  if (error) throw error;
  return data === null ? null : requireObject<PublicBusinessDetails>(data, 'wow_public_get_business');
}

/** Returns null if the offer is not currently discoverable; no raw private media keys. */
export async function getPublicOffer(
  client: WowSupabaseClient,
  offerId: string,
): Promise<PublicOfferDetails | null> {
  const { data, error } = await client.rpc('wow_public_get_offer', { p_offer_id: offerId });
  if (error) throw error;
  return data === null ? null : requireObject<PublicOfferDetails>(data, 'wow_public_get_offer');
}

/** Authorized super-admin only; SQL enforces permissions and valid parent hierarchy. */
export async function adminUpsertCategory(
  client: WowSupabaseClient,
  input: AdminUpsertCategoryInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_upsert_category', {
    p_id: input.id ?? null,
    p_slug: input.slug,
    p_name_ar: input.nameAr,
    p_name_en: input.nameEn ?? null,
    p_parent_id: input.parentId ?? null,
    p_sort_order: input.sortOrder ?? 0,
    p_is_active: input.active ?? false,
  });
  if (error) throw error;
  return requireUuid(data, 'wow_admin_upsert_category');
}

/** Admin approval only; replaces assignment list and writes an SQL audit event. */
export async function adminSetBusinessCategories(
  client: WowSupabaseClient,
  input: AdminSetBusinessCategoriesInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_set_business_categories', {
    p_business_id: input.businessId,
    p_category_ids: input.categoryIds,
    p_primary_category_id: input.primaryCategoryId ?? null,
    p_reason: input.reason,
  });
  if (error) throw error;
  return requireUuid(data, 'wow_admin_set_business_categories');
}


/** Includes inactive categories for authorized platform administration only. */
export interface AdminCategory extends PublicCategory {
  sort_order: number;
  is_active: boolean;
}

export interface AdminBusinessCategoryRow {
  business_id: string;
  business_name: string;
  business_status: string;
  category_ids: string[];
  primary_category_id: string | null;
}

/** Admin-only read model; no direct table grants for categories. */
export async function listAdminCategories(client: WowSupabaseClient): Promise<AdminCategory[]> {
  const { data, error } = await client.rpc('wow_admin_list_categories');
  if (error) throw error;
  return requireArray<AdminCategory>(data, 'wow_admin_list_categories');
}

/** Search admin business records and approved assignments, bounded to 30 by default. */
export async function searchAdminBusinessCategories(
  client: WowSupabaseClient,
  query = '',
  limit = 30,
): Promise<AdminBusinessCategoryRow[]> {
  const { data, error } = await client.rpc('wow_admin_search_business_categories', {
    p_query: query,
    p_limit: limit,
  });
  if (error) throw error;
  return requireArray<AdminBusinessCategoryRow>(data, 'wow_admin_search_business_categories');
}
