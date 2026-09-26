// Responsive UI end-to-end suite (Playwright + node:test).
//
// Run with: node --test tests/e2e/responsive.e2e.mjs
// (kept out of node's default test globs on purpose: this file must NOT run
// as part of plain `node --test`, only when named explicitly).
//
// Requires the Docker app running: `docker compose -f asistencia/docker-compose.yml up -d --build app`
// against http://localhost:8090. If the app is unreachable, every test is
// skipped (not failed) with a clear message.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const BASE = process.env.APP_BASE_URL || 'http://localhost:8090';
const COMPOSE_FILE = 'asistencia/docker-compose.yml';
const SESSION_ID = 'e2e01';

const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

// Fake PHP session so the admin area can be reached without going through
// the real login flow. Matches the header.php/footer.php session shape:
// nombre, tipousuario, idusuario, imagen, login, departamento, codigo_persona.
const SESSION_PAYLOAD =
  'nombre|s:13:"Administrador";tipousuario|s:13:"Administrador";idusuario|s:1:"1";imagen|s:0:"";login|s:5:"admin";departamento|s:1:"1";codigo_persona|s:4:"0001";';

function createFakeSessionCmd() {
  const script =
    'd=$(php -r "echo session_save_path() ?: sys_get_temp_dir();"); ' +
    `printf "%s" "${SESSION_PAYLOAD.replace(/"/g, '\\"')}" > "$d/sess_${SESSION_ID}" && ` +
    `chown www-data "$d/sess_${SESSION_ID}"`;
  return script;
}

function deleteFakeSessionCmd() {
  return `d=$(php -r "echo session_save_path() ?: sys_get_temp_dir();"); rm -f "$d/sess_${SESSION_ID}"`;
}

function dockerExec(shellScript) {
  return execFileSync(
    'docker',
    ['compose', '-f', COMPOSE_FILE, 'exec', '-T', 'app', 'sh', '-c', shellScript],
    { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

let appReachable = false;
let unreachableReason = '';
try {
  const res = await fetch(`${BASE}/admin/vistas/login.html`, {
    signal: AbortSignal.timeout(3000),
  });
  appReachable = res.ok;
  if (!appReachable) unreachableReason = `login.html responded with HTTP ${res.status}`;
} catch (err) {
  unreachableReason = `could not reach ${BASE} (${err.message})`;
}

const skip = appReachable
  ? false
  : `app not reachable: ${unreachableReason}. Start it with: docker compose -f ${COMPOSE_FILE} up -d --build app`;

let browser;

before(async () => {
  if (!appReachable) return;
  browser = await chromium.launch();
  try {
    dockerExec(createFakeSessionCmd());
  } catch (err) {
    // Surface the failure through the tests themselves rather than aborting
    // the whole suite silently.
    appReachable = false;
    unreachableReason = `could not create the fake session: ${err.message}`;
  }
});

after(async () => {
  if (browser) await browser.close();
  try {
    dockerExec(deleteFakeSessionCmd());
  } catch {
    // best-effort cleanup
  }
});

async function newPage(viewport, { withSession = true } = {}) {
  const ctx = await browser.newContext({ viewport });
  if (withSession) {
    await ctx.addCookies([
      { name: 'PHPSESSID', value: SESSION_ID, domain: 'localhost', path: '/' },
    ]);
  }
  const page = await ctx.newPage();
  return { ctx, page };
}

async function closeCtx(ctx) {
  await ctx.close();
}

async function stylesheetOrder(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.getAttribute('href')),
  );
}

async function viewportMetaContent(page) {
  return page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    return meta ? meta.getAttribute('content') : null;
  });
}

async function scrollWidth(page) {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

async function innerWidth(page) {
  return page.evaluate(() => window.innerWidth);
}

// ---------------------------------------------------------------------------
// T1 — Foundations: viewport zoom, responsive.css load order, no horizontal
// overflow, input/touch sizing.
// ---------------------------------------------------------------------------

const T1_PAGES = [
  { label: 'admin shell (escritorio.php)', url: `${BASE}/admin/vistas/escritorio.php`, withSession: true },
  { label: 'public shell / kiosk (vistas/asistencia.php)', url: `${BASE}/vistas/asistencia.php`, withSession: false },
  { label: 'login (login.html)', url: `${BASE}/admin/vistas/login.html`, withSession: false },
];

for (const { label, url, withSession } of T1_PAGES) {
  test(`T1 viewport meta allows pinch zoom on ${label}`, { skip }, async () => {
    const { ctx, page } = await newPage(VIEWPORTS.phone, { withSession });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const content = await viewportMetaContent(page);
      assert.ok(content, 'expected a viewport meta tag');
      assert.doesNotMatch(content, /maximum-scale\s*=\s*1/);
      assert.doesNotMatch(content, /user-scalable\s*=\s*no/);
    } finally {
      await closeCtx(ctx);
    }
  });

  test(`T1 responsive.css loads after actualizacion.css on ${label}`, { skip }, async () => {
    const { ctx, page } = await newPage(VIEWPORTS.phone, { withSession });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const hrefs = await stylesheetOrder(page);
      const actualizacionIdx = hrefs.findIndex((h) => h && h.includes('actualizacion.css'));
      const responsiveIdx = hrefs.findIndex((h) => h && h.includes('responsive.css'));
      assert.notEqual(actualizacionIdx, -1, `actualizacion.css not linked on ${label}`);
      assert.notEqual(responsiveIdx, -1, `responsive.css not linked on ${label}`);
      assert.ok(
        responsiveIdx > actualizacionIdx,
        `expected responsive.css (${responsiveIdx}) after actualizacion.css (${actualizacionIdx})`,
      );
    } finally {
      await closeCtx(ctx);
    }
  });
}

const T1_OVERFLOW_PAGES = [
  { label: 'escritorio.php', url: `${BASE}/admin/vistas/escritorio.php` },
  { label: 'rptasistencia.php', url: `${BASE}/admin/vistas/rptasistencia.php` },
];

for (const { label, url } of T1_OVERFLOW_PAGES) {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test(`T1 no horizontal overflow on ${label} at ${vpName} (${vp.width}x${vp.height})`, { skip }, async () => {
      const { ctx, page } = await newPage(vp);
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const sw = await scrollWidth(page);
        const iw = await innerWidth(page);
        assert.ok(sw <= iw, `scrollWidth ${sw} > innerWidth ${iw} on ${label} at ${vpName}`);
      } finally {
        await closeCtx(ctx);
      }
    });
  }
}

test('T1 text inputs compute at least 16px font-size at 390 (login)', { skip }, async () => {
  const { ctx, page } = await newPage(VIEWPORTS.phone, { withSession: false });
  try {
    await page.goto(`${BASE}/admin/vistas/login.html`, { waitUntil: 'domcontentloaded' });
    for (const selector of ['#logina', '#clavea']) {
      const fontSize = await page.locator(selector).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      assert.ok(fontSize >= 16, `${selector} font-size ${fontSize}px < 16px`);
    }
  } finally {
    await closeCtx(ctx);
  }
});

test('T1 primary touch targets are at least 44px tall on phones (sidebar toggle)', { skip }, async () => {
  const { ctx, page } = await newPage(VIEWPORTS.phone);
  try {
    await page.goto(`${BASE}/admin/vistas/escritorio.php`, { waitUntil: 'domcontentloaded' });
    const box = await page.locator('a.sidebar-toggle').boundingBox();
    assert.ok(box, 'sidebar toggle not found');
    assert.ok(box.height >= 44, `sidebar toggle height ${box.height}px < 44px`);
  } finally {
    await closeCtx(ctx);
  }
});
