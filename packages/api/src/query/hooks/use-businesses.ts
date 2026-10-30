import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBusiness, getBusiness, getMyBusinesses, type CreateBusinessInput } from '../../businesses';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function useMyBusinesses() {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.businesses.mine(context.userId),
    enabled: !!context.userId,
    queryFn: ({ signal }) => {
      const { client, userId } = requireWowApiSession(context);
      return getMyBusinesses(client, userId, signal);
    },
  });
}

export function useBusiness(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.businesses.detail(businessId ?? null, context.userId),
    enabled: !!context.userId && !!businessId,
    queryFn: ({ signal }) => {
      const { client } = requireWowApiSession(context);
      if (!businessId) throw new Error('A business ID is required.');
      return getBusiness(client, businessId, signal);
    },
  });
}

export function useCreateBusiness() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusinessInput) => createBusiness(requireWowApiSession(context).client, input),
    onSuccess: async businessId => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.mine(context.userId), exact: true }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.detail(businessId, context.userId), exact: true }),
      ]);
    },
  });
}
