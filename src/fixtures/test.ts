import { test as base, expect, type Page } from '@playwright/test';
import { newUser, type TestUser } from '../helpers/user-factory';
import { allowVercelBypass } from '../helpers/vercel-bypass';
import { AppShell } from '../pages/app-shell.page';
import { BoardPage } from '../pages/board.page';
import { LoginPage } from '../pages/login.page';
import { SettingsPage } from '../pages/settings.page';
import { TodayPage } from '../pages/today.page';
import { TodoPage } from '../pages/todo.page';

type Fixtures = {
  /** A unique, not-yet-created user. The account is deleted again after the test. */
  user: TestUser;
  /** The same user, but already signed up and looking at the app. */
  signedIn: TestUser;
  login: LoginPage;
  shell: AppShell;
  today: TodayPage;
  todo: TodoPage;
  board: BoardPage;
  settings: SettingsPage;
};

type Options = {
  /** Pin the browser clock to this moment before the test starts (see helpers/dates.ts). */
  frozenAt: Date | undefined;
};

/** Delete the throw-away account so the database does not fill up with test users. Never fails the test. */
export async function cleanup(page: Page, user: TestUser): Promise<void> {
  if (!user.created || process.env.E2E_KEEP_DATA === 'true') return;
  try {
    const login = new LoginPage(page);
    const shell = new AppShell(page);
    await page.goto('/');
    await shell.greeting.or(login.submit).first().waitFor({ timeout: 20_000 });
    if (await login.submit.isVisible()) {
      await login.signInAndEnter(user.email, user.password, shell);
    }
    await shell.expectReady();
    await shell.openSettings();
    await new SettingsPage(page).deleteAccount();
  } catch (error) {
    console.warn(`[cleanup] could not delete ${user.email}: ${(error as Error).message.split('\n')[0]}`);
  }
}

export const test = base.extend<Fixtures & Options>({
  frozenAt: [undefined, { option: true }],

  // Every browser context may need the Vercel preview-protection header (only when VERCEL_BYPASS_SECRET is set).
  context: async ({ context, baseURL }, use) => {
    await allowVercelBypass(context, baseURL);
    await use(context);
  },

  user: [
    async ({ page }, use) => {
      const user = newUser();
      await use(user);
      await cleanup(page, user);
    },
    { timeout: 90_000 },
  ],

  signedIn: async ({ page, user, login, shell, frozenAt }, use) => {
    if (frozenAt) await page.clock.setFixedTime(frozenAt);
    await login.goto();
    await login.signUpAndEnter(user, shell);
    await use(user);
  },

  login: async ({ page }, use) => use(new LoginPage(page)),
  shell: async ({ page }, use) => use(new AppShell(page)),
  today: async ({ page }, use) => use(new TodayPage(page)),
  todo: async ({ page }, use) => use(new TodoPage(page)),
  board: async ({ page }, use) => use(new BoardPage(page)),
  settings: async ({ page }, use) => use(new SettingsPage(page)),
});

export { expect };
