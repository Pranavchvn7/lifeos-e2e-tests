import { test, expect } from '../../src/fixtures/test';
import { WEEKDAY, addDays, isoDate, lastWeekday } from '../../src/helpers/dates';

const NOW = lastWeekday(WEEKDAY.Wed);
test.use({ frozenAt: NOW });

test.describe('To-do list', () => {
  test.beforeEach(async ({ signedIn, shell }) => {
    await shell.goTo('todo');
  });

  test('a new account has no tasks', { tag: ['@regression'] }, async ({ todo }) => {
    await expect(todo.empty).toBeVisible();
  });

  test('tasks are grouped by due date', { tag: ['@regression'] }, async ({ todo }) => {
    await todo.add('Pay rent', { priority: 'high', due: isoDate(addDays(NOW, -1)) });
    await todo.add('Send report', { due: isoDate(NOW) });
    await todo.add('Book dentist', { priority: 'low', due: isoDate(addDays(NOW, 5)) });
    await todo.add('Someday idea');

    await expect(todo.section('Overdue').getByTestId('todo-item')).toHaveAttribute('data-title', 'Pay rent');
    await expect(todo.section('Due today').getByTestId('todo-item')).toHaveAttribute('data-title', 'Send report');
    await expect(todo.section('Upcoming').getByTestId('todo-item')).toHaveAttribute('data-title', 'Book dentist');
    await expect(todo.section('No date').getByTestId('todo-item')).toHaveAttribute('data-title', 'Someday idea');
  });

  test('completing, filtering and clearing tasks', { tag: ['@regression'] }, async ({ todo }) => {
    await todo.add('Write blog post');
    await todo.add('Call mum');

    await todo.complete('Write blog post');
    await todo.filter('open');
    await expect(todo.item('Write blog post')).toHaveCount(0);
    await expect(todo.item('Call mum')).toBeVisible();

    await todo.filter('done');
    await expect(todo.item('Write blog post')).toBeVisible();
    await expect(todo.item('Call mum')).toHaveCount(0);

    await todo.clearCompleted();
    await expect(todo.empty).toBeVisible();
  });

  test('a task can be reopened and deleted', { tag: ['@regression'] }, async ({ todo }) => {
    await todo.add('Water plants');
    await todo.complete('Water plants');
    await todo.filter('all');
    await todo.complete('Water plants'); // click again = reopen
    await expect(todo.item('Water plants')).toHaveAttribute('data-done', 'false');

    await todo.remove('Water plants');
    await expect(todo.item('Water plants')).toHaveCount(0);
  });

  test('a task added on the Today page also appears in the To-do tab', { tag: ['@regression'] }, async ({ shell, today, todo }) => {
    await shell.goTo('today');
    await today.quickAddTask('Renew passport');

    await shell.goTo('todo');
    await expect(todo.section('Due today').getByTestId('todo-item')).toHaveAttribute('data-title', 'Renew passport');
  });
});
