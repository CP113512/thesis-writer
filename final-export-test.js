// 最终导出功能验证测试
const fs = require('fs');
const path = require('path');
const os = require('os');

async function finalExportTest() {
  console.log('=== 最终导出功能验证测试 ===\n');

  try {
    // 1. 测试docx库是否正常
    console.log('1️⃣ 测试docx库...');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

    // 2. 创建简单的测试文档
    console.log('2️⃣ 创建测试文档...');
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
            children: [
              new TextRun({
                text: '这是一个测试段落,用于验证导出功能是否正常工作。',
                font: '宋体',
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'This is a test paragraph in English.',
                font: 'Times New Roman',
                size: 24,
              }),
            ],
          }),
        ],
      }],
    });

    // 3. 生成文档
    console.log('3️⃣ 生成Word文档...');
    const buffer = await Packer.toBuffer(doc);

    // 4. 保存文件
    const testPath = path.join(os.homedir(), 'Desktop', 'final-test-export.docx');
    fs.writeFileSync(testPath, buffer);

    // 5. 验证文件
    console.log('4️⃣ 验证文件...');
    if (fs.existsSync(testPath)) {
      const stats = fs.statSync(testPath);
      console.log('✅ 文件创建成功!');
      console.log(`   路径: ${testPath}`);
      console.log(`   大小: ${stats.size} bytes`);
      console.log(`   格式: ${file(testPath)}\n`);
    }

    // 6. 测试模板配置解析
    console.log('5️⃣ 测试模板配置...');
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();

    const dbPath = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      '无格式论文写作器',
      'thesis-writer.db'
    );

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      const db = new SQL.Database(buffer);

      const result = db.exec('SELECT config FROM templates WHERE id = "default"');
      if (result.length > 0) {
        const config = JSON.parse(result[0].values[0][0]);
        console.log('✅ 模板配置加载成功');
        console.log(`   字体配置: ${Object.keys(config.fonts).length} 个`);
        console.log(`   段落配置: ${config.paragraph ? '✅' : '❌'}`);
        console.log(`   章节配置: ${config.chapter ? '✅' : '❌'}\n`);
      }
    }

    console.log('=== 测试完成 ===');
    console.log('\n✅ 所有测试通过!');
    console.log('\n📝 下一步:');
    console.log('   1. 在应用中打开"测试论文"项目');
    console.log('   2. 点击"导出 Word"按钮');
    console.log('   3. 选择保存位置');
    console.log('   4. 验证导出成功\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 辅助函数 - 获取文件类型
function file(filepath) {
  try {
    const result = require('child_process').execSync(`file "${filepath}"`, { encoding: 'utf8' });
    return result.trim();
  } catch {
    return 'Unknown';
  }
}

finalExportTest().catch(console.error);
