import { expect } from '@playwright/test';
import { BasePage } from './base.page';

export type Tab = 'today' | 'todo' | 'board' | 'journal' | 'goals';

/** The frame around every screen: greeting, navigation, logout, settings button. */
export class AppShell extends BasePage {
  readonly greeting = this.byId('greeting');
  readonly logoutButton = this.byId('logout-button');
  readonly themeToggle = this.byId('theme-toggle');

  /** The app has finished loading the signed-in user's log. */
  async expectReady(): Promise<void> {
    await expect(this.greeting).toBeVisible({ timeout: 30_000 });
  }

  /** Works on desktop (sidebar) and phone (bottom bar): clicks whichever navigation is visible. */
  async goTo(tab: Tab): Promise<void> {
    await this.page
      .locator(`[data-testid="nav-desktop-${tab}"]:visible, [data-testid="nav-mobile-${tab}"]:visible`)
      .first()
      .click();
  }

  async openSettings(): Promise<void> {
    await this.page
      .locator('[data-testid="settings-open"]:visible, [data-testid="settings-open-mobile"]:visible')
      .first()
      .click();
    await expect(this.byId('settings-dialog')).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await expect(this.page).toHaveURL(/\/login/);
  }
}
