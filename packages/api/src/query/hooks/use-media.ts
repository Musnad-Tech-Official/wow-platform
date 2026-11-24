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

/**
 * Signed owner-view URL for an approved business image in the private bucket.
 * Media records store object keys, never long-lived signed URLs.
 */
export function useBusinessMediaSignedUrl(storageKey?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: ['media', 'business', 'signed-preview', context.userId, storageKey ?? null],
    enabled: !!context.userId && !!storageKey,
    staleTime: 25_000,
    refetchInterval: 45_000,
    queryFn: async () => {
      if (!storageKey) throw new Error('Business image storage key is required.');
      const { client } = requireWowApiSession(context);
      const { data, error } = await client.storage.from('wow-business-media')
        .createSignedUrl(storageKey, 60);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Business image URL not available.');
      return data.signedUrl;
    },
  });
}

/** Merchant preview only: the existing private Storage RLS authorizes exact draft image paths. */
export function useOfferMediaSignedUrl(storageKey?:string|null){
  const context=useWowApiContext();
  return useQuery({
    queryKey:['media','offer','signed-preview',context.userId,storageKey??null],
    enabled:!!context.userId&&!!storageKey,
    staleTime:20_000,refetchInterval:40_000,retry:false,
    queryFn:async()=>{
      if(!storageKey||!/^([0-9a-f-]{36})\/([0-9a-f-]{36})\/[A-Za-z0-9_-]{3,128}\/[a-f0-9]{48}\.(jpg|jpeg|png|webp)$/.test(storageKey))throw new Error('Invalid offer image key');
      const {client}=requireWowApiSession(context);
      const {data,error}=await client.storage.from('wow-offer-media').createSignedUrl(storageKey,60);
      if(error)throw error;
      if(!data?.signedUrl)throw new Error('Image unavailable');
      return data.signedUrl;
    },
  });
}
