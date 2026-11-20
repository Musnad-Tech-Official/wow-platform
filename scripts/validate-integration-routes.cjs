// Expo Router's declaration generator; no dev server or hosted CI required.
const { createRequire } = require('node:module');
const { mkdirSync, readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');

async function main() {
  const app = process.argv[2];
  if (!app) {
    for (const name of ['customer', 'merchant', 'admin']) {
      const child = spawnSync(process.execPath, [__filename, name], { stdio: 'inherit' });
      if (child.status !== 0) process.exit(child.status || 1);
    }
    return;
  }
  assert(['customer', 'merchant', 'admin'].includes(app));
  const projectRoot = resolve(__dirname, '../apps', app);
  const expoRequire = createRequire(require.resolve('expo/package.json', { paths: [projectRoot] }));
  const cliRoot = dirname(expoRequire.resolve('@expo/cli/package.json'));
  const { setupTypedRoutes } = require(resolve(cliRoot, 'build/src/start/server/type-generation/routes.js'));
  const typesDirectory = resolve(projectRoot, '.expo/types');
  mkdirSync(typesDirectory, { recursive: true });
  await setupTypedRoutes({ projectRoot, routerDirectory: resolve(projectRoot, 'src/app'), typesDirectory });
  // Declaration generation is debounced by Expo.
  await new Promise(resolve => setTimeout(resolve, 1500));
  const declaration = readFileSync(resolve(typesDirectory, 'router.d.ts'), 'utf8');
  assert(declaration.includes('/integration-test'), 'Integration route missing from generated declarations');
  assert(!/\/(auth-test|rls-test)/.test(declaration), 'Obsolete route in generated declarations');
  if (app === 'customer') {
    assert(declaration.includes('/sso-callback'), 'Customer SSO callback route missing from Expo Router declarations');
    const callback = readFileSync(resolve(projectRoot, 'src/app/sso-callback.tsx'), 'utf8');
    assert.match(callback, /WebBrowser\.maybeCompleteAuthSession\(\)/, 'Web popup must complete OAuth session on callback');
    const signIn = readFileSync(resolve(projectRoot, 'src/app/sign-in.tsx'), 'utf8');
    assert.match(signIn, /path: 'sso-callback'/, 'Customer sign-in must use the callback route');
    assert.match(signIn, /redirectUrl/, 'Customer sign-in must specify OAuth redirect URL');
  }
  const layout = readFileSync(resolve(projectRoot, 'src/app/_layout.tsx'), 'utf8');
  assert.match(layout, /Stack\.Protected guard=\{__DEV__\}/);
  const route = readFileSync(resolve(projectRoot, 'src/app/integration-test.tsx'), 'utf8');
  assert.match(route, /if \(!__DEV__\) return <Redirect href="\/"/);
  assert(route.includes(`application="${app}"`));
  console.log(`${app}: Expo route declarations regenerated; integration route, production guards, and obsolete route removal checked.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
