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

/**
 * Like `persist`, but waits for the save request whose body contains `text`. `persist` accepts ANY successful save,
 * so it can return early on an older, still-running save (for example the one started by "Load example") — and a page
 * reload right after would then lose the new text. Use this when a test must reload and expect the text to be there.
 */
export async function persistText<T>(page: Page, text: string, action: () => Promise<T>): Promise<T> {
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      !response.url().includes('/api/auth/') &&
      (response.request().postData() ?? '').includes(text) &&
      response.ok(),
    { timeout: 20_000 },
  );
  const result = await action();
  await saved;
  return result;
}
