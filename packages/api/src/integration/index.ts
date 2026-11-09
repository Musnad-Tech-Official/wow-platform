import type { IntegrationApplication, IntegrationContext, IntegrationTest, TestResult } from './types';
import { errorDetails, redact, TestFailure } from './helpers';
import { adminTests, sharedTests } from './shared';
import { merchantTests } from './merchant';

export * from './types';
export { redact, errorDetails, validatePublicSupabaseKey, uuid } from './helpers';

export function integrationTests(application: IntegrationApplication): IntegrationTest[] {
  return [...sharedTests, ...(application === 'merchant' ? merchantTests : application === 'admin' ? adminTests : [])];
}
export function runningResult(test: IntegrationTest, c: IntegrationContext): TestResult {
  return { id: test.id, name: test.name, application: c.application, status: 'RUNNING', explanation: 'Running against the configured Supabase project.', durationMs: 0, userId: c.userId };
}
export async function executeIntegrationTest(test: IntegrationTest, context: IntegrationContext, stateChangeConfirmed = false): Promise<TestResult> {
  const start = Date.now();
  const result = runningResult(test, context);
  try {
    if (test.stateChanging && !stateChangeConfirmed) return { ...result, status: 'SKIPPED', explanation: 'Explicit confirmation is required for this state-changing request.', durationMs: Date.now() - start };
    const outcome = await test.run(context);
    return { ...result, ...outcome, explanation: redact(outcome.explanation), durationMs: Date.now() - start };
  } catch (error) {
    const diagnostic = error instanceof TestFailure ? error.diagnostic : errorDetails(error);
    return { ...result, status: 'FAIL', explanation: diagnostic.message, error: diagnostic, durationMs: Date.now() - start };
  }
}
