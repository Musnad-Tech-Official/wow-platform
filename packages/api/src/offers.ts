import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export type OfferKind = 'product' | 'service' | 'bundle' | 'clearance';
export type OfferReviewDecision = 'approved' | 'rejected' | 'needs_info';
export type OfferStatus = 'draft' | 'pending' | 'active' | 'paused' | 'closed';
export type OfferVersionStatus = 'draft' | 'pending' | 'approved' | 'rejected';

// Keep money as strings if the caller needs exact decimal arithmetic.
// PostgREST may serialize NUMERIC values as numbers depending on configuration.
export type OfferMoney = string | number;

export interface Offer {
  id: string;
  business_id: string;
  created_by_user_id: string;
  current_version_id: string | null;
  status: OfferStatus;
  merchant_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfferVersion {
  id: string;
  business_id: string;
  offer_id: string;
  version_no: number;
  category_id?: string | null;
  is_clearance?: boolean;
  title: string | null;
  description: string | null;
  offer_kind: OfferKind | null;
  original_price: OfferMoney | null;
  final_price: OfferMoney | null;
  currency: string | null;
  benefit_details: string | null;
  mandatory_fees: string | null;
  terms: string | null;
  stock_or_condition_notice: string | null;
  starts_at: string | null;
  ends_at: string | null;
  review_status: OfferVersionStatus;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferDraftAttribute {
  name: string;
  value: string;
}

export interface OfferDraftItem {
  item_type: 'product' | 'service';
  name: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  quantity?: OfferMoney;
  unit?: string;
  reference_value?: OfferMoney | null;
  attributes?: OfferDraftAttribute[];
}

/** Exact Migration 004 payload keys. Entire items/branches arrays are replaced on save. */
export interface OfferDraftPayload {
  category_id?: string | null;
  is_clearance?: boolean;
  title?: string | null;
  description?: string | null;
  offer_kind?: OfferKind | null;
  original_price?: OfferMoney | null;
  final_price?: OfferMoney | null;
  currency?: string | null;
  benefit_details?: string | null;
  mandatory_fees?: string | null;
  terms?: string | null;
  stock_or_condition_notice?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  items: OfferDraftItem[];
  branches: string[];
}

export interface OfferItem {
  id: string;
  offer_version_id: string;
  item_type: 'product' | 'service';
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  quantity: OfferMoney;
  unit: string;
  reference_value: OfferMoney | null;
  sort_order: number;
}

export interface OfferItemAttribute extends OfferDraftAttribute {
  id: string;
  offer_item_id: string;
  sort_order: number;
}

export interface OfferItemWithAttributes extends OfferItem {
  attributes: OfferItemAttribute[];
}

export interface OfferMedia {
  id: string;
  offer_version_id: string;
  offer_item_id: string | null;
  storage_key: string;
  alt_text: string | null;
  is_cover: boolean;
  sort_order: number;
}

/** Raw Storage keys are private: do not construct public URLs from these values. */
export interface OfferVersionDetails {
  version: OfferVersion;
  items: OfferItemWithAttributes[];
  branches: { business_id: string; offer_version_id: string; branch_id: string }[];
  media: OfferMedia[];
}

export interface CreateOfferInput {
  businessId: string;
}

export interface SaveOfferDraftInput {
  offerId: string;
  payload: OfferDraftPayload;
}

export interface SetOfferAvailabilityInput {
  offerId: string;
  available: boolean;
  paused: boolean;
}

export interface OfferEvidenceDocument {
  storageKey: string;
  name: string;
  size: number;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  isPrimaryRequirement?: boolean;
}

export interface SaveOfferEvidenceInput {
  offerId: string;
  documents: OfferEvidenceDocument[];
}

export interface AdminPendingOffer {
  version_id: string;
  offer_id: string;
  business_id: string;
  business_name: string;
  title: string | null;
  final_price: OfferMoney | null;
  currency: string | null;
  submitted_at: string | null;
}

export interface AdminOfferListOptions {
  limit?: number;
  offset?: number;
}

export interface AdminDecideOfferInput {
  versionId: string;
  decision: OfferReviewDecision;
  reason?: string | null;
}

function checkedUuid(data: unknown, rpc: string): string {
  if (!uuid(data)) {
    throw new Error(`${rpc} did not return a UUID. Check the write outcome before retrying.`);
  }
  return data;
}

function requireJsonArray<T>(data: unknown, rpc: string): T[] {
  if (!Array.isArray(data)) throw new Error(`${rpc} did not return the expected JSON array.`);
  return data as T[];
}

export interface OfferEligibleCategory {
  id: string;
  name_ar: string;
  name_en: string | null;
  parent_id: string | null;
}

export async function getOfferEligibleCategories(
  client: WowSupabaseClient,
  businessId: string,
  signal?: AbortSignal,
): Promise<OfferEligibleCategory[]> {
  let request = client.rpc('wow_get_offer_eligible_categories', { p_business_id: businessId });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return requireJsonArray<OfferEligibleCategory>(data, 'wow_get_offer_eligible_categories');
}

export async function getBusinessOffers(
  client: WowSupabaseClient,
  businessId: string,
  signal?: AbortSignal,
): Promise<Offer[]> {
  let request = client.from('offers')
    .select('id,business_id,created_by_user_id,current_version_id,status,merchant_available,created_at,updated_at')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as Offer[];
}

const OFFER_VERSION_SELECT_WITH_CATEGORY =
  'id,business_id,offer_id,version_no,category_id,is_clearance,title,description,offer_kind,original_price,final_price,currency,benefit_details,mandatory_fees,terms,stock_or_condition_notice,starts_at,ends_at,review_status,submitted_at,approved_at,created_at,updated_at';

export async function getOfferVersions(
  client: WowSupabaseClient,
  offerId: string,
  signal?: AbortSignal,
): Promise<OfferVersion[]> {
  let request = client.from('offer_versions')
    .select(OFFER_VERSION_SELECT_WITH_CATEGORY)
    .eq('offer_id', offerId)
    .order('version_no', { ascending: false });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as OfferVersion[];
}

/** Merchant read: all subqueries remain subject to PostgreSQL's branch-scoped RLS. */
export async function getOfferVersionDetails(
  client: WowSupabaseClient,
  versionId: string,
  signal?: AbortSignal,
): Promise<OfferVersionDetails | null> {
  let versionRequest = client.from('offer_versions')
    .select(OFFER_VERSION_SELECT_WITH_CATEGORY)
    .eq('id', versionId);
  if (signal) versionRequest = versionRequest.abortSignal(signal);
  const { data: version, error: versionError } = await versionRequest.maybeSingle<OfferVersion>();
  if (versionError) throw versionError;
  if (!version) return null;

  let itemsRequest = client.from('offer_items')
    .select('id,offer_version_id,item_type,name,description,brand,model,quantity,unit,reference_value,sort_order')
    .eq('offer_version_id', versionId).order('sort_order');
  let branchesRequest = client.from('offer_branches')
    .select('business_id,offer_version_id,branch_id')
    .eq('offer_version_id', versionId);
  let mediaRequest = client.from('offer_media')
    .select('id,offer_version_id,offer_item_id,storage_key,alt_text,is_cover,sort_order')
    .eq('offer_version_id', versionId).order('sort_order');
  if (signal) {
    itemsRequest = itemsRequest.abortSignal(signal);
    branchesRequest = branchesRequest.abortSignal(signal);
    mediaRequest = mediaRequest.abortSignal(signal);
  }
  const [itemsResponse, branchesResponse, mediaResponse] =
    await Promise.all([itemsRequest, branchesRequest, mediaRequest]);
  if (itemsResponse.error) throw itemsResponse.error;
  if (branchesResponse.error) throw branchesResponse.error;
  if (mediaResponse.error) throw mediaResponse.error;

  const items = (itemsResponse.data ?? []) as OfferItem[];
  let attributes: OfferItemAttribute[] = [];
  if (items.length) {
    let attributesRequest = client.from('offer_item_attributes')
      .select('id,offer_item_id,name,value,sort_order')
      .in('offer_item_id', items.map(item => item.id)).order('sort_order');
    if (signal) attributesRequest = attributesRequest.abortSignal(signal);
    const { data, error } = await attributesRequest;
    if (error) throw error;
    attributes = (data ?? []) as OfferItemAttribute[];
  }
  return {
    version,
    items: items.map(item => ({
      ...item,
      attributes: attributes.filter(attr => attr.offer_item_id === item.id),
    })),
    branches: branchesResponse.data ?? [],
    media: (mediaResponse.data ?? []) as OfferMedia[],
  };
}

export async function createOffer(client: WowSupabaseClient, input: CreateOfferInput): Promise<string> {
  const { data, error } = await client.rpc('wow_create_offer', { p_business_id: input.businessId });
  if (error) throw error;
  return checkedUuid(data, 'wow_create_offer');
}

export async function saveOfferDraft(
  client: WowSupabaseClient,
  input: SaveOfferDraftInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_save_offer_draft', {
    p_offer_id: input.offerId,
    p_payload: input.payload,
  });
  if (error) throw error;
  return checkedUuid(data, 'wow_save_offer_draft');
}

export async function getOfferEvidenceDraft(
  client: WowSupabaseClient,
  offerId: string,
  signal?: AbortSignal,
): Promise<OfferEvidenceDocument[]> {
  let request = client.rpc('wow_get_offer_evidence_draft', { p_offer_id: offerId });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return requireJsonArray<OfferEvidenceDocument>(data ?? [], 'wow_get_offer_evidence_draft');
}

export async function saveOfferEvidenceDraft(
  client: WowSupabaseClient,
  input: SaveOfferEvidenceInput,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_save_offer_evidence_draft', {
    p_offer_id: input.offerId,
    p_documents: input.documents,
  });
  if (error) throw error;
  if (data !== true) throw new Error('Offer evidence was not confirmed as saved.');
  return true;
}

export async function submitOffer(client: WowSupabaseClient, offerId: string): Promise<string> {
  const { data, error } = await client.rpc('wow_submit_offer', { p_offer_id: offerId });
  if (error) throw error;
  return checkedUuid(data, 'wow_submit_offer');
}

export async function setOfferAvailability(
  client: WowSupabaseClient,
  input: SetOfferAvailabilityInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_set_offer_availability', {
    p_offer_id: input.offerId,
    p_available: input.available,
    p_paused: input.paused,
  });
  if (error) throw error;
  return checkedUuid(data, 'wow_set_offer_availability');
}

export async function listAdminPendingOffers(
  client: WowSupabaseClient,
  options: AdminOfferListOptions = {},
): Promise<AdminPendingOffer[]> {
  const { data, error } = await client.rpc('wow_admin_list_pending_offers', {
    p_limit: options.limit ?? 50,
    p_offset: options.offset ?? 0,
  });
  if (error) throw error;
  return requireJsonArray<AdminPendingOffer>(data, 'wow_admin_list_pending_offers');
}

/** Admin-only review JSON. Contains sensitive private evidence keys: never use in Customer UI. */
export async function getAdminOfferReview(
  client: WowSupabaseClient,
  versionId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.rpc('wow_admin_get_offer_review', { p_version_id: versionId });
  if (error) throw error;
  if (data === null) return null;
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('wow_admin_get_offer_review did not return a JSON object.');
  }
  return data as Record<string, unknown>;
}

export async function decideAdminOffer(
  client: WowSupabaseClient,
  input: AdminDecideOfferInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_decide_offer', {
    p_version_id: input.versionId,
    p_decision: input.decision,
    p_reason: input.reason ?? null,
  });
  if (error) throw error;
  return checkedUuid(data, 'wow_admin_decide_offer');
}
