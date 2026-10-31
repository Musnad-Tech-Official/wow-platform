import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attachComplaintEvidence,
  attachOfferMedia,
  getPublicOfferMedia,
  uploadWowMedia,
  type AttachComplaintEvidenceInput,
  type AttachOfferMediaInput,
  type UploadWowMediaInput,
} from '../../media';
import {
  useWowPublicSupabaseClient,
  type WowPublicSupabaseOptions,
} from '../../supabase/public-client';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function usePublicOfferMedia(offerId?: string | null, config: WowPublicSupabaseOptions = {}) {
  const getClient = useWowPublicSupabaseClient(config);
  return useQuery({
    queryKey: wowQueryKeys.discovery.offerMedia(offerId ?? null),
    enabled: !!offerId,
    queryFn: () => {
      if (!offerId) throw new Error('An offer ID is required.');
      const client = getClient();
      if (!client) throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.');
      return getPublicOfferMedia(client, offerId);
    },
  });
}

/** Upload is never retried. A failed network response may still have created an object. */
export function useUploadWowMedia() {
  const context = useWowApiContext();
  return useMutation({
    mutationFn: (input: Omit<UploadWowMediaInput, 'userId'>) => {
      const { client, userId } = requireWowApiSession(context);
      return uploadWowMedia(client, { ...input, userId });
    },
  });
}

export function useAttachOfferMedia() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AttachOfferMediaInput) =>
      attachOfferMedia(requireWowApiSession(context).client, input),
    onSuccess: async (_mediaId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.version(input.versionId, context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.merchantRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.adminRoot(context.userId) }),
      ]);
    },
  });
}

export function useAttachComplaintEvidence() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AttachComplaintEvidenceInput) =>
      attachComplaintEvidence(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: wowQueryKeys.interactions.myComplaintsRoot(context.userId),
      });
    },
  });
}
