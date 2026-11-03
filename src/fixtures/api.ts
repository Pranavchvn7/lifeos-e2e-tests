import type { APIRequestContext } from '@playwright/test';
import { apiHeaders, authPost, signUpBody, siteUrl } from '../helpers/api';
import { newGuestContext } from '../helpers/guest';
import { newUser, type TestUser } from '../helpers/user-factory';
import { cleanup, expect, test as base } from './test';

export interface ApiAccount {
  user: TestUser;
  /** An HTTP client that is already signed in as `user` (it keeps the session cookie). */
  request: APIRequestContext;
}

/**
 * Fixtures for tests that talk to the server without a browser.
 *
 * `apiAccount` creates ONE real account per worker (through the sign-up endpoint, not the screen) and shares it
 * across all API tests in that worker, so the suite makes very few sign-ups. When the worker finishes, the account
 * is deleted through the app's own "Delete account" button — the same clean-up the browser tests use.
 */
export const test = base.extend<object, { apiAccount: ApiAccount }>({
  apiAccount: [
    async ({ playwright, browser }, use) => {
      const request = await playwright.request.newContext({ baseURL: siteUrl(), extraHTTPHeaders: apiHeaders() });
      const user = newUser('api');
      const response = await authPost(request, '/api/auth/sign-up/email', signUpBody(user));
      if (!response.ok()) {
        throw new Error(`API sign-up failed: HTTP ${response.status()} ${(await response.text()).slice(0, 200)}`);
      }
      user.created = true;

      await use({ user, request });

      await request.dispose();
      const context = await newGuestContext(browser, siteUrl());
      try {
        await cleanup(await context.newPage(), user);
      } finally {
        await context.close();
      }
    },
    { scope: 'worker', timeout: 180_000 },
  ],
});

export { expect };
