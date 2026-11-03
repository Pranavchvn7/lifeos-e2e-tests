import { test, expect } from '@playwright/test';
import { apiHeaders } from '../../src/helpers/api';
import { newUser } from '../../src/helpers/user-factory';

/**
 * Manual check, never part of the nightly run (tag @ratelimit): it deliberately trips the sign-in limit, which also
 * blocks this machine's IP address for a few seconds. Start it from Actions → "E2E tests" → Run workflow →
 * suite = ratelimit, and set expect_rate_limit to "on" for production or "off" for the staging preview.
 */
test('sign-in attempts are limited (or not) exactly as this environment is configured', { tag: ['@ratelimit'] }, async ({ request }) => {
  const expectLimit = (process.env.EXPECT_RATE_LIMIT ?? 'on') !== 'off';
  const statuses: number[] = [];

  for (let attempt = 0; attempt < 15; attempt += 1) {
    // Wrong password for an email that does not exist: nothing is created and nobody's account is touched.
    const response = await request.post('/api/auth/sign-in/email', {
      data: { email: newUser('limit').email, password: 'wrong-Pw-1A!' },
      headers: apiHeaders(),
    });
    statuses.push(response.status());
  }
  test.info().annotations.push({ type: 'statuses', description: statuses.join(' ') });

  if (expectLimit) {
    expect(statuses, `15 quick wrong sign-ins should hit the limit (429). Got: ${statuses.join(' ')}`).toContain(429);
  } else {
    expect(statuses, `the limit should be switched off here. Got: ${statuses.join(' ')}`).not.toContain(429);
  }
});
