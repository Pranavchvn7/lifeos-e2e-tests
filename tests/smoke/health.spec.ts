import { test, expect } from '@playwright/test';
import { bypassHeaders } from '../../src/helpers/vercel-bypass';

test('the deployment is healthy: database connected and auth tables ready', { tag: ['@smoke'] }, async ({ request }) => {
  const response = await request.get('/api/auth/diagnostics', { headers: bypassHeaders() });
  expect(response.ok()).toBeTruthy();

  const report = await response.json();
  expect(report.database).toBe('connected');
  expect(report.authTablesComplete).toBe(true);
  expect(report.BETTER_AUTH_SECRET).toBe(true);
});
