import { expect } from '@playwright/test';
import { BasePage } from './base.page';

/** The public, view-only page behind a share link. */
export class SharePage extends BasePage {
  readonly title = this.byId('share-title');
  readonly missing = this.byId('share-missing');

  async open(url: string): Promise<void> {
    await this.page.goto(url);
    await expect(this.title.or(this.missing)).toBeVisible({ timeout: 30_000 });
  }
}
