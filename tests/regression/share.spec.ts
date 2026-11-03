import { test, expect } from '../../src/fixtures/test';
import { SharePage } from '../../src/pages/share.page';
import { WEEKDAY, lastWeekday } from '../../src/helpers/dates';
import { newGuestContext } from '../../src/helpers/guest';

test.use({ frozenAt: lastWeekday(WEEKDAY.Wed) });

test.describe('Share my progress', () => {
  test('a link shows progress but never private text, and can be turned off', { tag: ['@regression'] }, async ({ signedIn, shell, today, settings, browser, baseURL }) => {
    const secret = `PRIVATE-${Date.now()}`;
    await today.loadExample();
    await today.tickDo('Drink enough water');
    await today.setOneLine(`${secret}-oneliner`);
    await today.setJournalWin(`${secret}-win`);

    await shell.openSettings();
    const url = await settings.createShareLink();
    expect(url).toMatch(/\/share\/[A-Za-z0-9_-]{20,}$/);

    // A visitor who is not signed in.
    const guest = await newGuestContext(browser, baseURL);
    const guestPage = await guest.newPage();
    const share = new SharePage(guestPage);
    try {
      await share.open(url);
      await expect(share.title).toContainText(`${signedIn.firstName}'s progress`);
      await expect(guestPage.getByText('Drink enough water').first()).toBeVisible(); // habit names are shared
      await expect(guestPage.locator('body')).not.toContainText(secret); // notes and journal are not
      await expect(guestPage.locator('body')).not.toContainText(signedIn.email);

      // Turning sharing off kills the link.
      await settings.revokeShareLink();
      await guestPage.reload();
      await expect(share.missing).toBeVisible();
    } finally {
      await guest.close();
    }
  });

  test('creating a new link invalidates the old one', { tag: ['@regression'] }, async ({ signedIn, shell, settings, browser, baseURL }) => {
    await shell.openSettings();
    const oldUrl = await settings.createShareLink();
    const newUrl = await settings.regenerateShareLink();
    expect(newUrl).not.toBe(oldUrl);

    const guest = await newGuestContext(browser, baseURL);
    try {
      const share = new SharePage(await guest.newPage());
      await share.open(newUrl);
      await expect(share.title).toBeVisible(); // the new link works…
      await share.open(oldUrl);
      await expect(share.missing).toBeVisible(); // …and the old one is really gone
    } finally {
      await guest.close();
    }
  });

  test('a link created before anything is logged still opens (empty board)', { tag: ['@regression'] }, async ({ signedIn, shell, settings, browser, baseURL }) => {
    await shell.openSettings();
    const url = await settings.createShareLink(); // brand-new account: nothing has been saved yet

    const guest = await newGuestContext(browser, baseURL);
    try {
      const share = new SharePage(await guest.newPage());
      await share.open(url);
      await expect(share.title).toContainText(`${signedIn.firstName}'s progress`);
    } finally {
      await guest.close();
    }
  });

  test('an unknown link shows the not-available page', { tag: ['@regression'] }, async ({ page }) => {
    const share = new SharePage(page);
    await share.open('/share/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    await expect(share.missing).toBeVisible();
  });
});
