import { expect, type Locator } from '@playwright/test';
import { persist } from '../helpers/persist';
import { BasePage } from './base.page';

export type Priority = 'high' | 'medium' | 'low';
const attr = (value: string) => value.replace(/"/g, '\\"');

export class TodoPage extends BasePage {
  readonly view = this.byId('todo-view');
  readonly empty = this.byId('todo-empty');

  item(title: string): Locator {
    return this.page.locator(`[data-testid="todo-item"][data-title="${attr(title)}"]`);
  }

  /** The panel (Overdue, Due today, Upcoming, No date, Completed) that holds a task list. */
  section(name: string): Locator {
    return this.page
      .locator('section')
      .filter({ has: this.page.getByRole('heading', { name: new RegExp(`^${name}`) }) });
  }

  async add(title: string, options: { priority?: Priority; due?: string } = {}): Promise<void> {
    await this.byId('todo-input').fill(title);
    if (options.priority) await this.byId('todo-priority').selectOption(options.priority);
    if (options.due) await this.byId('todo-due').fill(options.due);
    await persist(this.page, () => this.byId('todo-add').click());
    await expect(this.item(title)).toBeVisible();
  }

  async complete(title: string): Promise<void> {
    await persist(this.page, () => this.item(title).getByTestId('todo-toggle').click());
  }

  async remove(title: string): Promise<void> {
    await persist(this.page, () => this.item(title).getByTestId('todo-delete').click());
  }

  async filter(name: 'open' | 'done' | 'all'): Promise<void> {
    await this.byId(`todo-filter-${name}`).click();
  }

  async clearCompleted(): Promise<void> {
    await persist(this.page, () => this.byId('todo-clear-done').click());
  }
}
