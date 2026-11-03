import { test, expect } from '../../src/fixtures/test';
import { WEEKDAY, isoDate, lastWeekday } from '../../src/helpers/dates';
import { downloadText, downloadWorkbook } from '../../src/helpers/files';

const NOW = lastWeekday(WEEKDAY.Wed);
test.use({ frozenAt: NOW });

test.describe('Export and backup', () => {
  test.beforeEach(async ({ signedIn, today, shell }) => {
    await today.loadExample();
    await today.tickDo('Drink enough water');
    await shell.openSettings();
  });

  test('daily summary CSV has the right header and row', { tag: ['@regression'] }, async ({ settings }) => {
    const download = await settings.download('csv-daily');
    expect(download.suggestedFilename()).toMatch(/^lifeos-daily-summary-\d{4}-\d{2}-\d{2}\.csv$/);

    const lines = (await downloadText(download)).trim().split(/\r?\n/);
    expect(lines[0]).toBe(
      "Date,Weekday,Program day,Do's done,Do's scheduled,Do's %,Don'ts avoided,Gave in,Don'ts scheduled,Don'ts %,Score %,Good day (80%+),Mood (1-5),One line",
    );
    expect(lines[1]).toBe(`${isoDate(NOW)},Wed,1,1,6,17,0,0,4,0,8,No,,`);
  });

  test('to-do CSV lists the example task', { tag: ['@regression'] }, async ({ settings }) => {
    const text = await downloadText(await settings.download('csv-todos'));
    expect(text).toContain('Task,Priority,Due,Status,Added,Completed,Notes');
    expect(text).toContain('Pick my three most important habits,high,,Open');
  });

  test('the Excel workbook has all eight sheets', { tag: ['@regression'] }, async ({ settings }) => {
    const download = await settings.download('xlsx');
    expect(download.suggestedFilename()).toMatch(/^lifeos-export-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const workbook = await downloadWorkbook(download);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Daily summary',
      'Habit log',
      'Habits',
      'To-dos',
      'Goals',
      'Journal',
      'Weekly reviews',
      'Programs',
    ]);
    expect(workbook.getWorksheet('Habits')?.rowCount).toBe(11); // header + 6 do's + 4 don'ts
    expect(workbook.getWorksheet('Daily summary')?.getCell('A2').value).toBe(isoDate(NOW));
  });

  test('a JSON backup restores the log it was taken from', { tag: ['@regression'] }, async ({ settings, today }) => {
    const backupPath = await (await settings.download('json')).path();

    await settings.addHabit('do', 'Temporary habit');
    await settings.importBackup(backupPath); // replaces everything and closes the dialog

    await expect(today.doItems()).toHaveCount(6);
    await expect(today.doItem('Temporary habit')).toHaveCount(0);
    await today.expectDoDone('Drink enough water');
  });
});
