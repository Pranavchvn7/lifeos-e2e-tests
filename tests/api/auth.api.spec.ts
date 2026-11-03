import { test, expect } from '../../src/fixtures/api';
import { SIGN_UP_REJECTIONS } from '../../src/data/api-cases';
import { apiHeaders, authPost, signUpBody, siteUrl } from '../../src/helpers/api';
import { newUser } from '../../src/helpers/user-factory';

const TAGS = ['@regression', '@api'];

test.describe('Auth API (no browser)', () => {
  for (const { title, override } of SIGN_UP_REJECTIONS) {
    test(`sign-up refuses ${title}`, { tag: TAGS }, async ({ request }) => {
      const body = { ...signUpBody(newUser('bad')), ...override };
      const response = await authPost(request, '/api/auth/sign-up/email', body);

      expect([400, 422]).toContain(response.status()); // a clear "your request is wrong", not a crash (5xx) or a throttle (429)
      const text = await response.text();
      expect(text).not.toMatch(/node_modules|\.js:\d+|\bat\s+\S+\s+\(/); // no stack trace leaks to the caller
    });
  }

  test('a wrong password and an unknown email get exactly the same answer', { tag: TAGS }, async ({ request, apiAccount }) => {
    const wrongPassword = await authPost(request, '/api/auth/sign-in/email', {
      email: apiAccount.user.email,
      password: 'definitely-wrong-1A!',
    });
    const unknownEmail = await authPost(request, '/api/auth/sign-in/email', {
      email: newUser('ghost').email,
      password: 'definitely-wrong-1A!',
    });

    // If these differed, an attacker could use the sign-in form to find out which emails have an account.
    expect(wrongPassword.status()).toBeGreaterThanOrEqual(400);
    expect(unknownEmail.status()).toBe(wrongPassword.status());
    expect(await unknownEmail.json()).toEqual(await wrongPassword.json());
  });

  test('without a session, get-session says nobody is signed in', { tag: TAGS }, async ({ request }) => {
    const response = await request.get('/api/auth/get-session', { headers: apiHeaders() });
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toBeNull();
  });

  test('signed in, get-session returns the user and never their password', { tag: TAGS }, async ({ apiAccount }) => {
    const response = await apiAccount.request.get('/api/auth/get-session');
    expect(response.ok()).toBeTruthy();

    const text = await response.text();
    expect(JSON.parse(text).user.email).toBe(apiAccount.user.email.toLowerCase());
    expect(text).not.toContain(apiAccount.user.password);
  });

  test('signing out ends the session on the server', { tag: TAGS }, async ({ playwright, apiAccount }) => {
    // A second, separate session for the same account, so the shared one used by other tests stays alive.
    const own = await playwright.request.newContext({ baseURL: siteUrl(), extraHTTPHeaders: apiHeaders() });
    try {
      const signIn = await authPost(own, '/api/auth/sign-in/email', {
        email: apiAccount.user.email,
        password: apiAccount.user.password,
      });
      expect(signIn.ok()).toBeTruthy();
      expect(await (await own.get('/api/auth/get-session')).json()).toMatchObject({
        user: { email: apiAccount.user.email.toLowerCase() },
      });

      const signOut = await own.post('/api/auth/sign-out', { data: {} });
      expect(signOut.ok()).toBeTruthy();
      expect(await (await own.get('/api/auth/get-session')).json()).toBeNull();
    } finally {
      await own.dispose();
    }
  });
});
