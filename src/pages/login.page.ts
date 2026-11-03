import { expect } from '@playwright/test';
import type { TestUser } from '../helpers/user-factory';
import type { AppShell } from './app-shell.page';
import { BasePage } from './base.page';

/**
 * Servers limit how many sign-up / sign-in requests one IP address may send (Better Auth: about 3 per 10 seconds).
 * A CI machine creating many test accounts can hit that limit, so a rejected attempt is retried after a pause.
 */
const RATE_LIMITED = /too many|\(429\)|rate limit/i;
const RATE_LIMIT_PAUSE_MS = 11_000;
const MAX_ATTEMPTS = 3;

export class LoginPage extends BasePage {
  readonly submit = this.byId('auth-submit');
  readonly error = this.byId('auth-error');

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.submit).toBeVisible();
  }

  async signUp(user: TestUser): Promise<void> {
    await this.byId('auth-tab-up').click();
    await this.byId('auth-name').fill(user.name);
    await this.byId('auth-email').fill(user.email);
    await this.byId('auth-password').fill(user.password);
    await this.submit.click();
    user.created = true;
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.byId('auth-tab-in').click();
    await this.byId('auth-email').fill(email);
    await this.byId('auth-password').fill(password);
    await this.submit.click();
  }

  /** Sign up, then wait until the app opens. Fails with the app's own error text if sign-up is rejected. */
  async signUpAndEnter(user: TestUser, shell: AppShell): Promise<void> {
    await this.attempt(shell, 'Sign-up', () => this.signUp(user));
  }

  /** Sign in, then wait until the app opens. Fails with the app's own error text if sign-in is rejected. */
  async signInAndEnter(email: string, password: string, shell: AppShell): Promise<void> {
    await this.attempt(shell, 'Sign-in', () => this.signIn(email, password));
  }

  private async attempt(shell: AppShell, what: string, submit: () => Promise<void>): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      await submit();
      await expect(shell.greeting.or(this.error)).toBeVisible({ timeout: 30_000 });
      if (await shell.greeting.isVisible()) return;

      const message = (await this.error.innerText()).trim();
      if (attempt < MAX_ATTEMPTS && RATE_LIMITED.test(message)) {
        await this.page.waitForTimeout(RATE_LIMIT_PAUSE_MS); // the only fixed pause in the framework: a rate-limit back-off
        continue;
      }
      throw new Error(`${what} was rejected by the app: "${message}"`);
    }
  }

  async expectError(message?: RegExp | string): Promise<void> {
    await expect(this.error).toBeVisible();
    if (message) await expect(this.error).toContainText(message);
  }
}
