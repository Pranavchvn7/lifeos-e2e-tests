import { test, expect } from '../../src/fixtures/test';
import { cleanup } from '../../src/fixtures/test';
import { BUNDLE_SECRET_PATTERNS } from '../../src/data/security-cases';
import { apiHeaders, siteUrl } from '../../src/helpers/api';
import { newGuestContext } from '../../src/helpers/guest';
import { newUser } from '../../src/helpers/user-factory';
import { AppShell } from '../../src/pages/app-shell.page';
import { LoginPage } from '../../src/pages/login.page';
import { TodayPage } from '../../src/pages/today.page';

const TAGS = ['@regression', '@security'];

test.describe('Writes and tenant isolation', () => {
  test('saving data is refused without a session and from another website', { tag: TAGS }, async ({ signedIn, today, page, playwright }) => {
    await today.loadExample();

    // Record the app's own "save" requests (POST calls to this site, other than the sign-in service).
    const origin = new URL(siteUrl()).origin;
    const writes: { url: string; body: string; type: string }[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin === origin && request.method() === 'POST' && ['fetch', 'xhr'].includes(request.resourceType()) && !url.pathname.startsWith('/api/auth/')) {
        writes.push({ url: request.url(), body: request.postData() ?? '', type: request.headers()['content-type'] ?? 'application/json' });
      }
    });
    await today.setOneLine(`WRITE-${Date.now()}`);
    await expect.poll(() => writes.length, { message: 'the app should save with a POST request', timeout: 20_000 }).toBeGreaterThan(0);

    // 1. Replay each save with no session cookie at all.
    const stranger = await playwright.request.newContext({ extraHTTPHeaders: apiHeaders() });
    try {
      for (const write of writes) {
        const response = await stranger.post(write.url, { data: write.body, headers: { 'content-type': write.type } });
        expect(response.ok(), `${new URL(write.url).pathname} must refuse a signed-out caller`).toBe(false);
      }
    } finally {
      await stranger.dispose();
    }

    // 2. Replay with the owner's cookie, but claiming to come from another website (what a malicious page would send).
    for (const write of writes) {
      const response = await page.request.post(write.url, {
        data: write.body,
        headers: { 'content-type': write.type, 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors' },
      });
      expect(response.ok(), `${new URL(write.url).pathname} must refuse requests from other sites`).toBe(false);
    }
  });

  test('two accounts never see each other\'s data', { tag: TAGS }, async ({ signedIn, today, page, browser, baseURL }) => {
    const markerA = `PRIVATE-A-${Date.now()}`;
    const markerB = `PRIVATE-B-${Date.now()}`;
    await today.loadExample();
    await today.setOneLine(markerA);

    // A second, completely separate browser with its own account.
    const other = newUser('other');
    const context = await newGuestContext(browser, baseURL);
    const otherPage = await context.newPage();
    try {
      const downloads: Promise<string>[] = [];
      otherPage.on('response', (response) => {
        if (['fetch', 'xhr'].includes(response.request().resourceType())) downloads.push(response.text().catch(() => ''));
      });
      const otherShell = new AppShell(otherPage);
      await new LoginPage(otherPage).goto();
      await new LoginPage(otherPage).signUpAndEnter(other, otherShell);
      const otherToday = new TodayPage(otherPage);
      await otherToday.loadExample();
      await otherToday.setOneLine(markerB);
      await otherPage.reload();
      await otherShell.expectReady();

      // B sees B's data only — on screen and in everything the server sent.
      await expect(otherPage.getByText(markerA)).toHaveCount(0);
      for (const body of await Promise.all(downloads)) {
        expect(body).not.toContain(markerA);
        expect(body).not.toContain(signedIn.email);
      }

      // …and A still sees A's data only, even after B saved something.
      await page.reload();
      await new AppShell(page).expectReady();
      await expect(page.getByText(markerB)).toHaveCount(0);
    } finally {
      await cleanup(otherPage, other);
      await context.close();
    }
  });

  test('the code sent to the browser contains no secrets and no source maps', { tag: TAGS }, async ({ page, request, login }) => {
    const scripts: { url: string; body: Promise<string> }[] = [];
    page.on('response', (response) => {
      if (response.request().resourceType() === 'script') scripts.push({ url: response.url(), body: response.text().catch(() => '') });
    });
    await login.goto();
    expect(scripts.length, 'the page should load JavaScript').toBeGreaterThan(0);

    const origin = new URL(siteUrl()).origin;
    for (const script of scripts) {
      expect(await script.body, `secret-looking text in ${script.url}`).not.toMatch(BUNDLE_SECRET_PATTERNS);
      if (new URL(script.url).origin !== origin) continue;
      const map = await request.get(`${script.url}.map`, { headers: apiHeaders() });
      if (map.status() < 400) expect(await map.text(), `${script.url}.map is a published source map`).not.toMatch(/"version"\s*:\s*3/);
    }
  });
});
