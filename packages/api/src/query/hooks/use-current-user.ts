import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../users';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function useCurrentUser() {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.users.current(context.userId),
    enabled: !!context.userId,
    queryFn: ({ signal }) => {
      const { client, userId } = requireWowApiSession(context);
      return getCurrentUser(client, userId, signal);
    },
    // Missing webhook profiles remain stale, so refocus/reconnect can retry promptly.
    staleTime: query => query.state.data === null ? 0 : 60_000,
  });
}
