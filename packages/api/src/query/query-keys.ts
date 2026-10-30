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
};
