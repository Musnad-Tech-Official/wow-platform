import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminSetBusinessCategories,
  adminUpsertCategory,
  getPublicBusiness,
  getPublicOffer,
  listPublicCategories,
  searchPublicBusinesses,
  type AdminSetBusinessCategoriesInput,
  type AdminUpsertCategoryInput,
  type PublicSearchOptions,
} from '../../discovery';
import {
  useWowPublicSupabaseClient,
  type WowPublicSupabaseOptions,
} from '../../supabase/public-client';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

function requirePublicClient(getClient: ReturnType<typeof useWowPublicSupabaseClient>) {
  const client = getClient();
  if (!client) {
    throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY for discovery.');
  }
  return client;
}

/** Guest-safe queries run under WowQueryProvider but do not require a Clerk session. */
export function usePublicCategories(config: WowPublicSupabaseOptions = {}) {
  const getClient = useWowPublicSupabaseClient(config);
  return useQuery({
    queryKey: wowQueryKeys.discovery.categories(),
    queryFn: () => listPublicCategories(requirePublicClient(getClient)),
  });
}

export function usePublicSearchBusinesses(
  options: PublicSearchOptions = {},
  config: WowPublicSupabaseOptions = {},
) {
  const getClient = useWowPublicSupabaseClient(config);
  const { query = null, city = null, district = null, categoryId = null,
    sort = 'recent', limit = 20, offset = 0 } = options;
  return useQuery({
    queryKey: wowQueryKeys.discovery.search(query, city, district, categoryId, sort, limit, offset),
    queryFn: () => searchPublicBusinesses(requirePublicClient(getClient), {
      query, city, district, categoryId, sort, limit, offset,
    }),
  });
}

export function usePublicBusiness(businessId?: string | null, config: WowPublicSupabaseOptions = {}) {
  const getClient = useWowPublicSupabaseClient(config);
  return useQuery({
    queryKey: wowQueryKeys.discovery.business(businessId ?? null),
    enabled: !!businessId,
    queryFn: () => {
      if (!businessId) throw new Error('A business ID is required.');
      return getPublicBusiness(requirePublicClient(getClient), businessId);
    },
  });
}

export function usePublicOffer(offerId?: string | null, config: WowPublicSupabaseOptions = {}) {
  const getClient = useWowPublicSupabaseClient(config);
  return useQuery({
    queryKey: wowQueryKeys.discovery.offer(offerId ?? null),
    enabled: !!offerId,
    queryFn: () => {
      if (!offerId) throw new Error('An offer ID is required.');
      return getPublicOffer(requirePublicClient(getClient), offerId);
    },
  });
}

export function useAdminUpsertCategory() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminUpsertCategoryInput) =>
      adminUpsertCategory(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wowQueryKeys.discovery.root() });
    },
  });
}

export function useAdminSetBusinessCategories() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminSetBusinessCategoriesInput) =>
      adminSetBusinessCategories(requireWowApiSession(context).client, input),
    onSuccess: async (_businessId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.discovery.root() }),
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.businesses.detail(input.businessId, context.userId),
        }),
      ]);
    },
  });
}
