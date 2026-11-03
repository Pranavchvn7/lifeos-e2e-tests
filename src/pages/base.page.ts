import type { Locator, Page } from '@playwright/test';

/** Every page object extends this: it holds the Playwright `page` and a short helper for test-id locators. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected byId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
}
