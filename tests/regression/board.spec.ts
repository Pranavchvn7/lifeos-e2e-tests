import { test, expect } from '../../src/fixtures/test';
import { WEEKDAY, isoDate, lastWeekday } from '../../src/helpers/dates';

const NOW = lastWeekday(WEEKDAY.Wed);
test.use({ frozenAt: NOW });

test.describe('Progress board', () => {
  test('a new account sees an empty board with a prompt to set up habits', { tag: ['@regression'] }, async ({ signedIn, shell, board }) => {
    await shell.goTo('board');

    await expect(board.setupLink).toBeVisible();
    await expect(board.kpi('Average score')).toContainText('—');
  });

  test('a perfect day shows 100%, a streak and the first badges', { tag: ['@regression'] }, async ({ signedIn, shell, today, board }) => {
    await today.loadExample();
    await today.tickFirstDos(6);
    await today.avoidFirstDonts(4);
    await today.expectScore('100%');

    await shell.goTo('board');
    await expect(board.kpi('Average score')).toContainText('100%');
    await expect(board.kpi('Good days')).toContainText('1/1');
    await expect(board.kpi('Days logged')).toContainText('1/1');
    await expect(board.kpi('Current streak')).toContainText('1');

    await board.expectBadge('first-log', true);
    await board.expectBadge('perfect-day', true);
    await board.expectBadge('streak-7', false);
  });

  test('week, month and year views all render', { tag: ['@regression'] }, async ({ signedIn, shell, today, board, page }) => {
    await today.loadExample();
    await today.tickDo('Read for 20 minutes');
    await shell.goTo('board');

    await expect(board.weekPrev).toBeDisabled(); // the program starts today, so week 1 is the first week

    await board.selectRange('month');
    await expect(board.monthButton(isoDate(NOW).slice(0, 7))).toBeVisible();

    await board.selectRange('year');
    await expect(page.getByText('Full 90-day program')).toBeVisible();
  });
});
