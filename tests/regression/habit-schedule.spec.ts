import { test, expect } from '../../src/fixtures/test';
import { SCHEDULE_CASES } from '../../src/data/schedule-cases';
import { WEEKDAY, lastWeekday } from '../../src/helpers/dates';

test.describe('Habit schedules (data-driven by weekday)', () => {
  for (const { day, weekday, dos, donts, hidden } of SCHEDULE_CASES) {
    test.describe(day, () => {
      test.use({ frozenAt: lastWeekday(weekday) });

      test(`shows ${dos} do's and ${donts} don'ts`, { tag: ['@regression'] }, async ({ signedIn, today }) => {
        await today.loadExample();

        await expect(today.doItems()).toHaveCount(dos);
        await expect(today.dontItems()).toHaveCount(donts);
        if (hidden > 0) {
          await expect(today.hiddenNote).toContainText(`${hidden} habits aren't scheduled`);
        } else {
          await expect(today.hiddenNote).toHaveCount(0);
        }
      });
    });
  }

  test.describe('custom schedule', () => {
    test.use({ frozenAt: lastWeekday(WEEKDAY.Sat) });

    test('a weekdays-only habit is hidden on Saturday', { tag: ['@regression'] }, async ({ signedIn, shell, settings, today }) => {
      await shell.openSettings();
      await settings.addHabit('do', 'Gym session');
      await settings.setSchedule('do', 'Gym session', 'weekdays');
      await settings.close();

      await expect(today.doItem('Gym session')).toHaveCount(0);
      await expect(today.hiddenNote).toContainText("1 habit isn't scheduled");
    });

    test('a day with nothing scheduled is a rest day, not a failure', { tag: ['@regression'] }, async ({ signedIn, shell, settings, today }) => {
      await shell.openSettings();
      await settings.addHabit('do', 'Office stand-up notes');
      await settings.setSchedule('do', 'Office stand-up notes', 'weekdays');
      await settings.close();

      await expect(today.restDay).toBeVisible();
      await expect(today.score).toHaveCount(0);
    });
  });
});
