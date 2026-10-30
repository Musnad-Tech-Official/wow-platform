import type { ClerkTokenProvider, WowSupabaseClient } from '../supabase/client';

export type IntegrationApplication = 'customer' | 'merchant' | 'admin';
export type TestStatus = 'PASS' | 'FAIL' | 'SKIPPED' | 'RUNNING';
export interface TestError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  httpStatus?: number;
}
export interface TestResult {
  id: string;
  name: string;
  application: IntegrationApplication;
  status: TestStatus;
  explanation: string;
  durationMs: number;
  userId: string | null;
  error?: TestError;
}
export interface ProfilePreview { id: string; account_status: string }
// Evidence is collected by real, successful owner reads, never by accepting a pasted business ID.
export interface IntegrationArtifacts {
  verifiedProfiles: string[];
  unresolvedWrites?: string[];
  ownerUserId?: string;
  businessId?: string;
  ownershipVerified?: boolean;
  firstBranchId?: string;
  secondBranchId?: string;
  unauthorizedBranchId?: string;
  directBusinessId?: string;
  directAttemptId?: string;
  unauthorizedAttemptName?: string;
  unauthorizedAttemptDenied?: boolean;
}
export interface IntegrationContext {
  application: IntegrationApplication;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: ClerkTokenProvider;
  client: WowSupabaseClient | null;
  anonymousClient: WowSupabaseClient | null;
  configurationError?: string;
  assertIdentity: () => void;
  knownOtherUserId: string;
  otherUserExistsConfirmed: boolean;
  branchParameters: Record<string, unknown>;
  artifacts: IntegrationArtifacts;
  profile?: ProfilePreview;
}
export interface IntegrationTest {
  id: string;
  name: string;
  stateChanging: boolean;
  description: string;
  run: (context: IntegrationContext) => Promise<{ status: 'PASS' | 'FAIL' | 'SKIPPED'; explanation: string; error?: TestError }>;
}
