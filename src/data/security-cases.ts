/** Share-link addresses that are not real tokens. Each must show "This link isn't available", never an error. */
export const BAD_SHARE_TOKENS: { title: string; token: string }[] = [
  { title: 'a very short link', token: 'abc' },
  { title: 'a path-escape link', token: '../../etc/passwd' },
  { title: 'a SQL-looking link', token: "' OR 1=1 --" },
  { title: 'a script-looking link', token: '<script>alert(1)</script>' },
  { title: 'an absurdly long link', token: 'a'.repeat(300) },
];

/** Typed into the "name on the shared page" box. It must be shown as plain text, never run as HTML. */
export const XSS_NAME = '<img src=x onerror=window.__xss=1>';

/** Files that must never be downloadable from the website. Each must be refused or answered with the ordinary web page. */
export const SENSITIVE_PATHS: string[] = [
  '/.env',
  '/.env.local',
  '/.git/config',
  '/.git/HEAD',
  '/package.json',
  '/package-lock.json',
  '/vercel.json',
  '/.vercel/project.json',
  '/src/lib/auth/server.ts',
  '/migrations/0001_auth.sql',
  '/scripts/migrate.mjs',
  '/attachments/notes.xlsx',
  '/AGENTS.md',
  '/.grok/app-env.json',
  '/node_modules/.package-lock.json',
];

/** Text that only appears in secret files or in crash reports. It must never be part of any answer from the site. */
export const LEAK_PATTERNS =
  /BETTER_AUTH_SECRET\s*=|DATABASE_URL\s*=|\[core\]|ref: refs\/heads|"dependencies"\s*:|create table|betterAuth\(|node_modules\/|\bat\s+\S+\s+\(.*:\d+:\d+\)|postgres(ql)?:\/\/|neon\.tech|ECONNREFUSED|ENOTFOUND|password authentication failed/i;

/** Malformed requests an attacker might send to provoke an error page. The answer must be a clean 4xx — never a crash dump. */
export const ERROR_PROBES: { title: string; method: 'GET' | 'POST'; path: string; body?: string }[] = [
  { title: 'an unknown auth address', method: 'GET', path: '/api/auth/does-not-exist' },
  { title: 'sign-in with text that is not JSON', method: 'POST', path: '/api/auth/sign-in/email', body: 'this is not json' },
  { title: 'sign-in with objects instead of text', method: 'POST', path: '/api/auth/sign-in/email', body: '{"email":{"$ne":null},"password":["x"]}' },
  { title: 'sign-up with a huge name', method: 'POST', path: '/api/auth/sign-up/email', body: JSON.stringify({ name: 'A'.repeat(500_000), email: 'huge@example.com', password: 'Pw-1234567!' }) },
  { title: 'a share link with an invalid web address escape', method: 'GET', path: '/share/%E0%A4%A' },
];

/** Headers every page and API answer should carry (set in the app's vercel.json). */
export const REQUIRED_HEADERS: Record<string, string | RegExp> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': /strict-origin/,
};

/** Text that would prove server-only code or a secret was bundled into the JavaScript sent to every visitor. */
export const BUNDLE_SECRET_PATTERNS =
  /postgres(ql)?:\/\/|neon\.tech|-----BEGIN [A-Z ]*PRIVATE KEY|github_pat_|ghp_|BETTER_AUTH_SECRET\s*[:=]\s*["'`][A-Za-z0-9+\/=_-]{16,}/;
// The bare word BETTER_AUTH_SECRET is deliberately NOT matched: the sign-in library's own browser code lists the NAMES of
// environment variables it may read (and reads none of them in a browser). Only an assigned secret VALUE is a finding.
