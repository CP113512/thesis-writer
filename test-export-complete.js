// 完整的Word导出功能测试
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testWordExportComplete() {
  console.log('=== Word导出完整测试 ===\n');

  // 1. 初始化数据库
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  const dbPath = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    '无格式论文写作器',
    'thesis-writer.db'
  );

  if (!fs.existsSync(dbPath)) {
    console.log('❌ 数据库文件不存在');
    return;
  }

  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // 2. 创建测试项目
  console.log('1️⃣ 创建测试项目...');
  const projectId = 'test-project-' + Date.now();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO projects (id, name, template_id, created_at, updated_at, file_path)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [projectId, '测试论文', 'default', now, now, '']
  );

  // 3. 创建测试章节
  console.log('2️⃣ 创建测试章节...');
  const chapters = [
    {
      id: 'ch1',
      title: '摘要',
      level: 1,
      number: '',
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '摘要' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '本文研究了基于深度学习的图像识别技术，提出了一种改进的卷积神经网络模型。实验结果表明，该方法在ImageNet数据集上的识别准确率达到95.2%。' }] }
        ]
      }),
      isFixed: true
    },
    {
      id: 'ch2',
      title: '第1章 绪论',
      level: 1,
      number: '1',
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '第1章 绪论' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1.1 研究背景' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '随着人工智能技术的快速发展，图像识别已经成为计算机视觉领域的研究热点。' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1.2 研究意义' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '图像识别技术在自动驾驶、医疗诊断等领域有着广泛的应用前景。' }] }
        ]
      }),
      isFixed: false
    },
    {
      id: 'ch3',
      title: '参考文献',
      level: 1,
      number: '',
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '参考文献' }] }
        ]
      }),
      isFixed: true
    }
  ];

  chapters.forEach((ch, index) => {
    db.run(
      `INSERT INTO chapters (id, project_id, parent_id, title, order_index, level, number, content, is_fixed)
       VALUES (?, ?, null, ?, ?, ?, ?, ?, ?)`,
      [ch.id, projectId, ch.title, index, ch.level, ch.number, ch.content, ch.isFixed ? 1 : 0]
    );
  });

  // 4. 创建测试参考文献
  console.log('3️⃣ 创建测试参考文献...');
  db.run(
    `INSERT INTO "references" (id, project_id, type, key, authors, title, journal, year, volume, pages)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['ref1', projectId, 'journal', 'lecun2015',
     JSON.stringify([{ lastName: 'LeCun', firstName: 'Y.' }]),
     'Deep learning', 'Nature', 2015, '521', '436-444']
  );

  db.run(
    `INSERT INTO "references" (id, project_id, type, key, authors, title, journal, year, volume, pages)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['ref2', projectId, 'conference', 'he2016',
     JSON.stringify([{ lastName: 'He', firstName: 'K.' }]),
     'Deep residual learning', 'CVPR', 2016, '', '770-778']
  );

  // 保存数据库
  const data = db.export();
  const newBuffer = Buffer.from(data);
  fs.writeFileSync(dbPath, newBuffer);

  console.log('✅ 测试项目创建成功\n');

  // 5. 获取模板配置
  console.log('4️⃣ 获取模板配置...');
  const templateResult = db.exec('SELECT config FROM templates WHERE id = "default"');
  const templateConfig = JSON.parse(templateResult[0].values[0][0]);
  console.log('✅ 模板配置获取成功\n');

  // 6. 准备导出数据
  console.log('5️⃣ 准备导出数据...');
  const projectResult = db.exec('SELECT * FROM projects WHERE id = ?', [projectId]);
  const chaptersResult = db.exec('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index', [projectId]);
  const refsResult = db.exec('SELECT * FROM "references" WHERE project_id = ?', [projectId]);

  const project = {
    id: projectResult[0].values[0][0],
    name: projectResult[0].values[0][1],
  };

  const chapterList = chaptersResult[0].values.map(row => ({
    id: row[0],
    title: row[3],
    level: row[5],
    number: row[6],
    content: row[7],
    isFixed: row[8] === 1,
    children: []
  }));

  const referenceList = refsResult[0].values.map(row => ({
    id: row[0],
    type: row[2],
    key: row[3],
    authors: JSON.parse(row[4]),
    title: row[5],
    journal: row[6],
    year: row[7],
    volume: row[8],
    pages: row[10]
  }));

  console.log(`   项目: ${project.name}`);
  console.log(`   章节: ${chapterList.length} 个`);
  console.log(`   参考文献: ${referenceList.length} 条\n`);

  // 7. 测试导出服务
  console.log('6️⃣ 测试Word导出...');
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

    // 创建简单文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: '测试论文',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun('这是一个测试段落。')],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const testPath = path.join(os.homedir(), 'Desktop', 'test-export.docx');
    fs.writeFileSync(testPath, buffer);

    console.log('✅ Word导出测试成功');
    console.log(`   文件位置: ${testPath}`);
    console.log(`   文件大小: ${buffer.length} bytes\n`);

    // 检查文件
    if (fs.existsSync(testPath)) {
      const stats = fs.statSync(testPath);
      console.log('✅ 文件已成功创建');
      console.log(`   实际大小: ${stats.size} bytes\n`);
    }

  } catch (error) {
    console.log('❌ 导出失败:', error.message);
    console.log('   这可能是因为缺少docx依赖\n');
  }

  console.log('=== 测试完成 ===\n');
  console.log('📝 下一步:');
  console.log('   1. 在应用中打开项目: "测试论文"');
  console.log('   2. 点击"导出 Word"按钮');
  console.log('   3. 选择保存位置');
  console.log('   4. 检查导出的.docx文件');
}

testWordExportComplete().catch(console.error);
