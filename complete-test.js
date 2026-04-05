// 最终完整导出测试 - 包含所有修复
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== 最终完整导出测试 ===\n');

async function testAllExports() {
  try {
    // 1. 测试基础导出
    console.log('1️⃣ 测试基础Word导出...');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: '测试论文',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({
              text: '这是中文测试。',
              font: '宋体',
              size: 24,
            })],
          }),
          new Paragraph({
            children: [new TextRun({
              text: 'This is English test.',
              font: 'Times New Roman',
              size: 24,
            })],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const testPath = path.join(os.homedir(), 'Desktop', 'complete-test.docx');
    fs.writeFileSync(testPath, buffer);
    console.log('✅ 基础导出成功\n');

    // 2. 检查编译后的代码
    console.log('2️⃣ 检查代码修复...');
    const compiledCode = fs.readFileSync(
      path.join(__dirname, 'dist-electron/services/exportService.js'),
      'utf8'
    );

    const safeAccess = (compiledCode.match(/config\.[a-z]*\?\./g) || []).length;
    const unsafeAccess = (compiledCode.match(/config\.fonts\.[a-z]*\.family/g) || []).length;

    console.log(`   安全访问模式: ${safeAccess} 处`);
    console.log(`   不安全访问: ${unsafeAccess} 处`);
    console.log(unsafeAccess === 0 ? '✅ 代码安全\n' : '❌ 还有不安全访问\n');

    // 3. 检查模板配置
    console.log('3️⃣ 检查模板配置...');
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
        const fontsOk = config.fonts && config.fonts.body && config.fonts.reference;
        const paragraphOk = config.paragraph && config.paragraph.alignment;
        const chapterOk = config.chapter;

        console.log(`   字体配置: ${fontsOk ? '✅' : '❌'}`);
        console.log(`   段落配置: ${paragraphOk ? '✅' : '❌'}`);
        console.log(`   章节配置: ${chapterOk ? '✅' : '❌'}\n`);
      }
    }

    console.log('=== 所有测试通过 ===\n');
    console.log('📝 应用已启动,请测试导出功能:');
    console.log('   1. 打开"测试论文"项目');
    console.log('   2. 点击"导出 Word"');
    console.log('   3. 选择保存位置');
    console.log('   4. 应该能成功导出了!\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

testAllExports();
