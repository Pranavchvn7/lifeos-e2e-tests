import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { TestUser } from './user-factory';
import { bypassHeaders } from './vercel-bypass';

/** Same default as playwright.config.ts. Read lazily so a local .env file has been loaded by then. */
export function siteUrl(): string {
  return (process.env.BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
}

/**
 * Headers for calls made without a browser. A browser always tells the server which site it comes from (`Origin`);
 * the auth server checks it, so API tests send the same value the real app would. The Vercel bypass header is added
 * when a secret is configured.
 */
export function apiHeaders(): Record<string, string> {
  return { Origin: new URL(siteUrl()).origin, ...bypassHeaders() };
}

/** What the sign-up endpoint expects. */
export function signUpBody(user: TestUser): { name: string; email: string; password: string } {
  return { name: user.name, email: user.email, password: user.password };
}

const RATE_LIMIT_PAUSE_MS = 11_000;
const MAX_ATTEMPTS = 3;

/**
 * POST to an auth endpoint. Production limits sign-up / sign-in calls per IP address (about 3 per 10 seconds), so an
 * answer of 429 ("too many requests") is retried after a pause — the same back-off the browser tests use.
 */
export async function authPost(
  request: APIRequestContext,
  path: string,
  data: Record<string, unknown>,
  headers: Record<string, string> = apiHeaders(),
): Promise<APIResponse> {
  for (let attempt = 1; ; attempt += 1) {
    const response = await request.post(path, { data, headers });
    if (response.status() !== 429 || attempt >= MAX_ATTEMPTS) return response;
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_PAUSE_MS));
  }
}
