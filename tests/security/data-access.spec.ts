import { test, expect } from '../../src/fixtures/test';
import { apiHeaders, siteUrl } from '../../src/helpers/api';

test.describe('Who can read the saved data', () => {
  test('the data request works for its owner, and fails without a session or from another site', { tag: ['@regression', '@security'] }, async ({ signedIn, shell, today, page, playwright }) => {
    const marker = `PRIVATE-${Date.now()}`;
    await today.loadExample();
    await today.setOneLine(marker);

    // Record the app's own data requests while it reloads (GET requests to this site, other than the sign-in service).
    const origin = new URL(siteUrl()).origin;
    const dataRequests = new Set<string>();
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin === origin && request.method() === 'GET' && ['fetch', 'xhr'].includes(request.resourceType()) && !url.pathname.startsWith('/api/auth/')) {
        dataRequests.add(request.url());
      }
    });
    await page.reload();
    await shell.expectReady();
    expect(dataRequests.size, 'the app should load its data with a GET request').toBeGreaterThan(0);

    // 1. Sanity check — with the owner's cookie the same request does return the private text,
    //    otherwise the two checks below would pass for the wrong reason.
    const ownerBodies = await Promise.all([...dataRequests].map(async (url) => (await page.request.get(url)).text()));
    expect(ownerBodies.some((body) => body.includes(marker)), 'the owner should get their own data').toBe(true);

    // 2. No session cookie: the server must refuse and must not include the text.
    const stranger = await playwright.request.newContext({ extraHTTPHeaders: apiHeaders() });
    try {
      for (const url of dataRequests) {
        const response = await stranger.get(url);
        expect(response.ok(), `${new URL(url).pathname} must not answer a signed-out caller`).toBe(false);
        expect(await response.text()).not.toContain(marker);
      }
    } finally {
      await stranger.dispose();
    }

    // 3. Owner's cookie, but the request claims to come from another website (what a malicious page would send).
    for (const url of dataRequests) {
      const response = await page.request.get(url, { headers: { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors' } });
      expect(response.ok(), `${new URL(url).pathname} must refuse requests from other sites`).toBe(false);
      expect(await response.text()).not.toContain(marker);
    }
  });
});
