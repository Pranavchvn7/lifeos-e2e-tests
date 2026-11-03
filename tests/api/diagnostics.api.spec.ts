import { test, expect } from '@playwright/test';
import { apiHeaders } from '../../src/helpers/api';

test('the diagnostics page reports yes/no flags only, never secret values', { tag: ['@regression', '@api'] }, async ({ request }) => {
  const response = await request.get('/api/auth/diagnostics', { headers: apiHeaders() });
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['cache-control']).toContain('no-store'); // a health check must never be served from a cache

  const text = await response.text();
  const report = JSON.parse(text) as Record<string, unknown>;
  for (const key of ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'onVercel']) {
    expect(typeof report[key], `${key} should be a plain true/false`).toBe('boolean');
  }
  expect(text).not.toMatch(/postgres(ql)?:\/\//i); // no connection string
  expect(text).not.toMatch(/neon\.tech/i); // no database host name
});
