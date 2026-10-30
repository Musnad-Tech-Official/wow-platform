import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useAuth, useClerk, useSSO } from '@wow/auth';
import {
  createWowSupabaseClient, validatePublicSupabaseKey, errorDetails, executeIntegrationTest, integrationTests, runningResult,
  type IntegrationApplication, type IntegrationArtifacts, type IntegrationContext,
  type IntegrationTest, type ProfilePreview, type TestResult,
} from '@wow/api';
import { AppButton } from '../AppButton';
import { AppInput } from '../AppInput';
import { AppText } from '../AppText';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { Checkbox } from '../Checkbox';
import { ThemeSwitcher } from '../ThemeSwitcher';

interface Props {
  application: IntegrationApplication;
  supabaseUrl?: string;
  supabasePublicKey?: string;
  onBack: () => void;
}

export function IntegrationTestScreen(props: Props) {
  // Defense in depth in addition to each app's protected route and route component guard.
  if (!__DEV__) return null;
  return <DevelopmentIntegrationScreen {...props} />;
}

function DevelopmentIntegrationScreen({ application, supabaseUrl, supabasePublicKey, onBack }: Props) {
  const auth = useAuth();
  const { signOut } = useClerk();
  const { startSSOFlow } = useSSO();
  const identity = useRef(auth);
  useLayoutEffect(() => { identity.current = auth; }, [auth]);
  const lock = useRef(false);
  const artifacts = useRef<IntegrationArtifacts>({ verifiedProfiles: [] });
  const [artifactPreview, setArtifactPreview] = useState<IntegrationArtifacts>({ verifiedProfiles: [] });
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [profile, setProfile] = useState<ProfilePreview>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [knownOtherUserId, setKnownOtherUserId] = useState('');
  const [otherUserExistsConfirmed, setOtherUserExistsConfirmed] = useState(false);
  const [branchJson, setBranchJson] = useState('{}');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<IntegrationTest>();
  const tests = useMemo(() => integrationTests(application), [application]);
  const configuration = useMemo(() => {
    if (!supabaseUrl || !supabasePublicKey) return { error: 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY.' };
    try {
      validatePublicSupabaseKey(supabasePublicKey);
      // Anonymous requests reuse the factory; only the token provider differs.
      return { anonymousClient: createWowSupabaseClient({ url: supabaseUrl, publishableKey: supabasePublicKey, getToken: async () => null }) };
    } catch (error) { return { error: errorDetails(error).message }; }
  }, [supabaseUrl, supabasePublicKey]);

  function context(selected: IntegrationTest[]): IntegrationContext {
    const snapshot = identity.current;
    const userId = snapshot.userId ?? null;
    const sessionId = snapshot.sessionId;
    const assertIdentity = () => {
      if (identity.current.userId !== snapshot.userId || identity.current.sessionId !== sessionId) throw new Error('Clerk identity changed during execution. Rerun using the current session.');
    };
    const getToken = async () => {
      assertIdentity();
      if (!identity.current.isLoaded || !identity.current.isSignedIn) throw new Error('A signed-in Clerk session is required; authenticated tests never fall back to anonymous access.');
      const token = await identity.current.getToken();
      assertIdentity();
      if (!token) throw new Error('Clerk did not return a session token.');
      return token;
    };
    let branchParameters: Record<string, unknown> = {};
    if (selected.some(test => test.id.startsWith('merchant.branch.'))) {
      const value: unknown = JSON.parse(branchJson);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Additional branch RPC parameters must be a JSON object.');
      branchParameters = value as Record<string, unknown>;
      if (Object.keys(branchParameters).some(key => !key.startsWith('p_'))) throw new Error('Use only named RPC parameters beginning with p_.');
    }
    return {
      application, isLoaded: snapshot.isLoaded, isSignedIn: !!snapshot.isSignedIn, userId, getToken,
      client: configuration.error ? null : createWowSupabaseClient({ url: supabaseUrl!, publishableKey: supabasePublicKey!, getToken }),
      anonymousClient: configuration.anonymousClient ?? null,
      configurationError: configuration.error, assertIdentity,
      knownOtherUserId, otherUserExistsConfirmed, branchParameters, artifacts: artifacts.current,
    };
  }

  async function run(selected: IntegrationTest[], confirmed = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setPending(undefined);
    setNotice('');
    setProgress({ completed: 0, total: selected.length });
    try {
      const c = context(selected);
      for (let index = 0; index < selected.length; index++) {
        c.assertIdentity();
        const test = selected[index];
        setResults(previous => ({ ...previous, [test.id]: runningResult(test, c) }));
        const result = await executeIntegrationTest(test, c, confirmed);
        setArtifactPreview({ ...c.artifacts, verifiedProfiles: [...c.artifacts.verifiedProfiles], unresolvedWrites: c.artifacts.unresolvedWrites ? [...c.artifacts.unresolvedWrites] : undefined });
        setResults(previous => ({ ...previous, [test.id]: result }));
        if (c.profile) setProfile(c.profile);
        setProgress({ completed: index + 1, total: selected.length });
      }
    } catch (error) { setNotice(errorDetails(error).message); }
    finally { lock.current = false; setBusy(false); }
  }

  async function authenticate(strategy?: 'oauth_google' | 'oauth_facebook') {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice('');
    setProfile(undefined);
    try {
      if (!strategy) {
        await signOut();
      } else {
        const { createdSessionId, setActive } = await startSSOFlow({ strategy });
        if (!createdSessionId || !setActive) throw new Error('Sign-in did not produce an active session. Complete any required steps in the existing Clerk flow.');
        await setActive({ session: createdSessionId });
      }
    } catch (error) { setNotice(errorDetails(error).message); }
    finally { lock.current = false; setBusy(false); }
  }

  const connectivity = results['auth.supabase'];
  const currentConnectivity = connectivity && connectivity.userId === auth.userId ? connectivity.status : 'NOT RUN for current session';
  const safe = tests.filter(test => !test.stateChanging);
  const writes = tests.filter(test => test.stateChanging);

  function testCard(test: IntegrationTest) {
    const result = results[test.id];
    const open = expanded[test.id];
    const status = result?.status ?? 'NOT RUN';
    return (
      <Card key={test.id}>
        <AppText variant="heading">{test.name}</AppText>
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={status} variant={status === 'PASS' ? 'primary' : 'secondary'}
            className={status === 'FAIL' ? 'border-red-500' : status === 'SKIPPED' ? 'border-primary' : ''} />
          {test.stateChanging && <Badge label="STATE-CHANGING" variant="secondary" />}
          {result && <AppText variant="caption" muted>{result.durationMs} ms</AppText>}
        </View>
        <AppText accessibilityLiveRegion="polite">{result?.explanation ?? 'Not executed yet.'}</AppText>
        {result && <AppText variant="caption" muted selectable>Run identity: {result.userId ?? 'anonymous / signed out'}{result.userId !== (auth.userId ?? null) ? ' — previous account' : ''}</AppText>}
        <AppButton title={open ? 'Hide details' : 'Show details'} variant="secondary" size="sm"
          accessibilityState={{ expanded: !!open }} onPress={() => setExpanded(previous => ({ ...previous, [test.id]: !open }))} />
        {open && <View className="gap-2">
          <AppText variant="caption" muted selectable>{test.id} · {application}</AppText>
          <AppText>{test.description}</AppText>
          {result?.error && <AppText selectable variant="caption">{JSON.stringify(result.error, null, 2)}</AppText>}
        </View>}
        <AppButton title={test.stateChanging ? 'Review and run' : 'Run'} disabled={busy || !!pending}
          onPress={() => test.stateChanging ? setPending(test) : void run([test])} />
        {pending?.id === test.id && <Card className="border-primary">
        <AppText variant="heading">Confirm state-changing test</AppText>
        <AppText>{pending.name}: {pending.description}</AppText>
        <AppText selectable>Account: {auth.userId ?? 'None'}. This request may write real records. Test records require later review through a trusted administrative process.</AppText>
        <AppButton title="Confirm and execute once" disabled={busy} onPress={() => void run([pending], true)} />
        <AppButton title="Cancel" variant="secondary" disabled={busy} onPress={() => setPending(undefined)} />
      </Card>}
      </Card>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pt-14 pb-12 gap-5">
      <AppButton title="Back to app" variant="secondary" disabled={busy} onPress={onBack} />
      <AppText variant="title">WOW · {application} integration tests</AppText>
      <AppText muted>Development only. Tests use real Clerk sessions and the configured Supabase Cloud project. No live result is implied until you run a test.</AppText>
      <ThemeSwitcher />
      <Card>
        <AppText variant="heading">Current authentication</AppText>
        <AppText>Clerk: {!auth.isLoaded ? 'Initializing' : auth.isSignedIn ? 'Signed in' : 'Signed out'}</AppText>
        <AppText selectable>User ID: {auth.userId ?? 'None'}</AppText>
        <AppText>Supabase: {configuration.error ?? currentConnectivity}</AppText>
        <AppText selectable>Profile: {profile?.id === auth.userId ? JSON.stringify(profile, null, 2) : 'NOT RUN for current account. Run C to load a minimal preview.'}</AppText>
        <AppText variant="caption" muted>Tokens and credentials are never displayed. Sign out, then sign in with another real test account to test isolation. Evidence remains in memory while this screen stays mounted; copy test IDs before leaving or reloading.</AppText>
        {auth.isSignedIn ? <AppButton title="Sign out to switch test account" variant="secondary" disabled={busy || !!pending} onPress={() => void authenticate()} /> : <>
          <AppButton title="Sign in with Google" disabled={!auth.isLoaded || busy || !!pending} onPress={() => void authenticate('oauth_google')} />
          <AppButton title="Sign in with Facebook" variant="secondary" disabled={!auth.isLoaded || busy || !!pending} onPress={() => void authenticate('oauth_facebook')} />
        </>}
      </Card>
      <Card>
        <AppText variant="heading">Known other profile</AppText>
        <AppInput label="Existing other Clerk user ID" value={knownOtherUserId} autoCapitalize="none" autoCorrect={false} editable={!busy && !pending}
          onChangeText={value => { setKnownOtherUserId(value); setOtherUserExistsConfirmed(false); }} />
        <Checkbox label="I verified this exact profile exists through its real session or trusted database inspection" checked={otherUserExistsConfirmed} disabled={busy || !!pending} onCheckedChange={setOtherUserExistsConfirmed} />
        <AppText variant="caption" muted selectable>Profiles verified in this screen: {artifactPreview.verifiedProfiles.join(', ') || 'None'}. An invented ID does not prove RLS.</AppText>
      </Card>
      {application === 'merchant' && <Card>
        <AppText variant="heading">Merchant fixtures</AppText>
        <AppText>Run A, B, C, D as owner. Switch accounts for E and F; return as owner and rerun F to verify absence. G is an independent direct-write probe.</AppText>
        <AppInput label="Additional wow_create_branch named parameters (JSON)" value={branchJson} onChangeText={setBranchJson} multiline autoCapitalize="none" autoCorrect={false} editable={!busy && !pending}
          hint="RPC signature is not available in this checkout. p_business_id and p_name are supplied by the test and cannot be overridden. Add any other parameters required by your deployed function." />
        <AppText variant="caption" muted>Created records remain in Supabase. Copy these IDs for trusted administrative review/cleanup. Clear Results retains fixtures to prevent duplicate creation. Leaving or reloading loses in-memory evidence.</AppText>
        <AppText selectable>{JSON.stringify(artifactPreview, null, 2)}</AppText>
      </Card>}
      {application === 'admin' && <Card>
        <AppText variant="heading">Admin capability readiness</AppText>
        <AppText>Available to test: Clerk session, authenticated database identity, own profile inspection, ordinary user RLS and client protection.</AppText>
        <Badge label="SKIPPED — Admin authorization backend not implemented yet" variant="secondary" />
        <AppText>Future: list all users, approve merchants, change account status, privileged cleanup. Being signed in to this app grants no administrative authority.</AppText>
      </Card>}
      <Card>
        <AppButton title="Run All Safe Tests" disabled={busy || !!pending} loading={busy} onPress={() => void run(safe)} />
        <AppText variant="caption" muted>Includes read-only tests only. State-changing probes always require individual confirmation.</AppText>
        <AppButton title="Clear Results" variant="secondary" disabled={busy || !!pending} onPress={() => { setResults({}); setProfile(undefined); setProgress({ completed: 0, total: 0 }); setNotice(''); }} />
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: progress.total || 1, now: progress.completed }}>
          <AppText accessibilityLiveRegion="polite">{busy ? 'Working · ' : ''}{progress.completed} / {progress.total} tests completed</AppText>
          <View className="h-2 overflow-hidden rounded-xl bg-border"><View className="h-2 bg-primary" style={{ width: `${progress.total ? progress.completed / progress.total * 100 : 0}%` }} /></View>
        </View>
        {!!notice && <AppText selectable accessibilityLiveRegion="polite" className="text-red-500">{notice}</AppText>}
      </Card>
      <AppText variant="heading">Read-only tests</AppText>
      {safe.map(testCard)}
      <AppText variant="heading">State-changing tests · confirmation required</AppText>
      {writes.map(testCard)}
    </ScrollView>
  );
}
