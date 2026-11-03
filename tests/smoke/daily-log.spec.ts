import { test, expect } from '../../src/fixtures/test';
import { WEEKDAY, lastWeekday } from '../../src/helpers/dates';

// A Wednesday, so every example habit is scheduled and the numbers below never change.
test.use({ frozenAt: lastWeekday(WEEKDAY.Wed) });

test.describe('Daily log', () => {
  test('ticking a habit updates the score and survives a reload', { tag: ['@smoke'] }, async ({ signedIn, today, shell, page }) => {
    await today.loadExample();

    await today.tickDo('Drink enough water');
    await today.expectScore('8%'); // (1/6 do's + 0/4 don'ts) / 2 = 8.3%

    await page.reload();
    await shell.expectReady();
    await today.expectDoDone('Drink enough water');
    await today.expectScore('8%');
  });

  test('every tab opens', { tag: ['@smoke'] }, async ({ signedIn, shell, page }) => {
    const tabs = [
      { tab: 'todo', marker: 'todo-view' },
      { tab: 'board', marker: 'range-week' },
      { tab: 'journal', marker: 'journal-view' },
      { tab: 'goals', marker: 'goals-view' },
      { tab: 'today', marker: 'day-title' },
    ] as const;

    for (const { tab, marker } of tabs) {
      await shell.goTo(tab);
      await expect(page.getByTestId(marker)).toBeVisible();
    }
  });

  test('a task added from the To-do tab can be completed', { tag: ['@smoke'] }, async ({ signedIn, shell, todo }) => {
    await shell.goTo('todo');
    await todo.add('Buy groceries', { priority: 'high' });

    await todo.complete('Buy groceries');
    await expect(todo.item('Buy groceries')).toHaveCount(0); // done tasks leave the default "Open" list

    await todo.filter('done');
    await expect(todo.item('Buy groceries')).toHaveAttribute('data-done', 'true');
  });
});
