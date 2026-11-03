import { test, expect } from '../../src/fixtures/test';
import { WEEKDAY, lastWeekday } from '../../src/helpers/dates';

test.describe('Weekly review', () => {
  test.describe('on a Sunday', () => {
    test.use({ frozenAt: lastWeekday(WEEKDAY.Sun) });

    test('the card appears, stays while typing, saves, and is listed in the Journal', { tag: ['@regression'] }, async ({ signedIn, shell, today, page }) => {
      await expect(today.reviewCard).toBeVisible();
      await expect(today.reviewCard).toContainText("it's Sunday");

      await today.rateWeek(4);
      await today.writeReview('wins', 'Shipped the progress board');
      await expect(today.reviewCard).toBeVisible(); // must not vanish after the first words are typed

      await page.reload();
      await shell.expectReady();
      await expect(today.reviewCard).toBeHidden(); // finished reviews are not nagged about again

      await shell.goTo('journal');
      const list = page.getByTestId('weekly-review-list');
      await expect(list).toContainText('Felt 4/5');
      await list.locator('summary').click();
      await expect(list).toContainText('Shipped the progress board');
    });
  });

  test.describe('on a Monday', () => {
    test.use({ frozenAt: lastWeekday(WEEKDAY.Mon) });

    test("offers last week's review as a catch-up", { tag: ['@regression'] }, async ({ signedIn, today }) => {
      await expect(today.reviewCard).toBeVisible();
      await expect(today.reviewCard).toContainText("Last week's review");
    });
  });

  test.describe('on a Wednesday', () => {
    test.use({ frozenAt: lastWeekday(WEEKDAY.Wed) });

    test('there is no review prompt', { tag: ['@regression'] }, async ({ signedIn, today }) => {
      await expect(today.reviewCard).toHaveCount(0);
    });
  });
});
