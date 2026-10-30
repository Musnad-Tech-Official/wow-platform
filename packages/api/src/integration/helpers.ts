import type { IntegrationContext, TestError } from './types';

export function redact(value: string): string {
  return value
    .replace(/(?:Bearer\s+)?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gi, '[REDACTED JWT]')
    .replace(/\b(?:sb_(?:secret|publishable)_|(?:sk|pk)_(?:live|test)_)[A-Za-z0-9_-]+/g, '[REDACTED KEY]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED EMAIL]')
    .replace(/Failing row contains[^\n]*/gi, '[ROW DATA OMITTED]')
    .slice(0, 1600);
}
export class TestFailure extends Error {
  constructor(public readonly diagnostic: TestError) { super(diagnostic.message); }
}
export function errorDetails(error: unknown, httpStatus?: number): TestError {
  const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const result: TestError = { message: redact(typeof source.message === 'string' ? source.message : String(error)) };
  for (const key of ['code', 'details', 'hint'] as const) {
    if (typeof source[key] === 'string' && source[key]) result[key] = redact(source[key]);
  }
  if (httpStatus) result.httpStatus = httpStatus;
  return result;
}
export function checked<T>(response: { data: T; error: unknown; status: number }): T {
  if (response.error) throw new TestFailure(errorDetails(response.error, response.status));
  return response.data;
}
export const pass = (explanation: string) => ({ status: 'PASS' as const, explanation });
export const fail = (explanation: string, error?: TestError) => ({ status: 'FAIL' as const, explanation, error });
export const skip = (explanation: string) => ({ status: 'SKIPPED' as const, explanation });
export function requireClient(context: IntegrationContext) {
  context.assertIdentity();
  if (!context.isLoaded || !context.isSignedIn || !context.userId) throw new Error('A loaded, signed-in Clerk session is required.');
  if (!context.client) throw new Error(context.configurationError || 'Supabase is not configured.');
  return context.client;
}
export async function readProfile(context: IntegrationContext) {
  const client = requireClient(context);
  const rows = checked(await client.from('users').select('id,account_status').eq('id', context.userId!));
  if (rows?.length === 0) return null;
  if (rows?.length !== 1 || rows[0].id !== context.userId || typeof rows[0].account_status !== 'string') {
    throw new Error('Expected exactly one own profile with matching ID and accessible account_status.');
  }
  return { id: rows[0].id as string, account_status: rows[0].account_status as string };
}
export function permissionDenied(error: unknown, status: number, rpc = false): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: string; message?: string };
  return code === '42501' || (status === 403 && /permission|row.level security|not authorized|forbidden/i.test(message || '')) ||
    (rpc && code === 'P0001' && /unauthori[sz]ed|not authorized|permission|not.*owner|not.*member|access denied|forbidden/i.test(message || ''));
}
export function uuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Check legacy JWT public keys without depending on Node Buffer or a native base64 module.
export function validatePublicSupabaseKey(key: string): void {
  if (key.startsWith('sb_publishable_')) return;
  if (key.startsWith('eyJ')) {
    try {
      const payload = key.split('.')[1];
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let bits = 0, value = 0, decoded = '';
      for (const char of payload.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')) {
        const n = alphabet.indexOf(char);
        if (n < 0) throw new Error('Invalid public key encoding');
        value = (value << 6) | n;
        bits += 6;
        if (bits >= 8) { bits -= 8; decoded += String.fromCharCode((value >> bits) & 255); }
      }
      if (JSON.parse(decoded).role === 'anon') return;
    } catch { /* Report only a constant message, never key content. */ }
  }
  throw new Error('EXPO_PUBLIC_SUPABASE_KEY must be a publishable key or legacy anon JWT. Secret/service-role keys are prohibited.');
}

export async function verifyDatabaseIdentity(context: IntegrationContext): Promise<void> {
  const data = checked(await requireClient(context).rpc('wow_test_auth'));
  const identity = Array.isArray(data) && data.length === 1 ? data[0] : data;
  if (!identity || identity.authenticated !== true || identity.clerk_user_id !== context.userId ||
      identity.database_role !== 'authenticated' || identity.jwt_role !== 'authenticated') {
    throw new Error('wow_test_auth did not confirm this Clerk ID and authenticated database/JWT roles. No raw RPC payload is displayed.');
  }
}

// Network failures can hide a committed write. Block retries until trusted review instead of creating duplicates.
export async function fixtureRequest(context: IntegrationContext, key: string, request: () => PromiseLike<{ data: unknown; error: unknown; status: number }>, capture: (data: unknown) => void) {
  const pending = context.artifacts.unresolvedWrites ??= [];
  if (pending.includes(key)) throw new Error('An earlier creation request has an unresolved outcome. Review test records through a trusted process before starting a new fixture run.');
  pending.push(key);
  const response = await request();
  if (response.error) {
    const code = (response.error as { code?: string }).code;
    // A structured SQL/PostgREST rejection is transactional. Transport failures remain unresolved.
    if (code && /^(?:[0-9A-Z]{5}|PGRST[0-9]+)$/.test(code)) pending.splice(pending.indexOf(key), 1);
    return response;
  }
  capture(response.data);
  pending.splice(pending.indexOf(key), 1);
  return response;
}

export async function createFixture(context: IntegrationContext, key: string, request: () => PromiseLike<{ data: unknown; error: unknown; status: number }>) {
  const response = await fixtureRequest(context, key, request, data => {
    if (!uuid(data)) throw new Error('RPC did not return a scalar UUID; its write outcome is unresolved. Review test records before retrying.');
  });
  return checked(response) as string;
}
