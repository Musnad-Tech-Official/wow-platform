import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export interface SavedOffer {
  id: string;
  user_id: string;
  offer_id: string;
  created_at: string;
}

export interface SavedBusiness {
  id: string;
  user_id: string;
  business_id: string;
  created_at: string;
}

export type OfferConformity = 'matches' | 'does_not_match' | 'could_not_verify';
export type RatingModerationStatus = 'normal' | 'under_review' | 'excluded';
export type ComplaintStatus = 'new' | 'investigating' | 'waiting' | 'closed';
export type ComplaintType =
  | 'price_mismatch' | 'unavailable' | 'misleading_terms'
  | 'product_mismatch' | 'business_conduct' | 'other';

export interface CustomerOfferRating {
  id: string;
  offer_id: string;
  offer_version_id: string;
  conformity: OfferConformity;
  experience_stars: number | null;
  moderation_status: RatingModerationStatus;
  created_at: string;
  updated_at: string;
}

export interface CustomerComplaintUpdate {
  kind: string;
  message: string;
  created_at: string;
}

/** Customer-safe projection: no private evidence, merchant reply or internal notes. */
export interface CustomerComplaint {
  id: string;
  offer_id: string;
  offer_version_id: string;
  branch_id: string | null;
  complaint_type: ComplaintType;
  description: string;
  incident_at: string | null;
  status: ComplaintStatus;
  public_outcome: string | null;
  created_at: string;
  closed_at: string | null;
  updates: CustomerComplaintUpdate[];
}

/** Business-owner projection intentionally excludes complainant and evidence details. */
export interface MerchantComplaintSummary {
  id: string;
  offer_id: string;
  offer_version_id: string;
  branch_id: string | null;
  complaint_type: ComplaintType;
  status: ComplaintStatus;
  created_at: string;
  response_count: number;
}

export interface AdminRatingSummary extends CustomerOfferRating {
  user_id: string;
  moderation_reason: string | null;
}

export interface AdminComplaintSummary {
  id: string;
  offer_id: string;
  offer_version_id: string;
  branch_id: string | null;
  complaint_type: ComplaintType;
  status: ComplaintStatus;
  created_at: string;
  closed_at: string | null;
}

/** Admin-only unrestricted case view: must never be displayed in Customer/Merchant. */
export interface AdminComplaintDetail {
  complaint: Record<string, unknown>;
  updates: Record<string, unknown>[];
}

export interface Pagination {
  limit?: number;
  offset?: number;
}

export interface SetSavedOfferInput {
  offerId: string;
  save: boolean;
}

export interface SetSavedBusinessInput {
  businessId: string;
  save: boolean;
}

export interface RateOfferInput {
  offerId: string;
  conformity: OfferConformity;
  experienceStars?: number | null;
}

export interface SubmitComplaintInput {
  offerId: string;
  complaintType: ComplaintType;
  description: string;
  offerVersionId?: string | null;
  branchId?: string | null;
  incidentAt?: string | null;
  // Evidence intentionally omitted: verified upload/attach belongs to Migration 008.
}

export interface MerchantComplaintListOptions extends Pagination {
  businessId: string;
}

export interface MerchantComplaintResponseInput {
  complaintId: string;
  message: string;
  evidenceKeys?: string[];
}

export interface MerchantComplaintUpdate {
  id: string;
  kind: string;
  message: string;
  visibility: string;
  created_at: string;
  private_evidence_keys?: string[];
}

export interface MerchantComplaintDetail {
  id: string;
  offer_id: string;
  offer_title: string;
  offer_version_id: string;
  branch_id: string | null;
  branch_name: string;
  complaint_type: ComplaintType;
  description: string;
  incident_at: string | null;
  status: ComplaintStatus;
  public_outcome: string | null;
  created_at: string;
  closed_at: string | null;
  is_owner: boolean;
  updates: MerchantComplaintUpdate[];
}

export interface AdminRatingsListOptions extends Pagination {
  moderationStatus?: RatingModerationStatus | null;
}

export interface AdminModerateRatingInput {
  ratingId: string;
  status: RatingModerationStatus;
  reason: string;
}

export interface AdminComplaintsListOptions extends Pagination {
  status?: ComplaintStatus | null;
}

export interface AdminRequestMerchantResponseInput {
  complaintId: string;
  message: string;
}

export interface AdminUpdateComplaintInput {
  complaintId: string;
  status: Exclude<ComplaintStatus, 'new'>;
  note: string;
  publicOutcome?: string | null;
}

function requireUuid(data: unknown, rpc: string): string {
  if (!uuid(data)) throw new Error(`${rpc} did not return a UUID; check write outcome before retrying.`);
  return data;
}

function requireBoolean(data: unknown, rpc: string): boolean {
  if (typeof data !== 'boolean') throw new Error(`${rpc} did not return a boolean.`);
  return data;
}

function requireJsonArray<T>(data: unknown, rpc: string): T[] {
  if (!Array.isArray(data)) throw new Error(`${rpc} did not return a JSON array.`);
  return data as T[];
}

function pagination(options: Pagination) {
  return { p_limit: options.limit ?? 50, p_offset: options.offset ?? 0 };
}

/** The only Migration 005 tables with owner-restricted client SELECT grants. */
export async function getSavedOffers(
  client: WowSupabaseClient,
  userId: string,
  signal?: AbortSignal,
): Promise<SavedOffer[]> {
  let request = client.from('saved_offers')
    .select('id,user_id,offer_id,created_at').eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as SavedOffer[];
}

export async function getSavedBusinesses(
  client: WowSupabaseClient,
  userId: string,
  signal?: AbortSignal,
): Promise<SavedBusiness[]> {
  let request = client.from('saved_businesses')
    .select('id,user_id,business_id,created_at').eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as SavedBusiness[];
}

export async function setSavedOffer(
  client: WowSupabaseClient,
  input: SetSavedOfferInput,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_set_saved_offer', {
    p_offer_id: input.offerId,
    p_save: input.save,
  });
  if (error) throw error;
  return requireBoolean(data, 'wow_set_saved_offer');
}

export async function setSavedBusiness(
  client: WowSupabaseClient,
  input: SetSavedBusinessInput,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_set_saved_business', {
    p_business_id: input.businessId,
    p_save: input.save,
  });
  if (error) throw error;
  return requireBoolean(data, 'wow_set_saved_business');
}

export async function rateOffer(
  client: WowSupabaseClient,
  input: RateOfferInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_rate_offer', {
    p_offer_id: input.offerId,
    p_conformity: input.conformity,
    p_experience_stars: input.experienceStars ?? null,
  });
  if (error) throw error;
  return requireUuid(data, 'wow_rate_offer');
}

export async function getMyRatings(
  client: WowSupabaseClient,
  options: Pagination = {},
): Promise<CustomerOfferRating[]> {
  const { data, error } = await client.rpc('wow_get_my_ratings', pagination(options));
  if (error) throw error;
  return requireJsonArray<CustomerOfferRating>(data, 'wow_get_my_ratings');
}

export async function submitComplaint(
  client: WowSupabaseClient,
  input: SubmitComplaintInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_submit_complaint', {
    p_offer_id: input.offerId,
    p_complaint_type: input.complaintType,
    p_description: input.description,
    p_offer_version_id: input.offerVersionId ?? null,
    p_branch_id: input.branchId ?? null,
    p_incident_at: input.incidentAt ?? null,
    p_private_evidence_keys: [], // Direct unverified evidence is forbidden by Migration 005.
  });
  if (error) throw error;
  return requireUuid(data, 'wow_submit_complaint');
}

export async function getMyComplaints(
  client: WowSupabaseClient,
  options: Pagination = {},
): Promise<CustomerComplaint[]> {
  const { data, error } = await client.rpc('wow_get_my_complaints', pagination(options));
  if (error) throw error;
  return requireJsonArray<CustomerComplaint>(data, 'wow_get_my_complaints');
}

export interface GetMyComplaintByIdOptions {
  batchSize?: number;
  maxOffset?: number;
}

export class ComplaintLookupCeilingError extends Error {
  readonly code = 'COMPLAINT_LOOKUP_CEILING' as const;
  readonly offsetReached: number;
  readonly limit: number;

  constructor(offsetReached: number, limit: number) {
    super(
      `Complaint lookup reached server pagination ceiling (offset ${offsetReached}, limit ${limit}) with potential additional records. Search is indeterminate.`
    );
    this.name = 'ComplaintLookupCeilingError';
    this.offsetReached = offsetReached;
    this.limit = limit;
  }
}

const MAX_SQL_PAGINATION_OFFSET = 10000;
const MAX_SQL_PAGINATION_LIMIT = 100;

/**
 * Resolves a specific complaint owned by the current customer using bounded pagination over wow_get_my_complaints.
 * Validates UUID format and terminates early when records are exhausted.
 *
 * Strict boundary rules matching Postgres contract:
 * - p_limit must be between 1 and 100
 * - p_offset must be between 0 and 10000
 * - NEVER sends an offset above 10000 (prevents SQL 22023 exception)
 * - Distinguishes definitive not-found (batch.length < batchSize) from indeterminate search ceiling
 *   (batch.length === batchSize but next offset would exceed ceiling).
 */
export async function getMyComplaintById(
  client: WowSupabaseClient,
  complaintId: string,
  options: GetMyComplaintByIdOptions = {},
): Promise<CustomerComplaint | null> {
  if (!uuid(complaintId)) return null;

  const batchSize = Math.min(
    Math.max(options.batchSize ?? MAX_SQL_PAGINATION_LIMIT, 1),
    MAX_SQL_PAGINATION_LIMIT,
  );
  const maxOffset = Math.min(
    Math.max(options.maxOffset ?? MAX_SQL_PAGINATION_OFFSET, 0),
    MAX_SQL_PAGINATION_OFFSET,
  );

  let offset = 0;

  while (offset <= maxOffset) {
    const batch = await getMyComplaints(client, { limit: batchSize, offset });
    const match = batch.find((c) => c && c.id && c.id.toLowerCase() === complaintId.toLowerCase());
    if (match) return match;

    // Definitively exhausted all authorized user complaints: no more records exist on server
    if (batch.length < batchSize) {
      return null;
    }

    // Full batch returned, but next page would exceed the server/configured ceiling
    if (offset + batchSize > maxOffset) {
      throw new ComplaintLookupCeilingError(offset, batchSize);
    }

    offset += batchSize;
  }

  throw new ComplaintLookupCeilingError(offset, batchSize);
}

export async function getBusinessComplaints(
  client: WowSupabaseClient,
  options: MerchantComplaintListOptions,
): Promise<MerchantComplaintSummary[]> {
  const { data, error } = await client.rpc('wow_get_business_complaints', {
    p_business_id: options.businessId,
    ...pagination(options),
  });
  if (error) throw error;
  return requireJsonArray<MerchantComplaintSummary>(data, 'wow_get_business_complaints');
}

export async function merchantRespondComplaint(
  client: WowSupabaseClient,
  input: MerchantComplaintResponseInput,
): Promise<string> {
  const params: Record<string, unknown> = {
    p_complaint_id: input.complaintId,
    p_message: input.message,
  };
  if (input.evidenceKeys && input.evidenceKeys.length > 0) {
    params.p_evidence_keys = input.evidenceKeys;
  }
  const { data, error } = await client.rpc('wow_merchant_respond_complaint', params);
  if (error) throw error;
  return requireUuid(data, 'wow_merchant_respond_complaint');
}

export async function getMerchantComplaint(
  client: WowSupabaseClient,
  complaintId: string,
): Promise<MerchantComplaintDetail | null> {
  if (!uuid(complaintId)) return null;
  const { data, error } = await client.rpc('wow_merchant_get_complaint', {
    p_complaint_id: complaintId,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object') return null;
  return data as unknown as MerchantComplaintDetail;
}

export async function listAdminRatings(
  client: WowSupabaseClient,
  options: AdminRatingsListOptions = {},
): Promise<AdminRatingSummary[]> {
  const { data, error } = await client.rpc('wow_admin_list_ratings', {
    p_moderation_status: options.moderationStatus ?? null,
    ...pagination(options),
  });
  if (error) throw error;
  return requireJsonArray<AdminRatingSummary>(data, 'wow_admin_list_ratings');
}

export async function adminModerateRating(
  client: WowSupabaseClient,
  input: AdminModerateRatingInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_moderate_rating', {
    p_rating_id: input.ratingId,
    p_status: input.status,
    p_reason: input.reason,
  });
  if (error) throw error;
  return requireUuid(data, 'wow_admin_moderate_rating');
}

export async function listAdminComplaints(
  client: WowSupabaseClient,
  options: AdminComplaintsListOptions = {},
): Promise<AdminComplaintSummary[]> {
  const { data, error } = await client.rpc('wow_admin_list_complaints', {
    p_status: options.status ?? null,
    ...pagination(options),
  });
  if (error) throw error;
  return requireJsonArray<AdminComplaintSummary>(data, 'wow_admin_list_complaints');
}

export async function getAdminComplaint(
  client: WowSupabaseClient,
  complaintId: string,
): Promise<AdminComplaintDetail | null> {
  const { data, error } = await client.rpc('wow_admin_get_complaint', {
    p_complaint_id: complaintId,
  });
  if (error) throw error;
  if (data === null) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('wow_admin_get_complaint did not return a JSON object.');
  }
  return data as unknown as AdminComplaintDetail;
}

/** Administrator only: creates a proprietor-visible information request. */
export async function adminRequestMerchantResponse(
  client: WowSupabaseClient,
  input: AdminRequestMerchantResponseInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_request_merchant_response', {
    p_complaint_id: input.complaintId,
    p_message: input.message,
  });
  if (error) throw error;
  return requireUuid(data, 'wow_admin_request_merchant_response');
}

export async function adminUpdateComplaint(
  client: WowSupabaseClient,
  input: AdminUpdateComplaintInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_update_complaint', {
    p_complaint_id: input.complaintId,
    p_status: input.status,
    p_note: input.note,
    p_public_outcome: input.publicOutcome ?? null,
  });
  if (error) throw error;
  return requireUuid(data, 'wow_admin_update_complaint');
}
