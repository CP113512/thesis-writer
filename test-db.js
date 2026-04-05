const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testDatabase() {
  const SQL = await initSqlJs();

  const dbPath = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    '无格式论文写作器',
    'thesis-writer.db'
  );

  if (!fs.existsSync(dbPath)) {
    console.log('数据库文件不存在:', dbPath);
    return;
  }

  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log('=== 数据库测试 ===\n');

  // 查询模板
  const templates = db.exec('SELECT id, name, school FROM templates');
  console.log('模板数量:', templates.length > 0 ? templates[0].values.length : 0);
  if (templates.length > 0) {
    console.log('模板列表:', templates[0].values);
  }

  // 查询项目
  const projects = db.exec('SELECT id, name, created_at FROM projects');
  console.log('\n项目数量:', projects.length > 0 ? projects[0].values.length : 0);
  if (projects.length > 0) {
    console.log('项目列表:', projects[0].values);
  }

  // 查询章节
  const chapters = db.exec('SELECT COUNT(*) FROM chapters');
  console.log('\n章节数量:', chapters.length > 0 ? chapters[0].values[0][0] : 0);

  // 查询参考文献
  const references = db.exec('SELECT COUNT(*) FROM "references"');
  console.log('参考文献数量:', references.length > 0 ? references[0].values[0][0] : 0);

  console.log('\n=== 测试完成 ===');
}

testDatabase().catch(console.error);
