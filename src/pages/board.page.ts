import { expect, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export type Range = 'week' | 'month' | 'year';

export class BoardPage extends BasePage {
  readonly weekPrev = this.byId('week-prev');
  readonly weekNext = this.byId('week-next');
  readonly setupLink = this.byId('board-setup');
  readonly pastPrograms = this.byId('past-program');

  async selectRange(range: Range): Promise<void> {
    await this.byId(`range-${range}`).click();
    await expect(this.byId(`range-${range}`)).toHaveAttribute('aria-selected', 'true');
  }

  /** A summary card, e.g. kpi('Average score'). */
  kpi(label: 'Average score' | 'Good days' | 'Days logged' | 'Current streak'): Locator {
    return this.page.locator(`[data-testid="kpi"][data-kpi="${label}"]`);
  }

  monthButton(yearMonth: string): Locator {
    return this.byId(`month-${yearMonth}`);
  }

  badge(id: string): Locator {
    return this.page.locator(`[data-testid="badge"][data-badge-id="${id}"]`);
  }

  async expectBadge(id: string, earned: boolean): Promise<void> {
    await expect(this.badge(id)).toHaveAttribute('data-earned', String(earned));
  }
}
