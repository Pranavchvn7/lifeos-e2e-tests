import { test, expect } from '../../src/fixtures/test';
import { WEEKDAY, lastWeekday } from '../../src/helpers/dates';

test.describe('Settings and account', () => {
  test.describe('with a pinned weekday', () => {
    test.use({ frozenAt: lastWeekday(WEEKDAY.Wed) });

    test('adding and removing a habit', { tag: ['@regression'] }, async ({ signedIn, shell, settings, today }) => {
      await shell.openSettings();
      await settings.addHabit('do', 'Meditate for ten minutes');
      await settings.close();
      await expect(today.doItem('Meditate for ten minutes')).toBeVisible();

      await shell.openSettings();
      await settings.removeHabit('do', 'Meditate for ten minutes');
      await settings.close();
      await expect(today.doItem('Meditate for ten minutes')).toHaveCount(0);
    });

    test('Start over clears everything back to an empty log', { tag: ['@regression'] }, async ({ signedIn, shell, settings, today }) => {
      await today.loadExample();
      await shell.openSettings();
      await settings.startOver();

      await expect(today.welcomePanel).toBeVisible();
      await expect(today.doItems()).toHaveCount(0);
    });
  });

  test('dark mode is remembered after a reload', { tag: ['@regression'] }, async ({ signedIn, shell, page }) => {
    await shell.themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await shell.expectReady();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('deleting the account removes it for good', { tag: ['@regression'] }, async ({ signedIn, login, shell, settings }) => {
    await shell.openSettings();
    await settings.deleteAccount();

    await login.signIn(signedIn.email, signedIn.password);
    await login.expectError(/doesn't match/i);
    signedIn.created = false; // already gone, nothing to clean up
  });

  test.describe('reminders', () => {
    // The test installs its own clock (19:58 UTC on a past Wednesday) and fast-forwards it by three minutes.
    test('the in-app banner appears once the reminder time has passed', { tag: ['@regression'] }, async ({ user, login, shell, settings, today, page, context }) => {
      await context.grantPermissions(['notifications']);
      await page.clock.install({ time: lastWeekday(WEEKDAY.Wed, 19, 58) });

      await login.goto();
      await login.signUpAndEnter(user, shell);
      await today.loadExample(); // reminders only matter when there are habits and nothing is logged

      await shell.openSettings();
      await settings.enableReminder('20:00');
      await settings.close();
      await expect(today.reminderBanner).toBeHidden(); // 19:58 — too early

      await page.clock.fastForward('03:00'); // now 20:01
      await expect(today.reminderBanner).toBeVisible();
    });
  });
});
