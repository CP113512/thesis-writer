import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { databaseService } from '../services/database';

// 简单日志函数 - 写入文件避免 EPIPE
const logPath = path.join(app.getPath('userData'), 'app.log');
function log(...args: unknown[]): void {
  try {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${args.join(' ')}\n`;
    fs.promises.appendFile(logPath, message).catch(() => {});
  } catch {}
}

// 扫描示例文档文件夹
function scanExampleDocuments(): { name: string; path: string; size: number; modified: string }[] {
  // 开发模式和生产模式使用不同路径
  let examplesDir: string;
  if (app.isPackaged) {
    // 生产模式：应用资源目录
    examplesDir = path.join(process.resourcesPath, '示例文档');
  } else {
    // 开发模式：项目根目录
    examplesDir = path.join(__dirname, '../../示例文档');
  }

  log('Scanning example documents from:', examplesDir);
  const examples: { name: string; path: string; size: number; modified: string }[] = [];

  try {
    if (fs.existsSync(examplesDir)) {
      const files = fs.readdirSync(examplesDir);
      log('Found files:', files.join(', '));
      for (const file of files) {
        if (file.endsWith('.docx') || file.endsWith('.json')) {
          const filePath = path.join(examplesDir, file);
          const stats = fs.statSync(filePath);
          examples.push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          });
        }
      }
    } else {
      log('Examples directory does not exist:', examplesDir);
    }
  } catch (error) {
    log('Failed to scan example documents:', (error as Error).message);
  }

  return examples;
}

export function setupDatabaseIPC(): void {
  // 扫描示例文档
  ipcMain.handle('examples:scan', async () => {
    try {
      const examples = scanExampleDocuments();
      return { success: true, data: examples };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 读取示例文档内容
  ipcMain.handle('examples:read', async (_event, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 初始化数据库
  ipcMain.handle('db:initialize', async () => {
    try {
      await databaseService.initialize();
      return { success: true };
    } catch (error) {
      log('Failed to initialize database:', (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  });

  // 项目相关
  ipcMain.handle('db:createProject', async (_event, project) => {
    try {
      databaseService.createProject(project);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:getProject', async (_event, id: string) => {
    try {
      const project = databaseService.getProject(id);
      return { success: true, data: project };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:getAllProjects', async () => {
    try {
      const projects = databaseService.getAllProjects();
      return { success: true, data: projects };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:updateProject', async (_event, project) => {
    try {
      databaseService.updateProject(project);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:deleteProject', async (_event, id: string) => {
    try {
      databaseService.deleteProject(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 章节相关
  ipcMain.handle('db:createChapter', async (_event, chapter) => {
    try {
      log('Creating chapter:', JSON.stringify(chapter, null, 2));
      databaseService.createChapter(chapter);
      return { success: true };
    } catch (error) {
      log('Failed to create chapter:', (error as Error).message);
      log('Chapter data:', JSON.stringify(chapter, null, 2));
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:getChaptersByProject', async (_event, projectId: string) => {
    try {
      const chapters = databaseService.getChaptersByProject(projectId);
      return { success: true, data: chapters };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:updateChapter', async (_event, chapter) => {
    try {
      databaseService.updateChapter(chapter);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:deleteChapter', async (_event, id: string) => {
    try {
      databaseService.deleteChapter(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 参考文献相关
  ipcMain.handle('db:createReference', async (_event, reference) => {
    try {
      databaseService.createReference(reference);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:getReferencesByProject', async (_event, projectId: string) => {
    try {
      const references = databaseService.getReferencesByProject(projectId);
      return { success: true, data: references };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:updateReference', async (_event, reference) => {
    try {
      databaseService.updateReference(reference);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:deleteReference', async (_event, id: string) => {
    try {
      databaseService.deleteReference(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 模板相关
  ipcMain.handle('db:createTemplate', async (_event, template) => {
    try {
      databaseService.createTemplate(template);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:getTemplate', async (_event, id: string) => {
    try {
      const template = databaseService.getTemplate(id);
      return { success: true, data: template };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:getAllTemplates', async () => {
    try {
      const templates = databaseService.getAllTemplates();
      return { success: true, data: templates };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:updateTemplate', async (_event, template: any) => {
    try {
      databaseService.updateTemplate(template);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:deleteTemplate', async (_event, id: string) => {
    try {
      databaseService.deleteTemplate(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 设置相关
  ipcMain.handle('db:getSetting', async (_event, key: string) => {
    try {
      const value = databaseService.getSetting(key);
      return { success: true, data: value };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:setSetting', async (_event, key: string, value: string) => {
    try {
      databaseService.setSetting(key, value);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 图表相关
  ipcMain.handle('db:createFigure', async (_event, figure) => {
    try {
      databaseService.createFigure(figure);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:getFiguresByProject', async (_event, projectId: string) => {
    try {
      const figures = databaseService.getFiguresByProject(projectId);
      return { success: true, data: figures };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:getFiguresByChapter', async (_event, chapterId: string) => {
    try {
      const figures = databaseService.getFiguresByChapter(chapterId);
      return { success: true, data: figures };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:updateFigure', async (_event, figure) => {
    try {
      databaseService.updateFigure(figure);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('db:deleteFigure', async (_event, id: string) => {
    try {
      databaseService.deleteFigure(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
