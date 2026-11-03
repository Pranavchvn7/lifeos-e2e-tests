// Turns Playwright's JSON report into a short Markdown summary for the GitHub run page.
//   node scripts/summarize.mjs [path/to/report.json] >> "$GITHUB_STEP_SUMMARY"
// It also writes one line to $GITHUB_OUTPUT (name: line) that the workflow uses in the commit status.
import { existsSync, readFileSync, appendFileSync } from 'node:fs';

const file = process.argv[2] ?? 'test-results/report.json';
if (!existsSync(file)) {
  console.log('### Test results\n\nNo test report was produced (the run stopped before the tests started).');
  process.exit(0);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const strip = (text) => String(text ?? '').replace(/\u001b\[[0-9;]*m/g, ''); // remove colour codes
const cell = (text, max = 160) => {
  const oneLine = strip(text).split('\n').find((l) => l.trim()) ?? '';
  const clipped = oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
  return clipped.replace(/\|/g, '\\|');
};
const fmt = (ms) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
};

// Walk suites → specs → tests, remembering describe names so titles read naturally.
const rows = [];
(function walk(suite, path) {
  const here = suite.file && suite.title === suite.file ? path : [...path, suite.title].filter(Boolean);
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const results = test.results ?? [];
      rows.push({
        title: [...here, spec.title].join(' › '),
        project: test.projectName,
        status: test.status, // expected | unexpected | flaky | skipped
        duration: results.reduce((sum, r) => sum + (r.duration ?? 0), 0),
        failedAttempts: results.filter((r) => r.status !== 'passed' && r.status !== 'skipped').length,
        error: results.find((r) => r.error)?.error?.message ?? '',
      });
    }
  }
  for (const child of suite.suites ?? []) walk(child, here);
})({ suites: report.suites, title: '' }, []);

const count = (status) => rows.filter((r) => r.status === status).length;
const passed = count('expected');
const failed = count('unexpected');
const flaky = count('flaky');
const skipped = count('skipped');
const total = rows.length;
const wall = report.stats?.duration ?? 0;

const out = [];
out.push(`### Test results — ${total} runs in ${fmt(wall)}`);
out.push('');
out.push('| ✅ Passed | ❌ Failed | ⚠️ Flaky | ⏭️ Skipped |');
out.push('|---:|---:|---:|---:|');
out.push(`| ${passed} | ${failed} | ${flaky} | ${skipped} |`);

const flakyRows = rows.filter((r) => r.status === 'flaky');
if (flakyRows.length) {
  out.push('', '**Flaky — passed only after a retry (fix these, they hide real problems):**', '');
  out.push('| Test | Project | Failed attempts | First error |', '|---|---|---:|---|');
  for (const r of flakyRows) out.push(`| ${cell(r.title, 90)} | ${r.project} | ${r.failedAttempts} | ${cell(r.error)} |`);
}
const failedRows = rows.filter((r) => r.status === 'unexpected');
if (failedRows.length) {
  out.push('', '**Failed:**', '', '| Test | Project | Error |', '|---|---|---|');
  for (const r of failedRows) out.push(`| ${cell(r.title, 90)} | ${r.project} | ${cell(r.error)} |`);
}
const slowest = [...rows].sort((a, b) => b.duration - a.duration).slice(0, 5);
if (slowest.length) {
  out.push('', '**Slowest tests** (a test that is ~11 s slower than its neighbours probably waited for the sign-up rate limit):', '');
  out.push('| Test | Project | Time |', '|---|---|---:|');
  for (const r of slowest) out.push(`| ${cell(r.title, 90)} | ${r.project} | ${fmt(r.duration)} |`);
}
console.log(out.join('\n'));

if (process.env.GITHUB_OUTPUT) {
  const line = `${passed} passed, ${failed} failed, ${flaky} flaky in ${fmt(wall)}`;
  appendFileSync(process.env.GITHUB_OUTPUT, `line=${line}\n`);
}
