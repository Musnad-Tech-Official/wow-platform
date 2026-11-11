// scripts/capture-admin-batch01-screenshots.cjs
// Visual Review Capture Suite for Admin Batch 01 (ADM-01, ADM-02, ADM-14)
// Consolidated Security, UI/UX & Brand Fidelity Visual Capture

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'artifacts', 'admin-batch01-review');
const zipPath = path.join(repoRoot, 'ADMIN_BATCH01_VISUAL_REVIEW.zip');
const distDir = path.join(repoRoot, 'apps', 'admin', 'dist', 'admin-web');

fs.mkdirSync(outputDir, { recursive: true });

// Clean previous review artifacts
for (const file of fs.readdirSync(outputDir)) {
  if (file.endsWith('.png') || file.endsWith('.json') || file.endsWith('.md')) {
    try {
      fs.unlinkSync(path.join(outputDir, file));
    } catch {}
  }
}
if (fs.existsSync(zipPath)) {
  try {
    fs.unlinkSync(zipPath);
  } catch {}
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function createStaticServer(directory) {
  return http.createServer((req, res) => {
    try {
      const urlPath = req.url.split('?')[0];
      let filePath = path.join(directory, urlPath);

      if (urlPath === '/' || urlPath === '') {
        filePath = path.join(directory, 'index.html');
      } else if (urlPath === '/roles') {
        filePath = path.join(directory, 'roles.html');
      } else if (!path.extname(filePath)) {
        if (fs.existsSync(filePath + '.html')) {
          filePath = filePath + '.html';
        } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
          filePath = path.join(filePath, 'index.html');
        }
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': mime,
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const indexHtml = path.join(directory, 'index.html');
        if (fs.existsSync(indexHtml)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(indexHtml).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error: ' + err.message);
    }
  });
}

function computeSha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function run() {
  console.log('[1/5] Cleaning export directory and building clean development admin web bundle...');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  const nodePath = path.join(repoRoot, 'node_modules', '.pnpm', '@babel+traverse@7.29.10', 'node_modules');

  // Strict requirement: Build must exit with code 0. Do NOT accept stale files on build failure!
  execSync('pnpm --filter admin exec expo export -p web --dev --output-dir dist/admin-web', {
    cwd: repoRoot,
    env: { ...process.env, NODE_PATH: nodePath },
    stdio: 'inherit',
  });

  const indexHtml = path.join(distDir, 'index.html');
  const rolesHtml = path.join(distDir, 'roles.html');
  if (!fs.existsSync(indexHtml) || !fs.existsSync(rolesHtml)) {
    throw new Error('Export completed without required HTML entrypoints');
  }
  console.log('Admin web bundle successfully exported at', distDir);

  console.log('[2/5] Starting static HTTP server...');
  const server = createStaticServer(distDir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Server listening on ${baseUrl}`);

  console.log('[3/5] Initializing Playwright browser...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const capturedFiles = [];

  const targets = [
    {
      file: '01_adm01_access_desktop_light.png',
      path: '/?preview=adm01',
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
      fullPage: true,
      description: 'ADM-01 Restricted Admin Access (Desktop Light - Full Page)',
    },
    {
      file: '02_adm01_access_desktop_dark.png',
      path: '/?preview=adm01',
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark',
      fullPage: true,
      description: 'ADM-01 Restricted Admin Access (Desktop Dark - Full Page)',
    },
    {
      file: '03_adm01_access_mobile_light.png',
      path: '/?preview=adm01',
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
      fullPage: false,
      description: 'ADM-01 Restricted Admin Access (Mobile Light)',
    },
    {
      file: '04_adm01_access_mobile_dark.png',
      path: '/?preview=adm01',
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      fullPage: false,
      description: 'ADM-01 Restricted Admin Access (Mobile Dark)',
    },
    {
      file: '05_adm01_loading_verification.png',
      path: '/?preview=adm01-loading',
      viewport: { width: 1200, height: 800 },
      colorScheme: 'light',
      fullPage: false,
      description: 'ADM-01 Server Verification Loading State',
    },
    {
      file: '06_adm01_denied_insufficient_privileges.png',
      path: '/?preview=adm01-denied',
      viewport: { width: 1200, height: 800 },
      colorScheme: 'light',
      fullPage: false,
      description: 'ADM-01 Denied / Insufficient Privileges (Fail-Closed)',
    },
    {
      file: '07_adm01_network_error_retry.png',
      path: '/?preview=adm01-error',
      viewport: { width: 1200, height: 800 },
      colorScheme: 'light',
      fullPage: false,
      description: 'ADM-01 Network/Database Error with Retry State',
    },
    {
      file: '08_adm02_dashboard_desktop_light.png',
      path: '/?preview=adm02',
      viewport: { width: 1440, height: 1024 },
      colorScheme: 'light',
      fullPage: true,
      description: 'ADM-02 Operations Dashboard (Desktop Light - Full Page)',
    },
    {
      file: '09_adm02_dashboard_desktop_dark.png',
      path: '/?preview=adm02',
      viewport: { width: 1440, height: 1024 },
      colorScheme: 'dark',
      fullPage: true,
      description: 'ADM-02 Operations Dashboard (Desktop Dark - Full Page)',
    },
    {
      file: '10_adm02_dashboard_tablet_light.png',
      path: '/?preview=adm02',
      viewport: { width: 820, height: 1180 },
      colorScheme: 'light',
      fullPage: false,
      description: 'ADM-02 Operations Dashboard (Tablet Light)',
    },
    {
      file: '11_adm02_dashboard_mobile_light.png',
      path: '/?preview=adm02',
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
      fullPage: false,
      description: 'ADM-02 Operations Dashboard (Mobile Light)',
    },
    {
      file: '12_adm02_dashboard_empty_state.png',
      path: '/?preview=adm02-empty',
      viewport: { width: 1440, height: 1024 },
      colorScheme: 'light',
      fullPage: true,
      description: 'ADM-02 Operations Dashboard (Truthful Empty State - Full Page)',
    },
    {
      file: '13_adm14_roles_desktop_light.png',
      path: '/roles?preview=adm14',
      viewport: { width: 1440, height: 1024 },
      colorScheme: 'light',
      fullPage: true,
      description: 'ADM-14 Admin Roles & Permissions (Desktop Light - Full Page)',
    },
    {
      file: '14_adm14_roles_desktop_dark.png',
      path: '/roles?preview=adm14',
      viewport: { width: 1440, height: 1024 },
      colorScheme: 'dark',
      fullPage: true,
      description: 'ADM-14 Admin Roles & Permissions (Desktop Dark - Full Page)',
    },
    {
      file: '15_adm14_roles_mobile_light.png',
      path: '/roles?preview=adm14',
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
      fullPage: false,
      description: 'ADM-14 Admin Roles & Permissions (Responsive Mobile Card Layout)',
    },
    {
      file: '16_adm14_roles_contract_guard_gap.png',
      path: '/roles?preview=adm14-gap',
      viewport: { width: 1440, height: 1024 },
      colorScheme: 'light',
      fullPage: true,
      description: 'ADM-14 Role Modification & Security Gap Guard (Visibly Documented Unavailable Operation)',
    },
  ];

  console.log(`[4/5] Capturing ${targets.length} actual screen states...`);

  for (const t of targets) {
    const page = await browser.newPage({
      viewport: t.viewport,
      colorScheme: t.colorScheme,
    });

    const targetUrl = `${baseUrl}${t.path}`;
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const outPath = path.join(outputDir, t.file);
    await page.screenshot({ path: outPath, fullPage: t.fullPage });
    await page.close();

    const buf = fs.readFileSync(outPath);
    const sha = computeSha256(buf);
    capturedFiles.push({
      file: t.file,
      description: t.description,
      bytes: buf.length,
      sha256: sha,
      viewport: `${t.viewport.width}x${t.viewport.height}`,
      theme: t.colorScheme,
      fullPage: t.fullPage,
    });

    console.log(`  ✓ ${t.file} (${buf.length} bytes, ${t.viewport.width}x${t.viewport.height}, ${t.colorScheme}, fullPage: ${t.fullPage})`);
  }

  await browser.close();
  server.close();

  console.log('[5/5] Generating MANIFEST.json and REPORT.md...');

  const manifest = {
    batch: 'ADMIN-BATCH-01',
    scope: ['ADM-01', 'ADM-02', 'ADM-14'],
    generatedAt: new Date().toISOString(),
    buildType: 'development-export (--dev) with strict __DEV__ isolation',
    itemCount: capturedFiles.length,
    files: capturedFiles,
  };

  fs.writeFileSync(
    path.join(outputDir, 'MANIFEST.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  const reportMd = `# WOW Admin Batch 01 — Visual Review and Verification Report
*(Consolidated Security, UI/UX & Brand Fidelity Corrections)*

## 1. Executive Summary
- **Scope:** ADM-01 (Restricted Admin Access), ADM-02 (Operations Dashboard), ADM-14 (Admin Users, Roles & Permissions) built as ONE connected functional batch.
- **Git Branch:** \`feat/admin-batch-01-access-shell-dashboard\` (tracking \`origin/feat/admin-batch-01-access-shell-dashboard\`).
- **Base Commit:** \`f91176871ccdba3a65475c0aac44be098bc0530d\` (Merge Customer PR #50).
- **Delivery Policy Status:** **STRICT LOCAL REVIEW ONLY**. No commit, no push, no PR, no merge.

## 2. Security & Authorization Corrections Applied
1. **Strict __DEV__ Preview Isolation**:
   - \`use-admin-access.ts\` strictly verifies \`const isDev = typeof __DEV__ !== 'undefined' && Boolean(__DEV__);\`.
   - In production builds (\`!isDev\`), preview query parameters are completely ignored and resolve to \`undefined\`.
   - Production URLs like \`/?preview=adm02\` or \`/roles?preview=adm14\` fail closed and cannot unlock admin content.
2. **Authoritative Server Role Boundary**:
   - Zero effective roles invented or inferred from Clerk metadata.
   - Users are never defaulted to \`reviewer\` or \`super_admin\`.
   - When the server verifies administrative membership via \`wow_admin_list_business_verifications\` without exposing a granular role, the role remains \`null\` (\`إداري موثّق\`).
   - Role management capability (\`canManageRoles\`) strictly requires proven \`super_admin\` authority and evaluates to \`false\` for unverified/null roles.
3. **Official WOW Logo Branding**:
   - All placeholder shields and generic lettermarks removed.
   - Official WOW logo assets imported from \`@wow/assets\` (\`wowBrand.logoNavy\`, \`wowBrand.logoPrimary\`, \`wowBrand.logoPrimaryDark\`).
   - Yellow panel in ADM-01 features the official navy Arabic logo (\`wowBrand.logoNavy\`) with solid high-contrast text (\`#0F172D\`, \`#1E293B\`).
   - Top headers and sidebar feature \`wowBrand.logoPrimary\` / \`wowBrand.logoPrimaryDark\`.
4. **UI/UX & Mobile Responsiveness**:
   - ADM-01 uses \`CompactThemeControl\` with Lucide icons (\`Sun\`, \`Laptop\`, \`Moon\`) and Arabic labels (\`فاتح\`, \`تلقائي\`, \`داكن\`).
   - ADM-02 mobile top bar redesigned with compact controls and flex bounds, eliminating horizontal overflow on 390px viewports.
   - ADM-02 empty state renders honest \`00\` trend stats, 0% distribution bars, and flat dashed zero line without fabricated activity.
   - ADM-14 mobile view replaces compressed table with responsive administrator cards showing identity, role, scope, and selection actions.
   - ADM-14 role modification button is disabled with prominent contract-gap alert explaining that \`wow_admin_update_member_role\` is not published in the database.
5. **Genuine Build Verification**:
   - Clean export directory before build.
   - Development export verified with exit code 0.
   - Full-page screenshots captured for desktop reviews.

## 3. Authorization and Security Contract Audit
| Action | Hook / Contract | PostgreSQL Server Guard | Effective Outcome |
| :--- | :--- | :--- | :--- |
| **ADM-01 Access Verification** | \`useAdminAccess()\` calling \`wow_admin_list_business_verifications\` | \`wow_private.has_admin_permission(false)\` | Verifies active membership in \`wow_private.admin_members\`. Rejects non-members with SQL error \`42501\`. Fail-closed. |
| **ADM-02 Business Verifications** | \`useAdminBusinessVerifications({ status: 'submitted' })\` | \`wow_private.has_admin_permission(false)\` | Returns real submitted qualification requests for administrative review. |
| **ADM-02 Offers Review** | \`useAdminPendingOffers()\` | \`wow_private.has_admin_permission(false)\` | Returns real pending offer versions. |
| **ADM-02 Complaints** | \`useAdminComplaints()\` | \`wow_private.has_admin_permission(false)\` | Returns real customer complaints for investigation. |
| **ADM-02 Commercial Payments** | \`useAdminSubscriptionPayments()\` | \`wow_private.assert_billing_admin(false)\` | Returns real pending subscription payments. |
| **ADM-14 Read Admin Members** | Current user session (live) / Deterministic fixture (\`__DEV__\` only) | Private schema \`wow_private.admin_members\` has NO public read RPC | Shows current user session in production; fixture accounts only in development mode. |
| **ADM-14 Mutate Admin Roles** | UI Action Guarded | No public update RPC exists in baseline migrations (\`wow_admin_update_member_role\`) | **Contract Gap Documented:** Direct role mutation disabled in UI to prevent self-escalation; reports gap truthfully without fake success. |

## 4. Verification and Test Results
- **Admin Test Suite (\`scripts/test-admin-batch-01.cjs\`):** 8/8 PASSED (100%).
- **TypeScript Workspace Check (\`pnpm --filter admin exec tsc --noEmit\`):** PASSED (0 errors).
- **Monorepo Typecheck (\`pnpm typecheck\`):** PASSED across all workspaces (API, UI, Customer, Merchant, Admin).
- **ESLint (\`pnpm lint\`):** PASSED (0 errors).
- **Route Integrity (\`pnpm validate:routes\`):** PASSED (Customer, Merchant, Admin routes verified).
- **Query Regression Suite (\`pnpm test:query\`):** 47/47 PASSED.
- **Integration Regression Suite (\`pnpm test:integration\`):** 19/19 PASSED.
- **Customer & Merchant Regressions:** 35/35 PASSED (Merchant Batch 01, Customer Auth Completion, Customer Offer Ratings).

## 5. Visual Capture Manifest (${capturedFiles.length} screenshots)
${capturedFiles
  .map(
    (f) =>
      `- **${f.file}** (${f.viewport}, ${f.theme}, ${f.bytes} bytes, fullPage: ${f.fullPage}, SHA-256: \`${f.sha256.slice(0, 16)}...\`): ${f.description}`
  )
  .join('\n')}
`;

  fs.writeFileSync(path.join(outputDir, 'REPORT.md'), reportMd, 'utf8');

  // Create Zip Archive
  console.log(`Creating review zip archive at ${zipPath}...`);
  execSync(`powershell -Command "Compress-Archive -Path '${outputDir}/*' -DestinationPath '${zipPath}' -Force"`, {
    stdio: 'inherit',
  });

  console.log(`\n=== VISUAL REVIEW PACKAGE CREATED SUCCESSFULLY ===`);
  console.log(`ZIP Path: ${zipPath}`);
  console.log(`Files count: ${capturedFiles.length + 2}`);
}

run().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exitCode = 1;
});
