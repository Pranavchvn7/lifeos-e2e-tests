import { expect, type Locator } from '@playwright/test';
import { persist } from '../helpers/persist';
import { BasePage } from './base.page';

const attr = (value: string) => value.replace(/"/g, '\\"');

export class TodayPage extends BasePage {
  readonly score = this.byId('score-percent');
  readonly dayTitle = this.byId('day-title');
  readonly dayNumber = this.byId('day-number');
  readonly restDay = this.byId('rest-day');
  readonly hiddenNote = this.byId('hidden-habits-note');
  readonly welcomePanel = this.byId('setup-add-habits');
  readonly reviewCard = this.byId('weekly-review-card');
  readonly reminderBanner = this.byId('reminder-banner');

  doItems(): Locator {
    return this.byId('do-item');
  }
  dontItems(): Locator {
    return this.byId('dont-item');
  }
  doItem(label: string): Locator {
    return this.page.locator(`[data-testid="do-item"][data-label="${attr(label)}"]`);
  }
  dontItem(label: string): Locator {
    return this.page.locator(`[data-testid="dont-item"][data-label="${attr(label)}"]`);
  }

  /** New accounts start empty. This loads the built-in example habits (6 do's, 4 don'ts on a weekday). */
  async loadExample(): Promise<void> {
    await persist(this.page, () => this.byId('setup-example').click());
    await expect(this.byId('do-list')).toBeVisible();
  }

  async tickDo(label: string): Promise<void> {
    await persist(this.page, () => this.doItem(label).getByTestId('do-toggle').click());
    await expect(this.doItem(label)).toHaveAttribute('data-done', 'true');
  }

  /** Tick the first `count` do's in the list. */
  async tickFirstDos(count: number): Promise<void> {
    for (let i = 0; i < count; i += 1) await this.doItems().nth(i).getByTestId('do-toggle').click();
  }

  /** Mark the first `count` don'ts as Avoided. */
  async avoidFirstDonts(count: number): Promise<void> {
    for (let i = 0; i < count; i += 1) await this.dontItems().nth(i).getByTestId('dont-avoided').click();
  }

  async gaveIn(label: string): Promise<void> {
    await this.dontItem(label).getByTestId('dont-gave-in').click();
  }

  async expectScore(text: string): Promise<void> {
    await expect(this.score).toHaveText(text);
  }

  async expectDoDone(label: string, done = true): Promise<void> {
    await expect(this.doItem(label)).toHaveAttribute('data-done', String(done));
  }

  async setOneLine(text: string): Promise<void> {
    await persist(this.page, () => this.byId('one-line-input').fill(text));
  }

  async setMood(mood: 1 | 2 | 3 | 4 | 5): Promise<void> {
    await persist(this.page, () => this.byId(`mood-${mood}`).click());
  }

  async setJournalWin(text: string): Promise<void> {
    await persist(this.page, () => this.byId('journal-win').fill(text));
  }

  /** Add a task from the "Tasks to do" panel (due today). */
  async quickAddTask(title: string): Promise<void> {
    await this.byId('today-todo-input').fill(title);
    await persist(this.page, () => this.byId('today-todo-add').click());
  }

  async rateWeek(rating: 1 | 2 | 3 | 4 | 5): Promise<void> {
    await persist(this.page, () => this.byId(`review-rating-${rating}`).click());
  }

  async writeReview(field: 'wins' | 'struggles' | 'lesson' | 'focus', text: string): Promise<void> {
    await persist(this.page, () => this.byId(`review-${field}`).fill(text));
  }
}
