import { test, expect } from '@playwright/test';
import { ERROR_PROBES, LEAK_PATTERNS, REQUIRED_HEADERS, SENSITIVE_PATHS } from '../../src/data/security-cases';
import { apiHeaders, siteUrl } from '../../src/helpers/api';

const TAGS = ['@regression', '@security'];

test.describe('Nothing sensitive is exposed', () => {
  for (const path of SENSITIVE_PATHS) {
    test(`${path} cannot be downloaded`, { tag: TAGS }, async ({ request }) => {
      const response = await request.get(path, { headers: apiHeaders() });
      if (response.status() >= 400) return; // refused or not found: exactly what we want

      // A 200 is only acceptable when it is the ordinary web page, not the file itself.
      expect(response.headers()['content-type'] ?? '', `${path} answered with a file, not the web page`).toContain('text/html');
      expect(await response.text()).not.toMatch(LEAK_PATTERNS);
    });
  }

  for (const probe of ERROR_PROBES) {
    test(`${probe.title} gets a clean answer, not a crash dump`, { tag: TAGS }, async ({ request }) => {
      const response = await request.fetch(probe.path, {
        method: probe.method,
        data: probe.body,
        headers: { ...apiHeaders(), ...(probe.body ? { 'content-type': 'application/json' } : {}) },
      });
      expect(response.status(), 'a server error (5xx) means the request was not handled cleanly').toBeLessThan(500);
      expect(await response.text()).not.toMatch(LEAK_PATTERNS);
    });
  }

  test('the login page loads no scripts from other websites', { tag: TAGS }, async ({ request }) => {
    // A script from another website runs with full access to the page, so every script must come from this site
    // (the only exception is Vercel's own preview toolbar, which exists on preview deployments only).
    const html = await (await request.get('/login', { headers: apiHeaders() })).text();
    const own = new URL(siteUrl()).host;
    const foreign = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
      .map((match) => match[1])
      .filter((src) => /^(https?:)?\/\//i.test(src))
      .map((src) => new URL(src.startsWith('//') ? `https:${src}` : src).host)
      .filter((host) => host !== own && host !== 'vercel.live');
    expect(foreign, `scripts loaded from other websites: ${foreign.join(', ')}`).toEqual([]);
  });

  test('pages and API answers carry the basic security headers', { tag: TAGS }, async ({ request }) => {
    for (const path of ['/', '/api/auth/get-session']) {
      const headers = (await request.get(path, { headers: apiHeaders() })).headers();
      for (const [name, expected] of Object.entries(REQUIRED_HEADERS)) {
        if (typeof expected === 'string') expect(headers[name], `${name} on ${path}`).toBe(expected);
        else expect(headers[name], `${name} on ${path}`).toMatch(expected);
      }
    }
  });
});
