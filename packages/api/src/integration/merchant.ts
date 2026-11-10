import type { IntegrationContext, IntegrationTest } from './types';
import { checked, errorDetails, fail, pass, permissionDenied, requireClient, skip, uuid, createFixture, fixtureRequest, verifyDatabaseIdentity } from './helpers';

async function business(c: IntegrationContext) {
  const client = requireClient(c);
  if (!c.artifacts.businessId) return null;
  const rows = checked(await client.from('businesses').select('id,owner_user_id,status').eq('id', c.artifacts.businessId));
  return rows?.length === 1 ? rows[0] : null;
}
async function branches(c: IntegrationContext) {
  return checked(await requireClient(c).from('business_branches').select('id,business_id,status,is_primary').eq('business_id', c.artifacts.businessId!)) || [];
}
function ownerReady(c: IntegrationContext) {
  requireClient(c);
  return c.artifacts.businessId && c.artifacts.ownerUserId === c.userId && c.artifacts.ownershipVerified;
}
async function createBranch(c: IntegrationContext, second: boolean) {
  if (!ownerReady(c)) return skip('Create and verify the test business using its owner session first.');
  const field = second ? 'secondBranchId' : 'firstBranchId';
  if (second && !c.artifacts.firstBranchId) return skip('Create the first branch before the second.');
  const before = await branches(c);
  if (second && !before.some(b => b.id === c.artifacts.firstBranchId && b.is_primary === true)) return fail('The first branch is not primary before creating the second.');
  if (!c.artifacts[field]) {
    if (!second && before.length > 0) return skip('This business already has branches but no captured first-branch ID. Review records before continuing.');
    const id = await createFixture(c, field, () => requireClient(c).rpc('wow_create_branch', {
      ...c.branchParameters,
      p_business_id: c.artifacts.businessId,
      p_name: second ? 'WOW Integration Test Second Branch' : 'WOW Integration Test Primary Branch',
    }));
    c.artifacts[field] = id; // Retain IDs before verification, including failed verification.
  }
  const rows = await branches(c);
  const branch = rows.find(b => b.id === c.artifacts[field]);
  if (!branch || branch.business_id !== c.artifacts.businessId || branch.status !== 'draft' || branch.is_primary !== !second) return fail('Branch relationship, draft status, or primary flag does not match expectations. Captured IDs are retained.');
  if (rows.filter(b => b.is_primary === true).length !== 1 || (second && !rows.some(b => b.id === c.artifacts.firstBranchId && b.is_primary === true))) return fail('Expected exactly one primary branch, with the original primary unchanged.');
  return pass(second ? 'Second branch is draft and non-primary; the original branch remains the only primary.' : 'First branch is draft, belongs to this business, and is the only primary.');
}

export const merchantTests: IntegrationTest[] = [
  {
    id: 'merchant.create', name: 'Merchant A — Create business', stateChanging: true,
    description: 'STATE-CHANGING: wow_create_business with an identifiable test name. Reuses the captured UUID on reruns.',
    async run(c) {
      const client = requireClient(c);
      if (c.artifacts.businessId) return c.artifacts.ownerUserId === c.userId ? pass('Reusing the test business UUID; no duplicate RPC call.') : skip('Existing fixture belongs to the first account. Sign back in as its owner.');
      const id = await createFixture(c, 'businessId', () => client.rpc('wow_create_business', { p_name: 'WOW Integration Test Business', p_description: 'Development integration test. Review and clean up through a trusted administrative process.' }));
      c.artifacts.businessId = id;
      c.artifacts.ownerUserId = c.userId!;
      return pass('wow_create_business returned a UUID. Verify ownership with Merchant B next.');
    },
  },
  {
    id: 'merchant.ownership', name: 'Merchant B — Business ownership', stateChanging: false,
    description: 'Verify draft business ownership and an active owner membership with the actual owner session.',
    async run(c) {
      if (!c.artifacts.businessId || c.artifacts.ownerUserId !== c.userId) return skip('Create the test business and use its owner session first.');
      c.artifacts.ownershipVerified = false;
      const row = await business(c);
      if (!row || row.owner_user_id !== c.userId || row.status !== 'draft') return fail('Expected a visible draft business owned by this Clerk user.');
      const members = checked(await requireClient(c).from('business_members').select('user_id,role,status').eq('business_id', c.artifacts.businessId).eq('user_id', c.userId!));
      if (members?.length !== 1 || members[0].role !== 'owner' || members[0].status !== 'active') return fail('Expected exactly one active owner membership for the current user.');
      c.artifacts.ownershipVerified = true;
      return pass('Owner ID and draft status match; business_members confirms active owner membership.');
    },
  },
  {
    id: 'merchant.branch.first', name: 'Merchant C — Create first branch', stateChanging: true,
    description: 'STATE-CHANGING: create and verify the first draft, primary branch. Reuses its UUID on reruns.',
    run: c => createBranch(c, false),
  },
  {
    id: 'merchant.branch.second', name: 'Merchant D — Create second branch', stateChanging: true,
    description: 'STATE-CHANGING: create a second draft branch and verify the first remains primary. Reuses its UUID.',
    run: c => createBranch(c, true),
  },
  {
    id: 'merchant.isolation', name: 'Merchant E — Business RLS isolation', stateChanging: false,
    description: 'After owner verification, sign out here and sign in with a second real Clerk account; fixture evidence stays in memory.',
    async run(c) {
      requireClient(c);
      if (!c.artifacts.businessId || !c.artifacts.ownershipVerified) return skip('Requires an existing business verified by its authenticated owner in this screen.');
      if (c.userId === c.artifacts.ownerUserId) return skip('Sign in as a different real Clerk account using the controls above.');
      await verifyDatabaseIdentity(c);
      if (!await business(c)) return pass('Second authenticated account received zero rows for the verified owner business.');
      return fail('SECURITY: the second account can read the first account’s verified business.');
    },
  },
  {
    id: 'merchant.branch.unauthorized', name: 'Merchant F — Unauthorized branch creation', stateChanging: true,
    description: 'STATE-CHANGING: attempt RPC with the second account. Then sign back in as owner and rerun to prove no branch was created.',
    async run(c) {
      const client = requireClient(c);
      if (!c.artifacts.businessId || !c.artifacts.ownershipVerified) return skip('Requires the first account’s verified business.');
      if (c.artifacts.unauthorizedBranchId) return fail('A previous second-account branch RPC succeeded. Review the captured branch ID before any further attempts.');
      if (c.userId === c.artifacts.ownerUserId) {
        if (!c.artifacts.unauthorizedAttemptDenied || !c.artifacts.unauthorizedAttemptName) return skip('First run this test with the second authenticated account.');
        if (!await business(c)) return skip('Owner can no longer see the test business; absence cannot be established.');
        const visibleBranches = await branches(c);
        if (!c.artifacts.firstBranchId || !visibleBranches.some(b => b.id === c.artifacts.firstBranchId)) return skip('Verify a visible first branch as owner before proving absence of the unauthorized branch.');
        const rows = checked(await client.from('business_branches').select('id').eq('business_id', c.artifacts.businessId).eq('name', c.artifacts.unauthorizedAttemptName));
        return rows?.length === 0 ? pass('Second-account RPC was explicitly denied; the owner confirmed no branch with the unique attempt name exists.') : fail('SECURITY: owner inspection found a branch after the denied second-account RPC.');
      }
      if (c.artifacts.unauthorizedAttemptDenied) return skip('RPC rejection captured. Sign back in as the owner and rerun this test to verify no branch was created.');
      await verifyDatabaseIdentity(c);
      const name = `WOW Integration Test Unauthorized ${Date.now()}`;
      const response = await fixtureRequest(c, 'unauthorizedBranchId', () => {
        c.artifacts.unauthorizedAttemptName = name;
        return client.rpc('wow_create_branch', { ...c.branchParameters, p_business_id: c.artifacts.businessId, p_name: name });
      }, data => {
        if (!uuid(data)) throw new Error('Second-account branch RPC returned no scalar UUID; its write outcome is unresolved. Review the recorded attempt name before retrying.');
        c.artifacts.unauthorizedBranchId = data;
      });
      if (!response.error) {
        return fail('SECURITY: second-account branch RPC succeeded. Review the business and any captured UUID.');
      }
      const error = errorDetails(response.error, response.status);
      if (!permissionDenied(response.error, response.status, true)) return fail('RPC failed without demonstrating authorization denial (a schema/validation error does not count).', error);
      c.artifacts.unauthorizedAttemptDenied = true;
      return { ...skip('RPC explicitly denied. NOT COMPLETE: sign back in as owner and rerun to confirm no branch exists for this attempt.'), error };
    },
  },
  {
    id: 'merchant.direct', name: 'Merchant G — Direct table write protection', stateChanging: true,
    description: 'STATE-CHANGING: direct INSERT into businesses. A successful insert is a security failure and is retained for review.',
    async run(c) {
      const client = requireClient(c);
      if (c.artifacts.directBusinessId) return fail('A previous direct INSERT succeeded. Review the captured business ID before any further attempts.');
      // Explicit client UUID allows reporting the record even if INSERT RETURNING is not permitted.
      const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
        const n = Math.floor(Math.random() * 16);
        return (char === 'x' ? n : (n & 3) | 8).toString(16);
      });
      const response = await fixtureRequest(c, 'directBusinessId', () => {
        c.artifacts.directAttemptId = id;
        return client.from('businesses').insert({ id, name: 'WOW Integration Test Direct Insert', description: 'Direct write protection test', owner_user_id: c.userId, status: 'draft' });
      }, () => { c.artifacts.directBusinessId = id; });
      if (response.error) {
        const error = errorDetails(response.error, response.status);
        return permissionDenied(response.error, response.status) ? { ...pass('Direct INSERT explicitly denied by privileges/RLS. RPC creation is checked separately in Merchant A.'), error } : fail('INSERT failed for a different reason. Constraints/schema errors do not prove direct write protection.', error);
      }
      return fail('SECURITY: direct INSERT succeeded. Review and clean up the captured ID through a trusted administrative process.');
    },
  },
];
