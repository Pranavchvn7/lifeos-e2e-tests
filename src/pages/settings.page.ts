import { expect, type Download, type Locator } from '@playwright/test';
import { persist } from '../helpers/persist';
import { BasePage } from './base.page';

export type HabitKind = 'do' | 'dont';
export type SchedulePreset = 'weekdays' | 'weekends' | 'everyday';
export type ExportKind = 'xlsx' | 'csv-daily' | 'csv-habits' | 'csv-todos' | 'json';
type Section = 'habits' | 'reminders' | 'program' | 'share' | 'export' | 'danger';

const attr = (value: string) => value.replace(/"/g, '\\"');

/** The "Account & settings" dialog. Open it first with AppShell.openSettings(). */
export class SettingsPage extends BasePage {
  readonly dialog = this.byId('settings-dialog');

  /** Sections are collapsible; this opens one if it is closed. */
  async openSection(id: Section): Promise<Locator> {
    const section = this.byId(`settings-${id}`);
    const isOpen = await section.evaluate((el) => (el as HTMLDetailsElement).open);
    if (!isOpen) await section.locator('summary').click();
    return section;
  }

  async close(): Promise<void> {
    await this.byId('settings-close').click();
    await expect(this.dialog).toBeHidden();
  }

  // ── habits ──
  habitRow(kind: HabitKind, label: string): Locator {
    return this.byId(`habit-editor-${kind}`)
      .getByTestId(`habit-row-${kind}`)
      .filter({ has: this.page.locator(`input[value="${attr(label)}"]`) });
  }

  async addHabit(kind: HabitKind, label: string): Promise<void> {
    await this.openSection('habits');
    await this.byId(`add-${kind}-input`).fill(label);
    await persist(this.page, () => this.byId(`add-${kind}-button`).click());
    await expect(this.habitRow(kind, label)).toBeVisible();
  }

  async removeHabit(kind: HabitKind, label: string): Promise<void> {
    await persist(this.page, () => this.habitRow(kind, label).getByTestId(`remove-${kind}`).click());
  }

  async setSchedule(kind: HabitKind, label: string, preset: SchedulePreset): Promise<void> {
    const row = this.habitRow(kind, label);
    await row.getByTestId('schedule-toggle').click();
    await persist(this.page, () => row.getByTestId(`schedule-${preset}`).click());
  }

  // ── reminders ──
  async enableReminder(time: string): Promise<void> {
    await this.openSection('reminders');
    await this.byId('reminder-enabled').check();
    await this.byId('reminder-time').fill(time);
  }

  // ── program ──
  async startNewProgram(lengthDays: 30 | 60 | 90 | 180): Promise<void> {
    await this.openSection('program');
    await this.byId('program-length').selectOption(String(lengthDays));
    await this.byId('program-start-new').click();
    await persist(this.page, () => this.byId('program-confirm').click());
  }

  // ── sharing (links are stored on the server, not in the autosaved log) ──
  /** The name shown at the top of the shared page (it starts as the account's first name). */
  async setShareName(name: string): Promise<void> {
    await this.openSection('share');
    await this.byId('share-name').fill(name);
  }

  async createShareLink(): Promise<string> {
    await this.openSection('share');
    await this.byId('share-create').click();
    return this.shareUrl();
  }

  async shareUrl(): Promise<string> {
    const input = this.byId('share-url');
    await expect(input).toBeVisible();
    return input.inputValue();
  }

  async regenerateShareLink(): Promise<string> {
    const before = await this.shareUrl();
    await this.byId('share-regenerate').click();
    await expect(this.byId('share-url')).not.toHaveValue(before);
    return this.shareUrl();
  }

  async revokeShareLink(): Promise<void> {
    await this.byId('share-revoke').click();
    await expect(this.byId('share-create')).toBeVisible();
  }

  // ── export / backup ──
  async download(kind: ExportKind): Promise<Download> {
    await this.openSection('export');
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.byId(`export-${kind}`).click(),
    ]);
    return download;
  }

  async importBackup(filePath: string): Promise<void> {
    await this.openSection('export');
    await persist(this.page, () => this.byId('import-json').setInputFiles(filePath));
  }

  // ── danger zone ──
  async startOver(): Promise<void> {
    await this.openSection('danger');
    await this.byId('reset-start').click();
    await persist(this.page, () => this.byId('reset-confirm').click());
    await expect(this.dialog).toBeHidden(); // the dialog closes itself once everything is cleared
  }

  async deleteAccount(): Promise<void> {
    await this.openSection('danger');
    await this.byId('delete-confirm-input').fill('DELETE');
    await this.byId('delete-account').click();
    await expect(this.page).toHaveURL(/\/login/, { timeout: 30_000 });
  }
}
