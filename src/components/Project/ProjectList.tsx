import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { FiPlus, FiFolder, FiTrash2, FiClock, FiDownload, FiFileText } from 'react-icons/fi';
import { api } from '../../services/api';
// @ts-ignore
import exampleProject from '../../../templates/example-project.json';

interface ExampleDocument {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface ProjectListProps {
  onClose: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onClose }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showExamplesDialog, setShowExamplesDialog] = useState(false);
  const [exampleDocuments, setExampleDocuments] = useState<ExampleDocument[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const { loadProject, createProject } = useProjectStore();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const allProjects = await useProjectStore.getState().loadAllProjects();
    setProjects(allProjects);
    setIsLoading(false);
  };

  const handleLoadProject = async (projectId: string) => {
    await loadProject(projectId);
    onClose();
  };

  const handleDeleteProject = async (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('确定要删除这个项目吗?此操作不可恢复。')) {
      await api.deleteProject(projectId);
      await loadProjects();
    }
  };

  const handleCreateNewProject = async () => {
    setShowNewProjectDialog(true);
  };

  const confirmCreateProject = async () => {
    if (newProjectName.trim()) {
      await createProject(newProjectName.trim(), 'shengda');
      onClose();
    }
  };

  const handleImportExample = async () => {
    if (confirm('确定要导入示例论文项目吗？')) {
      await useProjectStore.getState().importProject(exampleProject);
      onClose();
    }
  };

  const handleShowExamples = async () => {
    // 扫描示例文档
    console.log('handleShowExamples called');
    console.log('window.electronAPI:', window.electronAPI);
    if (window.electronAPI?.scanExampleDocuments) {
      console.log('Calling scanExampleDocuments...');
      const result = await window.electronAPI.scanExampleDocuments();
      console.log('Scan result:', result);
      if (result.success && result.data) {
        console.log('Found examples:', result.data.length, result.data);
        setExampleDocuments(result.data);
      } else {
        alert('扫描失败: ' + JSON.stringify(result));
      }
    } else {
      alert('scanExampleDocuments API 不可用，请检查electronAPI是否存在');
    }
    setShowExamplesDialog(true);
  };

  const handleImportExampleDoc = async (doc: ExampleDocument) => {
    if (doc.name.endsWith('.json')) {
      // JSON格式 - 通过electron读取文件
      try {
        const result = await window.electronAPI.readExampleDocument(doc.path);
        if (result.success && result.data) {
          const projectData = JSON.parse(result.data);
          await useProjectStore.getState().importProject(projectData);
          onClose();
        } else {
          alert('读取文件失败: ' + (result.error || '未知错误'));
        }
      } catch (error) {
        alert('导入失败: ' + (error as Error).message);
      }
    } else {
      // Word文档需要先转换
      alert('Word文档导入功能开发中，目前仅支持JSON格式的示例项目');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog project-list-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>我的论文项目</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content">
          {isLoading ? (
            <div className="loading">加载中...</div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <FiFolder size={48} />
              <p>还没有论文项目</p>
              <div className="empty-actions">
                <button className="primary-btn" onClick={handleCreateNewProject}>
                  <FiPlus /> 创建第一个项目
                </button>
                <button className="secondary-btn" onClick={handleShowExamples}>
                  <FiFileText /> 示例文档
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="project-actions">
                <button className="primary-btn" onClick={handleCreateNewProject}>
                  <FiPlus /> 新建论文
                </button>
                <button className="secondary-btn" onClick={handleShowExamples}>
                  <FiFileText /> 示例文档
                </button>
                <button className="secondary-btn" onClick={handleImportExample}>
                  <FiDownload /> 导入内置示例
                </button>
              </div>

              <div className="project-list">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="project-item"
                    onClick={() => handleLoadProject(project.id)}
                  >
                    <div className="project-icon">
                      <FiFolder />
                    </div>
                    <div className="project-info">
                      <h4>{project.name}</h4>
                      <div className="project-meta">
                        <span className="project-date">
                          <FiClock /> {formatDate(project.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      title="删除项目"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 新建项目对话框 */}
        {showNewProjectDialog && (
          <div className="dialog-overlay" onClick={() => setShowNewProjectDialog(false)}>
            <div className="dialog new-project-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-header">
                <h3>新建论文项目</h3>
                <button className="close-btn" onClick={() => setShowNewProjectDialog(false)}>×</button>
              </div>
              <div className="dialog-content">
                <label>论文标题</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="请输入论文标题"
                  autoFocus
                />
              </div>
              <div className="dialog-footer">
                <button className="secondary-btn" onClick={() => setShowNewProjectDialog(false)}>取消</button>
                <button className="primary-btn" onClick={confirmCreateProject}>创建</button>
              </div>
            </div>
          </div>
        )}

        {/* 示例文档对话框 */}
        {showExamplesDialog && (
          <div className="dialog-overlay" onClick={() => setShowExamplesDialog(false)}>
            <div className="dialog examples-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-header">
                <h3>示例文档</h3>
                <button className="close-btn" onClick={() => setShowExamplesDialog(false)}>×</button>
              </div>
              <div className="dialog-content">
                {exampleDocuments.length === 0 ? (
                  <div className="empty-examples">
                    <FiFileText size={48} />
                    <p>暂无示例文档</p>
                    <p className="hint">请将 .json 或 .docx 文件放入"示例文档"文件夹</p>
                  </div>
                ) : (
                  <div className="example-list">
                    {exampleDocuments.map((doc) => (
                      <div
                        key={doc.path}
                        className="example-item"
                        onClick={() => handleImportExampleDoc(doc)}
                      >
                        <div className="example-icon">
                          <FiFileText />
                        </div>
                        <div className="example-info">
                          <h4>{doc.name}</h4>
                          <div className="example-meta">
                            <span>{formatFileSize(doc.size)}</span>
                            <span>{new Date(doc.modified).toLocaleDateString('zh-CN')}</span>
                          </div>
                        </div>
                        <button className="import-btn">
                          <FiDownload /> 导入
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .project-list-dialog {
          width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .dialog-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          color: #9ca3af;
        }

        .close-btn:hover {
          color: #374151;
        }

        .dialog-content {
          padding: 20px;
          overflow-y: auto;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #9ca3af;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
        }

        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state p {
          margin: 0 0 20px;
          font-size: 16px;
        }

        .empty-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .project-actions {
          margin-bottom: 16px;
        }

        .primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .primary-btn:hover {
          background: #2563eb;
        }

        .secondary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-left: 12px;
        }

        .secondary-btn:hover {
          background: #e5e7eb;
        }

        .project-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .project-item {
          display: flex;
          align-items: center;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .project-item:hover {
          border-color: #3b82f6;
          background: #f9fafb;
        }

        .project-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #3b82f6;
          border-radius: 8px;
          margin-right: 16px;
        }

        .project-icon svg {
          width: 20px;
          height: 20px;
        }

        .project-info {
          flex: 1;
        }

        .project-info h4 {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 500;
          color: #111827;
        }

        .project-meta {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: #6b7280;
        }

        .project-date {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .delete-btn {
          background: none;
          border: none;
          padding: 8px;
          color: #9ca3af;
          cursor: pointer;
          border-radius: 4px;
        }

        .delete-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .new-project-dialog {
          width: 400px;
        }

        .new-project-dialog .dialog-content {
          padding: 20px;
        }

        .new-project-dialog label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .new-project-dialog input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .new-project-dialog input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
        }

        .examples-dialog {
          width: 500px;
          max-height: 70vh;
        }

        .empty-examples {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }

        .empty-examples svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-examples p {
          margin: 0 0 8px;
        }

        .empty-examples .hint {
          font-size: 13px;
          color: #9ca3af;
        }

        .example-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .example-item {
          display: flex;
          align-items: center;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .example-item:hover {
          border-color: #3b82f6;
          background: #f9fafb;
        }

        .example-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fef3c7;
          color: #d97706;
          border-radius: 8px;
          margin-right: 16px;
        }

        .example-icon svg {
          width: 20px;
          height: 20px;
        }

        .example-info {
          flex: 1;
        }

        .example-info h4 {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .example-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #6b7280;
        }

        .import-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }

        .import-btn:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};
