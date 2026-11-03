import { test, expect } from '../../src/fixtures/test';

test.describe('Authentication', () => {
  test('a new visitor can create an account and sees the welcome panel', { tag: ['@smoke'] }, async ({ user, login, shell, today }) => {
    await login.goto();
    await login.signUpAndEnter(user, shell);

    await expect(shell.greeting).toContainText(user.firstName);
    await expect(today.welcomePanel).toBeVisible(); // brand-new accounts start empty
  });

  test('a signed-in user can log out and sign back in', { tag: ['@smoke'] }, async ({ signedIn, login, shell }) => {
    await shell.logout();

    await login.signInAndEnter(signedIn.email, signedIn.password, shell);
    await expect(shell.greeting).toContainText(signedIn.firstName);
  });

  test('a wrong password is rejected', { tag: ['@smoke'] }, async ({ signedIn, login, shell, page }) => {
    await shell.logout();

    await login.signIn(signedIn.email, 'definitely-not-the-password');
    await login.expectError(/doesn't match/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('signing up twice with the same email is rejected', { tag: ['@regression'] }, async ({ signedIn, login, shell }) => {
    await shell.logout();

    await login.signUp(signedIn);
    await login.expectError(/already exists/i);
  });

  test('a signed-out visitor is sent to the login page', { tag: ['@regression'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
