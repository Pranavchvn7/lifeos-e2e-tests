import { readFile } from 'node:fs/promises';
import type { Download } from '@playwright/test';
import ExcelJS from 'exceljs';

/** Text of a downloaded file (a leading UTF-8 byte-order mark is removed). */
export async function downloadText(download: Download): Promise<string> {
  const path = await download.path();
  return (await readFile(path, 'utf8')).replace(/^\uFEFF/, '');
}

export async function downloadWorkbook(download: Download): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(await download.path());
  return workbook;
}
