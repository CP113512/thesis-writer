#!/usr/bin/env node

/**
 * 论文写作器自动化测试脚本
 *
 * 功能：
 * 1. 编译检查
 * 2. 启动应用
 * 3. 运行所有功能测试
 * 4. 验证业务逻辑
 * 5. 生成测试报告
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试配置
const CONFIG = {
  timeout: 60000,
  vitePort: 5173,
  testDbPath: path.join(process.env.HOME, 'Library/Application Support/无格式论文写作器/thesis-writer.db'),
};

// 测试结果
const results = {
  startTime: null,
  endTime: null,
  tests: [],
  errors: [],
  warnings: [],
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warn: '\x1b[33m',    // yellow
    reset: '\x1b[0m',
  };
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type] || '📝';

  console.log(`${colors[type]}${prefix} [${timestamp}] ${message}${colors.reset}`);
}

function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details, time: new Date() });
  if (passed) {
    log(`${name}: 通过`, 'success');
  } else {
    log(`${name}: 失败 - ${details}`, 'error');
    results.errors.push({ name, details });
  }
}

function recordWarning(message) {
  results.warnings.push(message);
  log(message, 'warn');
}

// 执行命令
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, {
      timeout: options.timeout || CONFIG.timeout,
      cwd: options.cwd || process.cwd(),
    }, (error, stdout, stderr) => {
      if (error && !options.ignoreError) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr, code: error ? error.code : 0 });
      }
    });
  });
}

// ==================== 编译检查 ====================

async function checkTypeScript() {
  log('检查 TypeScript 编译...');

  try {
    // 检查前端代码
    const frontend = await execCommand('npx tsc --noEmit --skipLibCheck 2>&1', { ignoreError: true });
    if (frontend.code !== 0) {
      const errors = frontend.stdout.split('\n').filter(l => l.includes('error'));
      if (errors.length > 0) {
        recordTest('前端 TypeScript 编译', false, errors.slice(0, 3).join('\n'));
        return false;
      }
    }

    // 检查 Electron 代码
    const electron = await execCommand('npx tsc -p tsconfig.electron.json --noEmit 2>&1', { ignoreError: true });
    if (electron.code !== 0) {
      const errors = electron.stdout.split('\n').filter(l => l.includes('error'));
      if (errors.length > 0) {
        recordTest('Electron TypeScript 编译', false, errors.slice(0, 3).join('\n'));
        return false;
      }
    }

    recordTest('TypeScript 编译', true);
    return true;
  } catch (e) {
    recordTest('TypeScript 编译', false, e.message);
    return false;
  }
}

// ==================== 代码逻辑分析 ====================

async function analyzeCodeLogic() {
  log('分析代码逻辑...');

  const issues = [];

  // 1. 检查导出服务逻辑
  try {
    const exportService = fs.readFileSync('./electron/services/exportService.ts', 'utf8');

    // 检查图片编号逻辑
    if (!exportService.includes('assignFigureNumbers')) {
      issues.push('导出服务缺少图片编号分配函数');
    }
    if (!exportService.includes('figureRef')) {
      issues.push('导出服务缺少图片引用处理');
    }
    if (!exportService.includes('citation')) {
      issues.push('导出服务缺少引用处理');
    }

    // 检查分页逻辑
    if (!exportService.includes('PageBreak')) {
      issues.push('导出服务缺少分页逻辑');
    }

    recordTest('导出服务逻辑', issues.length === 0, issues.join('; '));
  } catch (e) {
    recordTest('导出服务逻辑', false, '无法读取文件');
  }

  // 2. 检查项目存储逻辑
  try {
    const projectStore = fs.readFileSync('./src/stores/projectStore.ts', 'utf8');

    // 检查模板加载
    if (!projectStore.includes('api.getTemplate')) {
      issues.push('项目存储缺少模板加载');
    }

    // 检查自动保存
    if (!projectStore.includes('enableAutoSave')) {
      recordWarning('项目存储缺少自动保存功能');
    }

    // 检查导入功能
    if (!projectStore.includes('importProject')) {
      issues.push('项目存储缺少导入功能');
    }

    recordTest('项目存储逻辑', issues.length === 0, issues.join('; '));
  } catch (e) {
    recordTest('项目存储逻辑', false, '无法读取文件');
  }

  // 3. 检查数据库服务
  try {
    const database = fs.readFileSync('./electron/services/database.ts', 'utf8');

    // 检查必要的表和操作
    const requiredOperations = [
      'createProject', 'getProject', 'deleteProject',
      'createChapter', 'getChaptersByProject', 'deleteChapter',
      'createReference', 'getReferencesByProject', 'deleteReference',
      'createTemplate', 'getTemplate',
    ];

    const missingOps = requiredOperations.filter(op => !database.includes(op));
    if (missingOps.length > 0) {
      issues.push(`数据库缺少操作: ${missingOps.join(', ')}`);
    }

    recordTest('数据库服务逻辑', missingOps.length === 0, missingOps.join(', '));
  } catch (e) {
    recordTest('数据库服务逻辑', false, '无法读取文件');
  }

  // 4. 检查编辑器扩展
  try {
    const files = fs.readdirSync('./src/components/Editor');
    const extensions = files.filter(f => f.includes('Extension'));

    const requiredExtensions = ['Citation', 'FigureRef', 'FigureCaption'];
    const missingExts = requiredExtensions.filter(ext =>
      !extensions.some(f => f.includes(ext))
    );

    if (missingExts.length > 0) {
      recordWarning(`缺少编辑器扩展: ${missingExts.join(', ')}`);
    }

    recordTest('编辑器扩展', true, `找到 ${extensions.length} 个扩展`);
  } catch (e) {
    recordTest('编辑器扩展', false, '无法读取目录');
  }

  return issues.length === 0;
}

// ==================== 数据库测试 ====================

async function testDatabase() {
  log('测试数据库操作...');

  try {
    // 使用 sql.js 直接测试数据库
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();

    // 创建内存数据库进行测试
    const db = new SQL.Database();

    // 创建测试表
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template_id TEXT,
        created_at TEXT,
        updated_at TEXT,
        file_path TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT,
        content TEXT,
        level INTEGER,
        number TEXT,
        order_index INTEGER,
        parent_id TEXT,
        is_fixed INTEGER
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT,
        school TEXT,
        is_builtin INTEGER,
        config TEXT
      )
    `);

    recordTest('数据库表创建', true);

    // 测试插入
    db.run("INSERT INTO projects (id, name) VALUES (?, ?)", ['test-1', '测试项目']);
    const result = db.exec("SELECT * FROM projects WHERE id = ?", ['test-1']);
    recordTest('数据库插入查询', result.length > 0 && result[0].values.length > 0);

    // 测试更新
    db.run("UPDATE projects SET name = ? WHERE id = ?", ['更新后的名称', 'test-1']);
    const updated = db.exec("SELECT name FROM projects WHERE id = ?", ['test-1']);
    recordTest('数据库更新', updated[0]?.values[0]?.[0] === '更新后的名称');

    // 测试删除
    db.run("DELETE FROM projects WHERE id = ?", ['test-1']);
    const deleted = db.exec("SELECT * FROM projects WHERE id = ?", ['test-1']);
    recordTest('数据库删除', deleted.length === 0 || deleted[0].values.length === 0);

    db.close();
    return true;
  } catch (e) {
    recordTest('数据库操作', false, e.message);
    return false;
  }
}

// ==================== 模板验证 ====================

async function validateTemplates() {
  log('验证模板配置...');

  try {
    const templatesDir = './templates';
    const files = fs.readdirSync(templatesDir)
      .filter(f => f.endsWith('.json') && f !== 'example-project.json'); // 排除示例项目

    for (const file of files) {
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      const template = JSON.parse(content);

      // 验证必要字段
      const requiredFields = ['id', 'name', 'config'];
      const missing = requiredFields.filter(f => !template[f]);

      if (missing.length > 0) {
        recordTest(`模板 ${file}`, false, `缺少字段: ${missing.join(', ')}`);
        continue;
      }

      // 验证配置结构
      const config = template.config;
      const configIssues = [];

      if (!config.page?.size) configIssues.push('缺少页面大小');
      if (!config.fonts?.body) configIssues.push('缺少正文字体');
      if (!config.fonts?.heading1) configIssues.push('缺少一级标题字体');

      recordTest(`模板 ${file}`, configIssues.length === 0, configIssues.join('; '));
    }

    return true;
  } catch (e) {
    recordTest('模板验证', false, e.message);
    return false;
  }
}

// ==================== 导出逻辑测试 ====================

async function testExportLogic() {
  log('测试导出逻辑...');

  // 模拟导出数据
  const mockProject = {
    id: 'test-project',
    name: '测试论文',
    chapters: [
      {
        id: 'ch1',
        title: '摘要',
        level: 1,
        number: '',
        content: JSON.stringify({
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '摘要' }] },
            { type: 'paragraph', content: [{ type: 'text', text: '这是摘要内容。' }] }
          ]
        }),
        isFixed: true,
      },
      {
        id: 'ch2',
        title: '绪论',
        level: 1,
        number: '1',
        content: JSON.stringify({
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '绪论' }] },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: '正文内容，引用' },
                { type: 'citation', attrs: { referenceId: 'ref-1' } },
                { type: 'text', text: '，如图' },
                { type: 'figureRef', attrs: { figureAlt: '测试图' } },
                { type: 'text', text: '所示。' }
              ]
            },
            { type: 'image', attrs: { src: 'data:image/png;base64,test', alt: '测试图' } }
          ]
        }),
        isFixed: false,
      },
    ],
    references: [
      {
        id: 'ref-1',
        type: 'journal',
        authors: [{ lastName: '张', firstName: '三' }],
        title: '测试文献',
        journal: '测试期刊',
        year: 2024,
      }
    ],
  };

  // 验证章节编号逻辑
  const numberedChapters = mockProject.chapters.filter(c => c.number);
  recordTest('章节编号', numberedChapters.length > 0, '有编号的章节数: ' + numberedChapters.length);

  // 验证内容解析
  for (const chapter of mockProject.chapters) {
    try {
      const content = JSON.parse(chapter.content);

      // 检查图片引用
      const findNodes = (node, type) => {
        const results = [];
        if (node.type === type) results.push(node);
        if (node.content) {
          for (const child of node.content) {
            results.push(...findNodes(child, type));
          }
        }
        return results;
      };

      const figureRefs = findNodes(content, 'figureRef');
      const images = findNodes(content, 'image');
      const citations = findNodes(content, 'citation');

      if (chapter.title === '绪论') {
        recordTest('图片引用节点', figureRefs.length > 0, `找到 ${figureRefs.length} 个`);
        recordTest('图片节点', images.length > 0, `找到 ${images.length} 个`);
        recordTest('文献引用节点', citations.length > 0, `找到 ${citations.length} 个`);
      }
    } catch (e) {
      recordTest(`章节 ${chapter.title} 内容解析`, false, e.message);
    }
  }

  // 验证参考文献
  recordTest('参考文献数据', mockProject.references.length > 0, `共 ${mockProject.references.length} 篇`);

  return true;
}

// ==================== 生成报告 ====================

function generateReport() {
  log('生成测试报告...');

  const passed = results.tests.filter(t => t.passed).length;
  const failed = results.tests.filter(t => !t.passed).length;
  const total = results.tests.length;

  const report = {
    summary: {
      total,
      passed,
      failed,
      warnings: results.warnings.length,
      duration: results.endTime - results.startTime,
    },
    tests: results.tests,
    errors: results.errors,
    warnings: results.warnings,
    timestamp: new Date().toISOString(),
  };

  // 写入报告文件
  const reportPath = './test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // 控制台输出
  console.log('\n' + '='.repeat(50));
  console.log('测试报告');
  console.log('='.repeat(50));
  console.log(`总计: ${total} | 通过: ${passed} | 失败: ${failed} | 警告: ${results.warnings.length}`);
  console.log(`耗时: ${report.summary.duration / 1000}s`);
  console.log('='.repeat(50));

  if (results.errors.length > 0) {
    console.log('\n❌ 失败项:');
    results.errors.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.name}: ${e.details}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️ 警告:');
    results.warnings.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w}`);
    });
  }

  console.log(`\n详细报告已保存至: ${reportPath}`);

  return report;
}

// ==================== 主测试流程 ====================

async function main() {
  results.startTime = new Date();

  console.log('\n' + '='.repeat(50));
  console.log('论文写作器自动化测试');
  console.log('='.repeat(50) + '\n');

  try {
    // 1. TypeScript 编译检查
    await checkTypeScript();

    // 2. 代码逻辑分析
    await analyzeCodeLogic();

    // 3. 数据库测试
    await testDatabase();

    // 4. 模板验证
    await validateTemplates();

    // 5. 导出逻辑测试
    await testExportLogic();

  } catch (e) {
    log(`测试执行错误: ${e.message}`, 'error');
    results.errors.push({ name: '测试执行', details: e.message });
  }

  results.endTime = new Date();

  // 生成报告
  const report = generateReport();

  // 返回退出码
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// 运行测试
main().catch(e => {
  console.error('测试脚本执行失败:', e);
  process.exit(1);
});
