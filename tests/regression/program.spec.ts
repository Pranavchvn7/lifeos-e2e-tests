import { test, expect } from '../../src/fixtures/test';
import { WEEKDAY, lastWeekday } from '../../src/helpers/dates';

test.use({ frozenAt: lastWeekday(WEEKDAY.Wed) });

test('starting a new program saves the old results and resets the day counter', { tag: ['@regression'] }, async ({ signedIn, shell, today, settings, board }) => {
  await today.loadExample();
  await today.tickDo('Drink enough water');
  await expect(today.dayNumber).toContainText('Day 1 of 90');

  await shell.openSettings();
  await settings.startNewProgram(30);
  await expect(settings.dialog).toBeHidden(); // closes itself after starting

  await expect(today.dayNumber).toContainText('Day 1 of 30');
  await expect(today.doItems()).toHaveCount(6); // "keep my habits" is on by default

  await shell.goTo('board');
  await board.selectRange('year');
  await expect(board.pastPrograms).toHaveCount(1);
  await expect(board.pastPrograms).toContainText('1 logged');
});
