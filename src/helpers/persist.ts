import type { Page } from '@playwright/test';

/**
 * LifeOS autosaves a moment after every change. Wrap the action that changes something and this waits until the
 * save request to the server has finished, so a following page reload is guaranteed to see the saved data.
 */
export async function persist<T>(page: Page, action: () => Promise<T>): Promise<T> {
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && !response.url().includes('/api/auth/') && response.ok(),
    { timeout: 15_000 },
  );
  const result = await action();
  await saved;
  return result;
}
