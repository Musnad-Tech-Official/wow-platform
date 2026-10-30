import type { IntegrationTest } from './types';
import { checked, errorDetails, fail, pass, permissionDenied, readProfile, requireClient, skip, verifyDatabaseIdentity } from './helpers';

export const sharedTests: IntegrationTest[] = [
  {
    id: 'auth.session', name: 'A — Clerk session', stateChanging: false,
    description: 'Check initialization, sign-in, user ID, and obtain a session token without displaying it.',
    async run(c) {
      c.assertIdentity();
      if (!c.isLoaded) return skip('Clerk is still initializing. Retry when loaded.');
      if (!c.isSignedIn || !c.userId) return fail('Clerk is loaded, but there is no signed-in user.');
      const token = await c.getToken();
      return token ? pass('Clerk returned a session token. Server acceptance is checked separately in B.') : fail('Clerk returned no session token.');
    },
  },
  {
    id: 'auth.supabase', name: 'B — Supabase authentication', stateChanging: false,
    description: 'Call the existing wow_test_auth RPC using the Clerk-aware client and verify the server identity.',
    async run(c) {
      await verifyDatabaseIdentity(c);
      return pass('Supabase accepted the Clerk JWT and confirmed this user with authenticated database/JWT roles.');
    },
  },
  {
    id: 'users.current', name: 'C — Read current user', stateChanging: false,
    description: 'Select only id and account_status from public.users; a missing webhook-synced profile is skipped.',
    async run(c) {
      const profile = await readProfile(c);
      if (!profile) return skip('No visible profile yet. Clerk webhook synchronization may be delayed, or SELECT RLS may hide it. Retry after checking webhook delivery; this is not a pass.');
      c.profile = profile;
      if (!c.artifacts.verifiedProfiles.includes(profile.id)) c.artifacts.verifiedProfiles.push(profile.id);
      return pass('Exactly one matching profile; ID and account_status are accessible.');
    },
  },
  {
    id: 'users.isolation', name: 'D — Cross-user RLS', stateChanging: false,
    description: 'Read a separate, known existing profile. A nonexistent ID provides no isolation evidence.',
    async run(c) {
      const client = requireClient(c);
      const id = c.knownOtherUserId.trim();
      if (!id || id === c.userId) return skip('Supply a different known existing Clerk user ID.');
      if (!c.artifacts.verifiedProfiles.includes(id) && !c.otherUserExistsConfirmed) return skip('First verify this profile using its real Clerk session, or confirm it exists through a trusted administrative inspection.');
      if (!await readProfile(c)) return skip('Own profile must be visible before testing cross-user filtering.');
      const rows = checked(await client.from('users').select('id').eq('id', id));
      return rows?.length === 0 ? pass('Zero rows returned for the known existing other profile.') : fail('SECURITY: another user profile is visible. Row contents are not displayed.');
    },
  },
  {
    id: 'users.write', name: 'E — Client write protection', stateChanging: true,
    description: 'STATE-CHANGING REQUEST: update your account_status to its current value; confirm before running.',
    async run(c) {
      const client = requireClient(c);
      const profile = await readProfile(c);
      if (!profile) return skip('Own profile is not visible; cannot safely choose its existing account_status.');
      const response = await client.from('users').update({ account_status: profile.account_status }).eq('id', c.userId!).eq('account_status', profile.account_status).select('id');
      if (response.error) {
        const error = errorDetails(response.error, response.status);
        return permissionDenied(response.error, response.status) ? { ...pass('UPDATE denied by database privileges/RLS.'), error } : fail('UPDATE failed for a reason other than demonstrated write protection.', error);
      }
      if (response.data?.length === 0) {
        const after = await readProfile(c);
        if (after?.account_status !== profile.account_status) return skip('Account status changed concurrently. The conditional UPDATE did not overwrite it; retry the protection check.');
        return pass('UPDATE affected zero visible rows while own SELECT succeeds with the same status: RLS filters the write.');
      }
      return fail('SECURITY: client UPDATE succeeded. The existing account_status value was used.');
    },
  },
  {
    id: 'users.anonymous', name: 'F — Anonymous database access', stateChanging: false,
    description: 'Use the same public configuration with a token provider that always returns null.',
    async run(c) {
      if (!c.anonymousClient) return fail(c.configurationError || 'Supabase is not configured.');
      const response = await c.anonymousClient.from('users').select('id').limit(1);
      if (response.error) {
        const error = errorDetails(response.error, response.status);
        return permissionDenied(response.error, response.status) ? { ...pass('Anonymous SELECT explicitly denied by privileges/RLS.'), error } : fail('Anonymous request failed, but did not demonstrate users-table permission denial (check configuration/network/JWT).', error);
      }
      return response.data?.length === 0 ? pass('Anonymous SELECT accepted with zero rows (filtered/empty result, not explicit permission denial).') : fail('SECURITY: anonymous SELECT returned user data. Row contents are not displayed.');
    },
  },
];

export const adminTests: IntegrationTest[] = [
  {
    id: 'admin.self', name: 'Inspect current user database access', stateChanging: false,
    description: 'Inspect only the current session’s profile through ordinary RLS.',
    async run(c) {
      const profile = await readProfile(c);
      if (!profile) return skip('Own profile is not visible. Check webhook synchronization and SELECT policies.');
      c.profile = profile;
      return pass('Current profile ID and account status are readable under ordinary client permissions. This grants no admin authority.');
    },
  },
  ...['List all users', 'Approve merchants', 'Change account status', 'Privileged cleanup'].map((name, i): IntegrationTest => ({
    id: `admin.future.${i}`, name, stateChanging: false,
    description: 'Requires a future backend that verifies administrator authorization.',
    async run() { return skip('Admin authorization backend not implemented yet'); },
  })),
];
