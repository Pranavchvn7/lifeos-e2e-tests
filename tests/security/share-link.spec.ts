import { test, expect } from '../../src/fixtures/test';
import { BAD_SHARE_TOKENS, LEAK_PATTERNS, XSS_NAME } from '../../src/data/security-cases';
import { WEEKDAY, lastWeekday } from '../../src/helpers/dates';
import { newGuestContext } from '../../src/helpers/guest';
import { SharePage } from '../../src/pages/share.page';

const TAGS = ['@regression', '@security'];

test.describe('Share link security', () => {
  test.describe('with a frozen weekday', () => {
    test.use({ frozenAt: lastWeekday(WEEKDAY.Wed) });

    test('private text never leaves the server — not even hidden in the data the page downloads', { tag: TAGS }, async ({ signedIn, shell, today, settings, browser, baseURL }) => {
      const secret = `PRIVATE-${Date.now()}`;
      await today.loadExample();
      await today.tickDo('Drink enough water');
      await today.setOneLine(`${secret}-oneliner`);
      await today.setJournalWin(`${secret}-win`);
      await today.quickAddTask(`${secret}-task`);
      await shell.openSettings();
      const url = await settings.createShareLink();

      const guest = await newGuestContext(browser, baseURL);
      try {
        const page = await guest.newPage();
        // The earlier share test checks what is on screen. This one checks what the server SENDS, because text can be
        // present in a response and merely not displayed.
        const pending: Promise<string>[] = [];
        page.on('response', (response) => {
          if (['fetch', 'xhr'].includes(response.request().resourceType())) pending.push(response.text().catch(() => ''));
        });
        await new SharePage(page).open(url);
        await expect(page.getByText('Drink enough water').first()).toBeVisible();

        const bodies = await Promise.all(pending);
        expect(bodies.some((body) => body.includes('Drink enough water')), 'the shared data should have been captured').toBe(true);
        for (const body of bodies) {
          expect(body).not.toContain(secret);
          expect(body).not.toContain(signedIn.email);
        }
      } finally {
        await guest.close();
      }
    });
  });

  test('a name containing HTML is shown as plain text and never runs', { tag: TAGS }, async ({ signedIn, shell, settings, browser, baseURL }) => {
    await shell.openSettings();
    await settings.setShareName(XSS_NAME);
    const url = await settings.createShareLink();

    const guest = await newGuestContext(browser, baseURL);
    try {
      const page = await guest.newPage();
      const share = new SharePage(page);
      await share.open(url);

      await expect(share.title).toContainText(XSS_NAME); // the characters are visible as text…
      await expect(page.locator('img[src="x"]')).toHaveCount(0); // …and no image element was created from them
      expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    } finally {
      await guest.close();
    }
  });

  test('the shared page asks search engines to ignore it', { tag: TAGS }, async ({ signedIn, shell, settings, browser, baseURL }) => {
    await shell.openSettings();
    const url = await settings.createShareLink();

    const guest = await newGuestContext(browser, baseURL);
    try {
      const page = await guest.newPage();
      await new SharePage(page).open(url);
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
    } finally {
      await guest.close();
    }
  });

  for (const { title, token } of BAD_SHARE_TOKENS) {
    test(`${title} shows the "not available" page`, { tag: TAGS }, async ({ page }) => {
      const response = await page.goto(`/share/${encodeURIComponent(token)}`);
      const status = response?.status() ?? 0;
      expect(status, 'the server must not crash on this address').toBeLessThan(500);
      if (status >= 400) {
        // The web server itself refused the address (for example a 404 for an encoded "../"): a clean answer.
        expect(await page.content()).not.toMatch(LEAK_PATTERNS);
        return;
      }
      // Otherwise the app must say plainly that the link is not available — not hang and not show an error page.
      await expect(page.getByTestId('share-missing'), `the page said: ${(await page.locator('body').innerText()).slice(0, 150)}`).toBeVisible({ timeout: 30_000 });
    });
  }
});
