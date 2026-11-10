export const wowQueryKeys = {
  users: {
    current: (userId: string | null) => ['users', 'current', userId] as const,
  },
  businesses: {
    mine: (userId: string | null) => ['businesses', 'mine', userId] as const,
    detail: (businessId: string | null, userId: string | null) => ['businesses', 'detail', businessId, userId] as const,
    representativeDraft: (businessId: string | null, userId: string | null) =>
      ['businesses', 'representative', businessId, userId] as const,
  },
  branches: {
    business: (businessId: string | null, userId: string | null) => ['branches', 'business', businessId, userId] as const,
  },
  verifications: {
    evidenceDraft: (businessId: string | null, userId: string | null) =>
      ['verifications', 'evidenceDraft', businessId, userId] as const,
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
  interactions: {
    savedOffers: (userId: string | null) => ['interactions', 'savedOffers', userId] as const,
    savedBusinesses: (userId: string | null) => ['interactions', 'savedBusinesses', userId] as const,
    myRatingsRoot: (userId: string | null) => ['interactions', 'ratings', 'customer', userId] as const,
    myRatings: (userId: string | null, limit: number, offset: number) =>
      ['interactions', 'ratings', 'customer', userId, limit, offset] as const,
    myComplaintsRoot: (userId: string | null) => ['interactions', 'complaints', 'customer', userId] as const,
    myComplaints: (userId: string | null, limit: number, offset: number) =>
      ['interactions', 'complaints', 'customer', userId, limit, offset] as const,
    merchantComplaintsRoot: (userId: string | null) =>
      ['interactions', 'complaints', 'merchant', userId] as const,
    merchantComplaints: (businessId: string | null, userId: string | null, limit: number, offset: number) =>
      ['interactions', 'complaints', 'merchant', userId, businessId, limit, offset] as const,
    adminRatingsRoot: (userId: string | null) =>
      ['interactions', 'ratings', 'admin', userId] as const,
    adminRatings: (userId: string | null, status: string | null, limit: number, offset: number) =>
      ['interactions', 'ratings', 'admin', userId, status, limit, offset] as const,
    adminComplaintsRoot: (userId: string | null) =>
      ['interactions', 'complaints', 'admin', userId] as const,
    adminComplaints: (userId: string | null, status: string | null, limit: number, offset: number) =>
      ['interactions', 'complaints', 'admin', userId, status, limit, offset] as const,
    adminComplaint: (userId: string | null, complaintId: string | null) =>
      ['interactions', 'complaints', 'admin', userId, 'detail', complaintId] as const,
  },
  billing: {
    root: (userId: string | null) => ['billing', userId] as const,
    plans: (userId: string | null) => ['billing', userId, 'plans'] as const,
    businessRoot: (userId: string | null) => ['billing', userId, 'business'] as const,
    business: (userId: string | null, businessId: string | null) =>
      ['billing', userId, 'business', businessId] as const,
    adminPaymentsRoot: (userId: string | null) =>
      ['billing', userId, 'admin-payments'] as const,
    adminPayments: (userId: string | null, status: string | null, limit: number, offset: number) =>
      ['billing', userId, 'admin-payments', status, limit, offset] as const,
  },
  discovery: {
    root: () => ['discovery'] as const,
    categories: () => ['discovery', 'categories'] as const,
    search: (
      query: string | null, city: string | null, district: string | null,
      categoryId: string | null, sort: string, limit: number, offset: number,
    ) => ['discovery', 'search', query, city, district, categoryId, sort, limit, offset] as const,
    business: (businessId: string | null) => ['discovery', 'business', businessId] as const,
    offer: (offerId: string | null) => ['discovery', 'offer', offerId] as const,
    offerMedia: (offerId: string | null) => ['discovery', 'offer-media', offerId] as const,
  },
  merchantOperations: {
    ownerRoot: (userId: string | null) => ['merchant-operations', 'owner', userId] as const,
    team: (userId: string | null, businessId: string | null) =>
      ['merchant-operations', 'owner', userId, 'team', businessId] as const,
    revisions: (userId: string | null, businessId: string | null) =>
      ['merchant-operations', 'owner', userId, 'revisions', businessId] as const,
    adminRoot: (userId: string | null) => ['merchant-operations', 'admin', userId] as const,
    adminList: (userId: string | null, limit: number, offset: number) =>
      ['merchant-operations', 'admin', userId, 'revisions', limit, offset] as const,
  },
};
