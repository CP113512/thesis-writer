import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exportService } from '../services/exportService';

// 日志函数
const logPath = path.join(app.getPath('userData'), 'app.log');
function log(...args: unknown[]): void {
  try {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${args.join(' ')}\n`;
    fs.promises.appendFile(logPath, message).catch(() => {});
  } catch {}
}

export function setupExportIPC(): void {
  ipcMain.handle('export:word', async (_event, data) => {
    try {
      const { projectName, chapters, references, templateConfig, outputPath } = data;

      const savedPath = await exportService.exportToWord(
        projectName,
        chapters,
        references,
        templateConfig,
        outputPath
      );

      return { success: true, path: savedPath };
    } catch (error) {
      log('Export failed:', (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  });
}
