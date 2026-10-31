export const wowQueryKeys = {
  users: {
    current: (userId: string | null) => ['users', 'current', userId] as const,
  },
  businesses: {
    mine: (userId: string | null) => ['businesses', 'mine', userId] as const,
    detail: (businessId: string | null, userId: string | null) => ['businesses', 'detail', businessId, userId] as const,
  },
  branches: {
    business: (businessId: string | null, userId: string | null) => ['branches', 'business', businessId, userId] as const,
  },
  verifications: {
    business: (businessId: string | null, userId: string | null) =>
      ['verifications', 'business', businessId, userId] as const,
    adminLists: (userId: string | null) => ['verifications', 'admin', 'list', userId] as const,
    adminList: (userId: string | null, status: string | null, limit: number, offset: number) =>
      ['verifications', 'admin', 'list', userId, status, limit, offset] as const,
    adminDetail: (verificationId: string | null, userId: string | null) =>
      ['verifications', 'admin', 'detail', verificationId, userId] as const,
  },
  offers: {
    merchantRoot: (userId: string | null) => ['offers', 'merchant', userId] as const,
    business: (businessId: string | null, userId: string | null) =>
      ['offers', 'merchant', userId, 'business', businessId] as const,
    versions: (offerId: string | null, userId: string | null) =>
      ['offers', 'merchant', userId, 'versions', offerId] as const,
    version: (versionId: string | null, userId: string | null) =>
      ['offers', 'merchant', userId, 'version', versionId] as const,
    adminRoot: (userId: string | null) => ['offers', 'admin', userId] as const,
    adminList: (limit: number, offset: number, userId: string | null) =>
      ['offers', 'admin', userId, 'pending', limit, offset] as const,
    adminDetail: (versionId: string | null, userId: string | null) =>
      ['offers', 'admin', userId, 'detail', versionId] as const,
  },
};
