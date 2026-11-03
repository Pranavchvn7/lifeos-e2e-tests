import { test } from '../../src/fixtures/test';
import { SCORE_CASES } from '../../src/data/score-cases';
import { WEEKDAY, lastWeekday } from '../../src/helpers/dates';

// Wednesday: all 6 example do's and 4 don'ts are scheduled.
test.use({ frozenAt: lastWeekday(WEEKDAY.Wed) });

test.describe('Daily score', () => {
  for (const { dos, donts, expected } of SCORE_CASES) {
    test(`${dos} of 6 do's and ${donts} of 4 don'ts scores ${expected}`, { tag: ['@regression'] }, async ({ signedIn, today }) => {
      await today.loadExample();
      await today.tickFirstDos(dos);
      await today.avoidFirstDonts(donts);
      await today.expectScore(expected);
    });
  }

  test("'Gave in' does not count as avoided", { tag: ['@regression'] }, async ({ signedIn, today }) => {
    await today.loadExample();
    await today.tickFirstDos(6);
    await today.avoidFirstDonts(3);
    await today.gaveIn("No procrastinating on the main task");

    await today.expectScore('88%'); // same as 3 of 4 avoided
  });
});
