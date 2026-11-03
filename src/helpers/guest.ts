import type { Browser, BrowserContext } from '@playwright/test';
import { allowVercelBypass } from './vercel-bypass';

/** A second, signed-out browser (for example a friend opening a share link). */
export async function newGuestContext(browser: Browser, baseURL: string | undefined): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL, timezoneId: 'UTC', locale: 'en-US' });
  await allowVercelBypass(context, baseURL);
  return context;
}
