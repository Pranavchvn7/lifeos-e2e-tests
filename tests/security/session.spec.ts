import { test, expect } from '../../src/fixtures/test';
import { apiHeaders, siteUrl } from '../../src/helpers/api';

const SESSION_COOKIE = '__Host-grok-auth.session_token';

test.describe('Session security', () => {
  test('the session cookie is locked down, and logging out kills it on the server too', { tag: ['@regression', '@security'] }, async ({ signedIn, shell, page, context, playwright }) => {
    const cookie = (await context.cookies()).find((c) => c.name === SESSION_COOKIE);
    expect(cookie, 'the app should set a session cookie after sign-up').toBeDefined();
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
    // HttpOnly means page scripts (including any injected by an attacker) cannot read it.
    expect(await page.evaluate(() => document.cookie)).not.toContain('session_token');

    await shell.logout();
    await expect.poll(async () => (await context.cookies()).some((c) => c.name === SESSION_COOKIE)).toBe(false);

    // A copied session token must stop working once its owner logs out.
    const thief = await playwright.request.newContext({
      baseURL: siteUrl(),
      extraHTTPHeaders: { ...apiHeaders(), Cookie: `${SESSION_COOKIE}=${cookie!.value}` },
    });
    try {
      expect(await (await thief.get('/api/auth/get-session')).json()).toBeNull();
    } finally {
      await thief.dispose();
    }
  });
});
