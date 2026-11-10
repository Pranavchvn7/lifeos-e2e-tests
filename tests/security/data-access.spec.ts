import { test, expect } from '../../src/fixtures/test';
import { apiHeaders, siteUrl } from '../../src/helpers/api';
import { persistText } from '../../src/helpers/persist';

test.describe('Who can read the saved data', () => {
  test('the data request works for its owner, and fails without a session or from another site', { tag: ['@regression', '@security'] }, async ({ signedIn, shell, today, page, playwright }) => {
    const marker = `PRIVATE-${Date.now()}`;
    await today.loadExample();
    await persistText(page, marker, () => page.getByTestId('one-line-input').fill(marker)); // saved before we reload

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
    const owner = await Promise.all(
      [...dataRequests].map(async (url) => {
        const response = await page.request.get(url);
        return { path: new URL(url).pathname.slice(0, 40), status: response.status(), body: await response.text() };
      }),
    );
    const summary = owner.map((o) => `${o.path} -> HTTP ${o.status}, ${o.body.length} chars: ${o.body.slice(0, 120)}`).join(' || ');
    expect(owner.some((o) => o.body.includes(marker)), `the owner should get their own data. Requests seen: ${summary}`).toBe(true);

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
