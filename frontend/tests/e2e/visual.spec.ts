import { test, expect, type Page } from '@playwright/test';
import { seedGame, type SeedResult } from './seed';

let seed: SeedResult;

test.beforeAll(async () => {
  seed = await seedGame();
});

async function setAuth(page: Page) {
  await page.context().addCookies([
    { name: 'auth_token', value: seed.accessToken, url: 'http://localhost:3000' },
    { name: 'auth_refresh', value: seed.refreshToken, url: 'http://localhost:3000' },
  ]);
}

// Espera fontes (Press Start 2P / VT323 / Share Tech Mono) e rede estabilizarem
// antes do screenshot — senão o texto pisca entre fallback e a fonte real e o
// diff de fonte-pixel acusa deslocamento sub-pixel.
async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    const d: any = document;
    if (d.fonts?.ready) await d.fonts.ready;
    // força um reflow depois que as fontes carregam
    void document.body.offsetHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }).catch(() => {});
  await page.waitForTimeout(600);
}

async function shot(page: Page, name: string) {
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

test('index (público)', async ({ page }) => {
  await page.goto('/');
  await shot(page, 'index');
});

test('login (público)', async ({ page }) => {
  await page.goto('/login');
  await shot(page, 'login');
});

test('dashboard', async ({ page }) => {
  await setAuth(page);
  await page.goto('/dashboard');
  await shot(page, 'dashboard');
});

test('archives', async ({ page }) => {
  await setAuth(page);
  await page.goto('/archives');
  await shot(page, 'archives');
});

test('villains', async ({ page }) => {
  await setAuth(page);
  await page.goto('/villains');
  await shot(page, 'villains');
});

test('briefing', async ({ page }) => {
  await setAuth(page);
  await page.goto(`/cases/${seed.caseId}/briefing`);
  await shot(page, 'briefing');
});

test('city', async ({ page }) => {
  await setAuth(page);
  await page.goto(`/cases/${seed.caseId}/city`);
  await shot(page, 'city');
});

test('map (tem @apply em <style scoped>)', async ({ page }) => {
  await setAuth(page);
  await page.goto(`/cases/${seed.caseId}/map`);
  await shot(page, 'map');
});

test('dossier', async ({ page }) => {
  await setAuth(page);
  await page.goto(`/cases/${seed.caseId}/dossier`);
  await shot(page, 'dossier');
});

test('debriefing', async ({ page }) => {
  await setAuth(page);
  await page.goto(`/cases/${seed.caseId}/debriefing?status=SOLVED`);
  await shot(page, 'debriefing');
});
