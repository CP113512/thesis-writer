import { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Editor } from './components/Editor/Editor';
import { Preview } from './components/Preview/Preview';
import { TemplateSettings } from './components/Template/TemplateSettings';
import { ExportDialog } from './components/Export/ExportDialog';
import { ProjectList } from './components/Project/ProjectList';
import { useProjectStore } from './stores/projectStore';
import { initializeDefaultTemplates } from './services/initTemplates';
import { FiSave, FiDownload, FiFileText, FiSettings, FiFolder, FiEye, FiEyeOff } from 'react-icons/fi';
import './App.css';

// 测试论文数据
const TEST_PROJECT = {
  id: 'test-project-001',
  name: '基于深度学习的图像识别研究',
  templateId: 'shengda',
  createdAt: new Date(),
  updatedAt: new Date(),
  filePath: '',
  template: {
    id: 'shengda',
    name: '升达',
    school: '升达大学',
    isBuiltin: true,
    config: {
      page: {
        size: 'A4',
        margin: { top: 2.5, bottom: 2.5, left: 3, right: 2.5 },
        headerHeight: 1.5,
        footerHeight: 1.5,
      },
      fonts: {
        title: { family: '黑体', size: 22, bold: true },
        heading1: { family: '黑体', size: 16, bold: true },
        heading2: { family: '黑体', size: 14, bold: true },
        heading3: { family: '黑体', size: 12, bold: true },
        body: { family: '宋体', size: 12 },
        caption: { family: '宋体', size: 10.5 },
      },
      chapter: {
        numbering: '第N章',
        separator: ' ',
      },
      figure: {
        numbering: '{chapter}-{number}',
        captionFormat: '图{number} {caption}',
      },
      table: {
        numbering: '{chapter}-{number}',
        captionFormat: '表{number} {caption}',
      },
      reference: {
        style: 'GB/T-7714',
      },
    },
  },
  chapters: [
    {
      id: 'ch1',
      projectId: 'test-project-001',
      parentId: null,
      title: '摘要',
      orderIndex: 0,
      level: 1,
      number: '',
      isFixed: true,
      children: [],
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '摘要' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '本文研究了基于深度学习的图像识别技术，提出了一种改进的卷积神经网络模型。该模型通过引入注意力机制和多尺度特征融合，有效提高了图像识别的准确率。实验结果表明，在ImageNet数据集上，本文方法的识别准确率达到95.2%，相比传统方法提升了3.5个百分点。' }] }
        ]
      }),
    },
    {
      id: 'ch2',
      projectId: 'test-project-001',
      parentId: null,
      title: 'Abstract',
      orderIndex: 1,
      level: 1,
      number: '',
      isFixed: true,
      children: [],
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Abstract' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'This paper studies image recognition technology based on deep learning. Experimental results show that the recognition accuracy reaches 95.2% on the ImageNet dataset.' }] }
        ]
      }),
    },
    {
      id: 'ch3',
      projectId: 'test-project-001',
      parentId: null,
      title: '第1章 绪论',
      orderIndex: 2,
      level: 1,
      number: '1',
      isFixed: false,
      children: [],
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '第1章 绪论' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1.1 研究背景' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '随着人工智能技术的快速发展，图像识别已经成为计算机视觉领域的研究热点。深度学习技术的突破为图像识别带来了新的机遇，卷积神经网络（CNN）在图像分类、目标检测等任务中取得了显著成果[1]。' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1.2 研究意义' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '图像识别技术在自动驾驶、医疗诊断、安防监控等领域有着广泛的应用前景。提高图像识别的准确率和效率，对于推动这些领域的发展具有重要意义。' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1.3 研究内容' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '本文主要研究内容包括：（1）分析现有图像识别方法的优缺点；（2）设计改进的卷积神经网络模型；（3）在多个数据集上验证方法的有效性。' }] }
        ]
      }),
    },
    {
      id: 'ch4',
      projectId: 'test-project-001',
      parentId: null,
      title: '第2章 相关技术',
      orderIndex: 3,
      level: 1,
      number: '2',
      isFixed: false,
      children: [],
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '第2章 相关技术' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2.1 卷积神经网络' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '卷积神经网络是一种专门用于处理网格状数据的深度学习模型。其核心组件包括卷积层、池化层和全连接层[2]。' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2.2 注意力机制' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '注意力机制能够让模型关注图像中的重要区域，忽略无关信息[3]。' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2.3 实验数据对比' }] },
          { type: 'table', content: [
            { type: 'tableRow', content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '方法' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '准确率' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '参数量' }] }] }
            ]},
            { type: 'tableRow', content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'VGG-16' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '89.5%' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '138M' }] }] }
            ]},
            { type: 'tableRow', content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '本文方法' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '95.2%' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '28.3M' }] }] }
            ]}
          ]},
          { type: 'paragraph', content: [{ type: 'text', text: '表2-1 不同方法的性能对比' }] }
        ]
      }),
    },
    {
      id: 'ch5',
      projectId: 'test-project-001',
      parentId: null,
      title: '结论',
      orderIndex: 4,
      level: 1,
      number: '',
      isFixed: true,
      children: [],
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '结论' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '本文提出了一种基于深度学习的图像识别方法，有效提高了图像识别的准确率。' }] }
        ]
      }),
    },
    {
      id: 'ch6',
      projectId: 'test-project-001',
      parentId: null,
      title: '参考文献',
      orderIndex: 5,
      level: 1,
      number: '',
      isFixed: true,
      children: [],
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '参考文献' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '[1] LeCun Y, Bengio Y, Hinton G. Deep learning[J]. Nature, 2015.' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '[2] He K, et al. Deep residual learning for image recognition[C]. CVPR, 2016.' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '[3] Hu J, et al. Squeeze-and-excitation networks[C]. CVPR, 2018.' }] }
        ]
      }),
    },
    {
      id: 'ch7',
      projectId: 'test-project-001',
      parentId: null,
      title: '致谢',
      orderIndex: 6,
      level: 1,
      number: '',
      isFixed: true,
      children: [],
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '致谢' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '感谢导师的悉心指导。' }] }
        ]
      }),
    },
  ],
  references: [
    { id: 'ref1', projectId: 'test-project-001', type: 'journal', key: 'lecun2015', authors: [{ lastName: 'LeCun', firstName: 'Y.' }], title: 'Deep learning', journal: 'Nature', year: 2015 },
    { id: 'ref2', projectId: 'test-project-001', type: 'conference', key: 'he2016', authors: [{ lastName: 'He', firstName: 'K.' }], title: 'Deep residual learning', journal: 'CVPR', year: 2016 },
    { id: 'ref3', projectId: 'test-project-001', type: 'conference', key: 'hu2018', authors: [{ lastName: 'Hu', firstName: 'J.' }], title: 'SE-Net', journal: 'CVPR', year: 2018 },
  ],
};

function App() {
  const [showNewChapterDialog, setShowNewChapterDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(300);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterLevel, setNewChapterLevel] = useState<1 | 2 | 3>(1);
  const [newProjectName, setNewProjectName] = useState('');

  const {
    currentProject,
    currentChapterId,
    createProject,
    saveProject,
    hasUnsavedChanges,
    isSaving,
    addChapter,
    setCurrentProject,
    initializeDatabase,
    enableAutoSave,
  } = useProjectStore();

  // 初始化数据库
  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await initializeDefaultTemplates();
      enableAutoSave(); // 启用自动保存
    };
    init();
  }, [initializeDatabase, enableAutoSave]);

  const handleNewProject = async () => {
    setNewProjectName('');
    setShowNewProjectDialog(true);
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      await createProject(newProjectName.trim(), 'shengda');
      setShowNewProjectDialog(false);
      setNewProjectName('');
    }
  };

  const handleSave = () => {
    saveProject();
  };

  const handleNewChapter = () => {
    setNewChapterTitle('');
    // 默认添加一级标题
    setNewChapterLevel(1);
    setShowNewChapterDialog(true);
  };

  const handleCreateChapter = () => {
    if (newChapterTitle.trim()) {
      addChapter(null, newChapterTitle.trim(), newChapterLevel, currentChapterId || undefined);
      setNewChapterTitle('');
      setShowNewChapterDialog(false);
    }
  };

  // 处理添加子章节
  const handleNewSubChapter = (parentId: string, level: 2 | 3, afterId: string) => {
    // 生成默认标题
    const defaultTitles: Record<number, string> = {
      2: '新小节',
      3: '新要点',
    };
    addChapter(parentId, defaultTitles[level] || '新章节', level, afterId);
  };

  const handleLoadTestProject = () => {
    setCurrentProject(TEST_PROJECT as any);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="app-title">论文写作器</span>
        </div>
        <div className="header-center">
          {!currentProject ? (
            <>
              <button className="header-btn primary" onClick={handleNewProject}>
                新建论文
              </button>
              <button className="header-btn" onClick={() => setShowProjectList(true)}>
                <FiFolder /> 打开项目
              </button>
              <button className="header-btn" onClick={handleLoadTestProject}>
                <FiFileText /> 加载示例论文
              </button>
            </>
          ) : (
            <>
              <button className="header-btn" onClick={handleSave} disabled={!hasUnsavedChanges}>
                <FiSave /> 保存
              </button>
              <button className="header-btn" onClick={() => setShowTemplateSettings(true)}>
                <FiSettings /> 格式设置
              </button>
              <button
                className={`header-btn ${showPreview ? 'active' : ''}`}
                onClick={() => setShowPreview(!showPreview)}
                title={showPreview ? '隐藏预览' : '显示预览'}
              >
                {showPreview ? <FiEyeOff /> : <FiEye />} 预览
              </button>
              <button className="header-btn primary" onClick={() => setShowExportDialog(true)}>
                <FiDownload /> 导出 Word
              </button>
            </>
          )}
        </div>
        <div className="header-right">
          <span className="status-text">
            {currentProject ? currentProject.name : '未打开项目'}
            {isSaving && <span className="saving-text"> 保存中...</span>}
            {hasUnsavedChanges && !isSaving && <span className="unsaved-dot"> ●</span>}
          </span>
        </div>
      </header>

      <main className="app-main">
        <Sidebar
          onNewChapter={handleNewChapter}
          onNewSubChapter={handleNewSubChapter}
          onOpenProjectList={() => setShowProjectList(true)}
        />
        <Editor />
        {showPreview && (
          <>
            <div
              className="resize-handle"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = previewWidth;

                const handleMouseMove = (e: MouseEvent) => {
                  const diff = startX - e.clientX;
                  const newWidth = Math.max(200, Math.min(600, startWidth + diff));
                  setPreviewWidth(newWidth);
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            <div style={{ width: previewWidth }}>
              <Preview />
            </div>
          </>
        )}
      </main>

      {/* 新建项目对话框 */}
      {showNewProjectDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewProjectDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>新建论文项目</h3>
            <input
              type="text"
              placeholder="输入论文标题"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
            <div className="dialog-actions">
              <button onClick={() => setShowNewProjectDialog(false)}>取消</button>
              <button onClick={handleCreateProject} className="primary">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 新建章节对话框 */}
      {showNewChapterDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewChapterDialog(false)}>
          <div className="dialog new-chapter-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>添加新章节</h3>
            <div className="form-group">
              <label>章节标题</label>
              <input
                type="text"
                placeholder="如：研究方法、实验设计"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateChapter()}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>章节层级</label>
              <div className="level-options">
                <button
                  className={`level-option ${newChapterLevel === 1 ? 'active' : ''}`}
                  onClick={() => setNewChapterLevel(1)}
                >
                  <span className="level-badge">章</span>
                  <span className="level-name">一级标题</span>
                </button>
                <button
                  className={`level-option ${newChapterLevel === 2 ? 'active' : ''}`}
                  onClick={() => setNewChapterLevel(2)}
                >
                  <span className="level-badge">节</span>
                  <span className="level-name">二级标题</span>
                </button>
                <button
                  className={`level-option ${newChapterLevel === 3 ? 'active' : ''}`}
                  onClick={() => setNewChapterLevel(3)}
                >
                  <span className="level-badge">点</span>
                  <span className="level-name">三级标题</span>
                </button>
              </div>
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowNewChapterDialog(false)}>取消</button>
              <button onClick={handleCreateChapter} className="primary" disabled={!newChapterTitle.trim()}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 格式设置对话框 */}
      {showTemplateSettings && (
        <TemplateSettings onClose={() => setShowTemplateSettings(false)} />
      )}

      {/* 导出对话框 */}
      {showExportDialog && (
        <ExportDialog onClose={() => setShowExportDialog(false)} />
      )}

      {/* 项目列表对话框 */}
      {showProjectList && (
        <ProjectList onClose={() => setShowProjectList(false)} />
      )}
    </div>
  );
}

export default App;
