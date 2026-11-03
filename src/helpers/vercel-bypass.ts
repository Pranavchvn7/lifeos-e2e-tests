import type { BrowserContext } from '@playwright/test';

/**
 * Vercel preview deployments can be password-protected ("Deployment Protection"). Vercel offers a
 * "Protection Bypass for Automation" secret for exactly this case. If VERCEL_BYPASS_SECRET is set, it is sent
 * as a header — but only to the site under test, never to third-party sites (fonts, analytics…).
 */
export async function allowVercelBypass(context: BrowserContext, baseURL: string | undefined): Promise<void> {
  const secret = process.env.VERCEL_BYPASS_SECRET;
  if (!secret || !baseURL) return;
  const origin = new URL(baseURL).origin;
  await context.route(
    (url) => url.origin === origin,
    (route) => route.continue({ headers: { ...route.request().headers(), 'x-vercel-protection-bypass': secret } }),
  );
}

/** Same secret as a plain header object, for API-style requests (`request.get(..., { headers })`). */
export function bypassHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_BYPASS_SECRET;
  return secret ? { 'x-vercel-protection-bypass': secret } : {};
}
