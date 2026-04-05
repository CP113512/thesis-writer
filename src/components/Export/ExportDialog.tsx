import React, { useState } from 'react';
import { FiX, FiDownload, FiFileText, FiCheck } from 'react-icons/fi';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../services/api';
import './ExportDialog.css';

interface ExportDialogProps {
  onClose: () => void;
}

// 获取错误消息
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '未知错误';
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ onClose }) => {
  const { currentProject } = useProjectStore();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportPath, setExportPath] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!currentProject) return;

    setExporting(true);
    setError(null);

    try {
      // 获取模板配置
      let templateConfig = currentProject.template?.config;

      // 如果当前项目没有模板配置，尝试从数据库加载
      if (!templateConfig && currentProject.templateId) {
        const template = await api.getTemplate(currentProject.templateId);
        templateConfig = template?.config;
      }

      if (!templateConfig) {
        throw new Error('模板配置不存在，无法导出');
      }

      // 调用导出API
      const savedPath = await api.exportToWord({
        projectName: currentProject.name,
        chapters: currentProject.chapters,
        references: currentProject.references || [],
        templateConfig: templateConfig,
      });

      setExporting(false);
      setExported(true);
      setExportPath(savedPath);
    } catch (err) {
      setExporting(false);
      setError(getErrorMessage(err));
    }
  };

  if (!currentProject) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-header">
          <h3>导出 Word 文档</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="export-content">
          {!exported ? (
            <>
              {error && (
                <div className="export-error">
                  <p>导出失败：{error}</p>
                </div>
              )}

              <div className="export-preview">
                <FiFileText size={48} />
                <div className="preview-info">
                  <h4>{currentProject.name}.docx</h4>
                  <p>{currentProject.chapters.length} 个章节</p>
                  <p>{currentProject.references?.length || 0} 条参考文献</p>
                </div>
              </div>

              <div className="export-options">
                <h4>导出选项</h4>
                <label className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>自动生成目录</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>自动编号图表</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>自动排序参考文献</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>插入页眉页脚</span>
                </label>
              </div>

              <div className="export-note">
                <p>导出后的文档将完全符合模板格式要求。</p>
                <p>如需调整格式，请点击「格式设置」按钮。</p>
              </div>
            </>
          ) : (
            <div className="export-success">
              <FiCheck size={48} className="success-icon" />
              <h4>导出成功！</h4>
              <p className="export-path">{exportPath}</p>
              <p>文档已保存到上述位置</p>
            </div>
          )}
        </div>

        <div className="export-footer">
          {!exported ? (
            <>
              <button onClick={onClose}>取消</button>
              <button
                className="primary"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? '导出中...' : (
                  <><FiDownload /> 导出文档</>
                )}
              </button>
            </>
          ) : (
            <button className="primary" onClick={onClose}>完成</button>
          )}
        </div>
      </div>
    </div>
  );
};
