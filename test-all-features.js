/**
 * 论文写作器全功能测试脚本
 *
 * 使用方法：
 * 1. 确保应用已启动（npm run dev）
 * 2. 在浏览器开发者工具的 Console 中运行此脚本
 * 3. 或者使用 Node.js 运行（需要安装依赖）
 */

const TEST_CONFIG = {
  // 测试项目名称
  projectName: '测试论文项目',
  // API 基础路径（如果在浏览器中测试，使用相对路径）
  apiBase: 'http://localhost:5173',
};

// 测试结果收集
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type] || '📝';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    testResults.tests.push({ name: message, status: 'passed' });
    log(message, 'success');
  } else {
    testResults.failed++;
    testResults.tests.push({ name: message, status: 'failed' });
    log(message, 'error');
  }
}

// ==================== 测试工具函数 ====================

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDatabaseInit() {
  log('测试：数据库初始化');
  try {
    await window.electronAPI.dbInitialize();
    assert(true, '数据库初始化成功');
    return true;
  } catch (error) {
    assert(false, `数据库初始化失败: ${error.message}`);
    return false;
  }
}

// ==================== 项目管理测试 ====================

async function testCreateProject() {
  log('测试：创建项目');
  try {
    const projectId = 'test-' + Date.now();
    const now = new Date().toISOString();

    await window.electronAPI.dbCreateProject({
      id: projectId,
      name: TEST_CONFIG.projectName,
      templateId: 'default',
      createdAt: now,
      updatedAt: now,
      filePath: '',
    });

    // 验证项目已创建
    const result = await window.electronAPI.dbGetProject(projectId);
    assert(result.success && result.data, '项目创建成功');

    return projectId;
  } catch (error) {
    assert(false, `项目创建失败: ${error.message}`);
    return null;
  }
}

async function testGetAllProjects() {
  log('测试：获取所有项目');
  try {
    const result = await window.electronAPI.dbGetAllProjects();
    assert(result.success, '获取项目列表成功');

    const projects = result.data || [];
    log(`  找到 ${projects.length} 个项目`);

    return projects;
  } catch (error) {
    assert(false, `获取项目列表失败: ${error.message}`);
    return [];
  }
}

async function testDeleteProject(projectId) {
  log('测试：删除项目');
  try {
    await window.electronAPI.dbDeleteProject(projectId);

    // 验证项目已删除
    const result = await window.electronAPI.dbGetProject(projectId);
    assert(!result.data, '项目删除成功');

    return true;
  } catch (error) {
    assert(false, `项目删除失败: ${error.message}`);
    return false;
  }
}

// ==================== 章节管理测试 ====================

async function testCreateChapter(projectId) {
  log('测试：创建章节');
  try {
    const chapterId = 'chapter-' + Date.now();

    await window.electronAPI.dbCreateChapter({
      id: chapterId,
      projectId: projectId,
      parentId: null,
      title: '测试章节',
      orderIndex: 0,
      level: 1,
      number: '1',
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '测试章节' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '这是测试内容。' }] }
        ]
      }),
      children: [],
      isFixed: false,
    });

    // 验证章节已创建
    const result = await window.electronAPI.dbGetChaptersByProject(projectId);
    assert(result.success && result.data?.length > 0, '章节创建成功');

    return chapterId;
  } catch (error) {
    assert(false, `章节创建失败: ${error.message}`);
    return null;
  }
}

async function testUpdateChapter(chapterId) {
  log('测试：更新章节');
  try {
    await window.electronAPI.dbUpdateChapter({
      id: chapterId,
      title: '更新后的章节标题',
    });

    assert(true, '章节更新成功');
    return true;
  } catch (error) {
    assert(false, `章节更新失败: ${error.message}`);
    return false;
  }
}

async function testDeleteChapter(chapterId) {
  log('测试：删除章节');
  try {
    await window.electronAPI.dbDeleteChapter(chapterId);
    assert(true, '章节删除成功');
    return true;
  } catch (error) {
    assert(false, `章节删除失败: ${error.message}`);
    return false;
  }
}

// ==================== 参考文献测试 ====================

async function testCreateReference(projectId) {
  log('测试：创建参考文献');
  try {
    const refId = 'ref-' + Date.now();

    await window.electronAPI.dbCreateReference({
      id: refId,
      projectId: projectId,
      type: 'journal',
      key: 'test2024',
      authors: [
        { firstName: '三', lastName: '张' },
        { firstName: '四', lastName: '李' },
      ],
      title: '测试参考文献标题',
      journal: '测试期刊',
      year: 2024,
      volume: '10',
      issue: '2',
      pages: '1-10',
    });

    // 验证参考文献已创建
    const result = await window.electronAPI.dbGetReferencesByProject(projectId);
    assert(result.success && result.data?.length > 0, '参考文献创建成功');

    return refId;
  } catch (error) {
    assert(false, `参考文献创建失败: ${error.message}`);
    return null;
  }
}

async function testDeleteReference(refId) {
  log('测试：删除参考文献');
  try {
    await window.electronAPI.dbDeleteReference(refId);
    assert(true, '参考文献删除成功');
    return true;
  } catch (error) {
    assert(false, `参考文献删除失败: ${error.message}`);
    return false;
  }
}

// ==================== 模板测试 ====================

async function testCreateTemplate() {
  log('测试：创建模板');
  try {
    const templateId = 'template-' + Date.now();

    await window.electronAPI.dbCreateTemplate({
      id: templateId,
      name: '测试模板',
      school: '测试学校',
      isBuiltin: false,
      config: {
        page: {
          size: 'A4',
          margin: { top: 2.5, bottom: 2.5, left: 3, right: 2.5 },
        },
        fonts: {
          heading1: { family: '黑体', size: 16, bold: true },
          body: { family: '宋体', size: 12 },
        },
        paragraph: {
          lineHeight: 1.5,
          firstLineIndent: 2,
        },
      },
    });

    // 验证模板已创建
    const result = await window.electronAPI.dbGetTemplate(templateId);
    assert(result.success && result.data, '模板创建成功');

    return templateId;
  } catch (error) {
    assert(false, `模板创建失败: ${error.message}`);
    return null;
  }
}

async function testGetAllTemplates() {
  log('测试：获取所有模板');
  try {
    const result = await window.electronAPI.dbGetAllTemplates();
    assert(result.success, '获取模板列表成功');

    const templates = result.data || [];
    log(`  找到 ${templates.length} 个模板`);

    return templates;
  } catch (error) {
    assert(false, `获取模板列表失败: ${error.message}`);
    return [];
  }
}

// ==================== 导入导出测试 ====================

async function testImportProject(importData) {
  log('测试：导入项目');
  try {
    // 模拟导入流程
    const projectId = 'import-' + Date.now();
    const now = new Date().toISOString();

    // 创建项目
    await window.electronAPI.dbCreateProject({
      id: projectId,
      name: importData.name || '导入的项目',
      templateId: importData.templateId || 'default',
      createdAt: now,
      updatedAt: now,
      filePath: '',
    });

    // 创建章节
    for (const chapter of (importData.chapters || [])) {
      await window.electronAPI.dbCreateChapter({
        ...chapter,
        id: 'import-ch-' + Date.now() + Math.random(),
        projectId: projectId,
      });
    }

    // 创建参考文献
    for (const ref of (importData.references || [])) {
      await window.electronAPI.dbCreateReference({
        ...ref,
        id: 'import-ref-' + Date.now() + Math.random(),
        projectId: projectId,
      });
    }

    assert(true, '项目导入成功');
    return projectId;
  } catch (error) {
    assert(false, `项目导入失败: ${error.message}`);
    return null;
  }
}

async function testExportProject(projectId) {
  log('测试：导出项目');
  try {
    // 获取项目数据
    const projectResult = await window.electronAPI.dbGetProject(projectId);
    if (!projectResult.success || !projectResult.data) {
      throw new Error('项目不存在');
    }

    const chaptersResult = await window.electronAPI.dbGetChaptersByProject(projectId);
    const refsResult = await window.electronAPI.dbGetReferencesByProject(projectId);

    const exportData = {
      ...projectResult.data,
      chapters: chaptersResult.data || [],
      references: refsResult.data || [],
    };

    // 验证导出数据完整性
    const hasProject = !!exportData.id;
    const hasChapters = exportData.chapters.length > 0;

    assert(hasProject, '导出数据包含项目信息');
    assert(hasChapters, '导出数据包含章节信息');

    log(`  导出数据: ${JSON.stringify(exportData).length} 字节`);

    return exportData;
  } catch (error) {
    assert(false, `项目导出失败: ${error.message}`);
    return null;
  }
}

// ==================== 格式验证测试 ====================

function validateTemplateConfig(config) {
  log('测试：验证模板配置格式');

  // 验证页面设置
  assert(config.page?.size, '模板包含页面大小设置');
  assert(config.page?.margin, '模板包含页边距设置');

  // 验证字体设置
  assert(config.fonts?.heading1, '模板包含一级标题字体设置');
  assert(config.fonts?.body, '模板包含正文字体设置');

  // 验证段落设置
  assert(config.paragraph?.lineHeight, '模板包含行距设置');

  // 验证编号设置
  assert(config.chapter?.numbering, '模板包含章节编号设置');
  assert(config.figure?.numbering, '模板包含图片编号设置');

  return true;
}

function validateChapterContent(content) {
  log('测试：验证章节内容格式');

  try {
    const parsed = JSON.parse(content);
    assert(parsed.type === 'doc', '内容是有效的文档结构');
    assert(Array.isArray(parsed.content), '内容包含内容数组');

    return true;
  } catch (error) {
    assert(false, `内容格式验证失败: ${error.message}`);
    return false;
  }
}

// ==================== 主测试流程 ====================

async function runAllTests() {
  log('========================================');
  log('开始论文写作器全功能测试');
  log('========================================');

  let testProjectId = null;
  let testChapterId = null;
  let testRefId = null;
  let testTemplateId = null;

  try {
    // 1. 数据库初始化
    await testDatabaseInit();
    await sleep(100);

    // 2. 项目管理测试
    testProjectId = await testCreateProject();
    await sleep(100);

    await testGetAllProjects();
    await sleep(100);

    // 3. 章节管理测试
    if (testProjectId) {
      testChapterId = await testCreateChapter(testProjectId);
      await sleep(100);

      if (testChapterId) {
        await testUpdateChapter(testChapterId);
        await sleep(100);
      }
    }

    // 4. 参考文献测试
    if (testProjectId) {
      testRefId = await testCreateReference(testProjectId);
      await sleep(100);
    }

    // 5. 模板测试
    testTemplateId = await testCreateTemplate();
    await sleep(100);

    await testGetAllTemplates();
    await sleep(100);

    // 6. 导入导出测试
    const importData = {
      name: '测试导入项目',
      templateId: 'default',
      chapters: [
        {
          title: '第一章 绪论',
          level: 1,
          number: '1',
          content: JSON.stringify({
            type: 'doc',
            content: [
              { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '第一章 绪论' }] },
              { type: 'paragraph', content: [{ type: 'text', text: '这是导入的测试内容。' }] }
            ]
          }),
        }
      ],
      references: [
        {
          type: 'journal',
          authors: [{ firstName: '明', lastName: '王' }],
          title: '导入的参考文献',
          journal: '测试期刊',
          year: 2024,
        }
      ],
    };

    const importedProjectId = await testImportProject(importData);
    await sleep(100);

    // 7. 导出测试
    if (testProjectId) {
      const exportData = await testExportProject(testProjectId);
      if (exportData) {
        await sleep(100);

        // 8. 格式验证测试
        validateTemplateConfig(exportData.template?.config || {});

        if (exportData.chapters[0]?.content) {
          validateChapterContent(exportData.chapters[0].content);
        }
      }
    }

    // 9. 清理测试数据
    log('清理测试数据...');

    if (testRefId) {
      await testDeleteReference(testRefId);
      await sleep(50);
    }

    if (testChapterId) {
      await testDeleteChapter(testChapterId);
      await sleep(50);
    }

    if (testProjectId) {
      await testDeleteProject(testProjectId);
      await sleep(50);
    }

    if (importedProjectId) {
      await testDeleteProject(importedProjectId);
      await sleep(50);
    }

  } catch (error) {
    log(`测试过程出错: ${error.message}`, 'error');
  }

  // 输出测试结果
  log('========================================');
  log('测试完成');
  log(`通过: ${testResults.passed} | 失败: ${testResults.failed}`);
  log('========================================');

  // 详细结果
  log('\n详细测试结果:');
  testResults.tests.forEach((test, index) => {
    const status = test.status === 'passed' ? '✅' : '❌';
    log(`  ${index + 1}. ${status} ${test.name}`);
  });

  return testResults;
}

// ==================== 运行测试 ====================

// 如果在浏览器环境中
if (typeof window !== 'undefined' && window.electronAPI) {
  log('检测到浏览器环境，可以直接运行测试');
  // 运行: runAllTests()
} else {
  log('请在 Electron 应用的开发者工具中运行此脚本', 'warn');
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testResults,
  };
}
