import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import initSqlJs, { Database } from 'sql.js';

// 日志文件 - 使用用户数据目录
const LOG_FILE = path.join(app.getPath('userData'), 'database.log');
function log(message: string): void {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    // 使用异步写入避免阻塞
    fs.promises.appendFile(LOG_FILE, logMessage).catch(() => {});
  } catch {}
}

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'thesis-writer.db');
  }

  async initialize(): Promise<void> {
    const SQL = await initSqlJs();

    // 尝试加载现有数据库
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
      this.createTables();
    }
  }

  private createTables(): void {
    if (!this.db) return;

    // 创建项目表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        file_path TEXT
      )
    `);

    // 创建章节表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        parent_id TEXT,
        title TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        level INTEGER NOT NULL,
        number TEXT,
        content TEXT,
        is_fixed INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (parent_id) REFERENCES chapters(id)
      )
    `);

    // 创建参考文献表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS "references" (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        type TEXT NOT NULL,
        key TEXT NOT NULL,
        authors TEXT,
        title TEXT NOT NULL,
        journal TEXT,
        year INTEGER,
        volume TEXT,
        issue TEXT,
        pages TEXT,
        publisher TEXT,
        doi TEXT,
        url TEXT,
        bibtex TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    // 创建图表表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS figures (
        id TEXT PRIMARY KEY,
        chapter_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        type TEXT NOT NULL,
        number TEXT,
        caption TEXT,
        path TEXT,
        content TEXT,
        position INTEGER,
        width TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    // 创建模板表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        school TEXT NOT NULL,
        is_builtin INTEGER DEFAULT 0,
        config TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // 创建设置表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    this.save();
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  // 项目相关操作
  createProject(project: any): void {
    if (!this.db) return;

    this.db.run(
      `INSERT INTO projects (id, name, template_id, created_at, updated_at, file_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        project.id,
        project.name,
        project.templateId,
        project.createdAt.toISOString(),
        project.updatedAt.toISOString(),
        project.filePath || ''
      ]
    );

    this.save();
  }

  getProject(id: string): any | null {
    if (!this.db) return null;

    const result = this.db.exec(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return {
      id: row[0],
      name: row[1],
      templateId: row[2],
      createdAt: new Date(row[3] as string),
      updatedAt: new Date(row[4] as string),
      filePath: row[5]
    };
  }

  getAllProjects(): any[] {
    if (!this.db) return [];

    const result = this.db.exec('SELECT * FROM projects ORDER BY updated_at DESC');

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
      id: row[0],
      name: row[1],
      templateId: row[2],
      createdAt: new Date(row[3] as string),
      updatedAt: new Date(row[4] as string),
      filePath: row[5]
    }));
  }

  updateProject(project: any): void {
    if (!this.db) return;

    this.db.run(
      `UPDATE projects SET name = ?, template_id = ?, updated_at = ?, file_path = ?
       WHERE id = ?`,
      [
        project.name,
        project.templateId,
        project.updatedAt.toISOString(),
        project.filePath || '',
        project.id
      ]
    );

    this.save();
  }

  deleteProject(id: string): void {
    if (!this.db) return;

    // 删除相关章节
    this.db.run('DELETE FROM chapters WHERE project_id = ?', [id]);

    // 删除相关参考文献
    this.db.run('DELETE FROM "references" WHERE project_id = ?', [id]);

    // 删除项目
    this.db.run('DELETE FROM projects WHERE id = ?', [id]);

    this.save();
  }

  // 章节相关操作
  createChapter(chapter: any): void {
    if (!this.db) {
      const error = new Error('Database not initialized');
      log('ERROR: ' + error.message);
      throw error;
    }

    try {
      log('Creating chapter: ' + JSON.stringify({
        id: chapter.id,
        projectId: chapter.projectId,
        title: chapter.title,
        orderIndex: chapter.orderIndex,
        level: chapter.level,
        isFixed: chapter.isFixed
      }));

      this.db.run(
        `INSERT INTO chapters (id, project_id, parent_id, title, order_index, level, number, content, is_fixed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chapter.id,
          chapter.projectId,
          chapter.parentId || null,
          chapter.title,
          chapter.orderIndex ?? 0,
          chapter.level,
          chapter.number || '',
          chapter.content || '',
          chapter.isFixed ? 1 : 0
        ]
      );

      this.save();
      log('Chapter created successfully: ' + chapter.id);
    } catch (error) {
      log('ERROR in createChapter: ' + (error as Error).message);
      log('Chapter data: ' + JSON.stringify(chapter, null, 2));
      throw error;
    }
  }

  getChaptersByProject(projectId: string): any[] {
    if (!this.db) return [];

    const result = this.db.exec(
      'SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index',
      [projectId]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
      id: row[0],
      projectId: row[1],
      parentId: row[2],
      title: row[3],
      orderIndex: row[4],
      level: row[5],
      number: row[6],
      content: row[7],
      isFixed: row[8] === 1
    }));
  }

  updateChapter(chapter: any): void {
    if (!this.db) return;

    this.db.run(
      `UPDATE chapters SET title = ?, order_index = ?, level = ?, number = ?, content = ?, parent_id = ?
       WHERE id = ?`,
      [
        chapter.title,
        chapter.orderIndex,
        chapter.level,
        chapter.number || '',
        chapter.content || '',
        chapter.parentId || null,
        chapter.id
      ]
    );

    this.save();
  }

  deleteChapter(id: string): void {
    if (!this.db) return;

    this.db.run('DELETE FROM chapters WHERE id = ?', [id]);
    this.save();
  }

  // 参考文献相关操作
  createReference(reference: any): void {
    if (!this.db) return;

    this.db.run(
      `INSERT INTO "references" (id, project_id, type, key, authors, title, journal, year, volume, issue, pages, publisher, doi, url, bibtex)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reference.id,
        reference.projectId,
        reference.type,
        reference.key,
        JSON.stringify(reference.authors || []),
        reference.title,
        reference.journal || null,
        reference.year,
        reference.volume || null,
        reference.issue || null,
        reference.pages || null,
        reference.publisher || null,
        reference.doi || null,
        reference.url || null,
        reference.bibtex || null
      ]
    );

    this.save();
  }

  getReferencesByProject(projectId: string): any[] {
    if (!this.db) return [];

    const result = this.db.exec(
      'SELECT * FROM "references" WHERE project_id = ?',
      [projectId]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
      id: row[0],
      projectId: row[1],
      type: row[2],
      key: row[3],
      authors: JSON.parse(row[4] as string || '[]'),
      title: row[5],
      journal: row[6],
      year: row[7],
      volume: row[8],
      issue: row[9],
      pages: row[10],
      publisher: row[11],
      doi: row[12],
      url: row[13],
      bibtex: row[14]
    }));
  }

  updateReference(reference: any): void {
    if (!this.db) return;

    this.db.run(
      `UPDATE "references" SET type = ?, key = ?, authors = ?, title = ?, journal = ?, year = ?, volume = ?, issue = ?, pages = ?, publisher = ?, doi = ?, url = ?, bibtex = ?
       WHERE id = ?`,
      [
        reference.type,
        reference.key,
        JSON.stringify(reference.authors || []),
        reference.title,
        reference.journal || null,
        reference.year,
        reference.volume || null,
        reference.issue || null,
        reference.pages || null,
        reference.publisher || null,
        reference.doi || null,
        reference.url || null,
        reference.bibtex || null,
        reference.id
      ]
    );

    this.save();
  }

  deleteReference(id: string): void {
    if (!this.db) return;

    this.db.run('DELETE FROM "references" WHERE id = ?', [id]);
    this.save();
  }

  // 模板相关操作
  createTemplate(template: any): void {
    if (!this.db) return;

    this.db.run(
      `INSERT OR REPLACE INTO templates (id, name, school, is_builtin, config, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        template.id,
        template.name,
        template.school,
        template.isBuiltin ? 1 : 0,
        JSON.stringify(template.config),
        new Date().toISOString()
      ]
    );

    this.save();
  }

  getTemplate(id: string): any | null {
    if (!this.db) return null;

    const result = this.db.exec(
      'SELECT * FROM templates WHERE id = ?',
      [id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return {
      id: row[0],
      name: row[1],
      school: row[2],
      isBuiltin: row[3] === 1,
      config: JSON.parse(row[4] as string),
      createdAt: new Date(row[5] as string)
    };
  }

  getAllTemplates(): any[] {
    if (!this.db) return [];

    const result = this.db.exec('SELECT * FROM templates ORDER BY name');

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
      id: row[0],
      name: row[1],
      school: row[2],
      isBuiltin: row[3] === 1,
      config: JSON.parse(row[4] as string),
      createdAt: new Date(row[5] as string)
    }));
  }

  updateTemplate(template: any): void {
    if (!this.db) return;

    this.db.run(
      `UPDATE templates SET name = ?, school = ?, config = ? WHERE id = ?`,
      [
        template.name,
        template.school,
        JSON.stringify(template.config),
        template.id
      ]
    );

    this.save();
  }

  deleteTemplate(id: string): void {
    if (!this.db) return;

    this.db.run('DELETE FROM templates WHERE id = ?', [id]);
    this.save();
  }

  // 设置相关操作
  getSetting(key: string): string | null {
    if (!this.db) return null;

    const result = this.db.exec(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    return result[0].values[0][0] as string;
  }

  setSetting(key: string, value: string): void {
    if (!this.db) return;

    this.db.run(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [key, value]
    );

    this.save();
  }

  // 图表管理操作
  createFigure(figure: any): void {
    if (!this.db) return;

    this.db.run(
      `INSERT INTO figures (id, chapter_id, project_id, type, number, caption, path, content, position, width, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        figure.id,
        figure.chapterId,
        figure.projectId,
        figure.type,
        figure.number || '',
        figure.caption || '',
        figure.path || '',
        figure.content || '',
        figure.position || 0,
        figure.width || '100%',
        new Date().toISOString()
      ]
    );

    this.save();
  }

  getFiguresByProject(projectId: string): any[] {
    if (!this.db) return [];

    const result = this.db.exec(
      'SELECT * FROM figures WHERE project_id = ? ORDER BY position',
      [projectId]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
      id: row[0],
      chapterId: row[1],
      projectId: row[2],
      type: row[3],
      number: row[4],
      caption: row[5],
      path: row[6],
      content: row[7],
      position: row[8],
      width: row[9],
      createdAt: new Date(row[10] as string)
    }));
  }

  getFiguresByChapter(chapterId: string): any[] {
    if (!this.db) return [];

    const result = this.db.exec(
      'SELECT * FROM figures WHERE chapter_id = ? ORDER BY position',
      [chapterId]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
      id: row[0],
      chapterId: row[1],
      projectId: row[2],
      type: row[3],
      number: row[4],
      caption: row[5],
      path: row[6],
      content: row[7],
      position: row[8],
      width: row[9],
      createdAt: new Date(row[10] as string)
    }));
  }

  updateFigure(figure: any): void {
    if (!this.db) return;

    this.db.run(
      `UPDATE figures SET chapter_id = ?, type = ?, number = ?, caption = ?, path = ?, content = ?, position = ?, width = ?
       WHERE id = ?`,
      [
        figure.chapterId,
        figure.type,
        figure.number || '',
        figure.caption || '',
        figure.path || '',
        figure.content || '',
        figure.position || 0,
        figure.width || '100%',
        figure.id
      ]
    );

    this.save();
  }

  deleteFigure(id: string): void {
    if (!this.db) return;

    this.db.run('DELETE FROM figures WHERE id = ?', [id]);
    this.save();
  }
}

export const databaseService = new DatabaseService();
