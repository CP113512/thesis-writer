import React, { useState, useRef } from 'react';
import { FiImage, FiTrash2 } from 'react-icons/fi';

interface Figure {
  id: string;
  chapterId: string;
  projectId: string;
  type: 'figure' | 'table' | 'equation';
  number: string;
  caption: string;
  path: string;
  content: string;
  position: number;
  width: string;
  createdAt: Date;
}

interface FigureManagerProps {
  projectId: string;
  chapterId: string;
  onInsertFigure: (figure: Figure) => void;
}

export const FigureManager: React.FC<FigureManagerProps> = ({
  projectId,
  chapterId,
  onInsertFigure,
}) => {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [caption, setCaption] = useState('');
  const [figureType, setFigureType] = useState<'figure' | 'table'>('figure');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 这里应该处理文件上传
    // 由于是演示,我们先显示文件名
    setCaption(file.name);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    // 创建图片记录
    const newFigure: Figure = {
      id: `fig-${Date.now()}`,
      chapterId,
      projectId,
      type: figureType,
      number: `${figureType === 'figure' ? '图' : '表'}-${figures.length + 1}`,
      caption,
      path: '', // 实际应该是文件路径
      content: '',
      position: figures.length,
      width: '80%',
      createdAt: new Date(),
    };

    setFigures([...figures, newFigure]);
    setShowUploadDialog(false);
    setCaption('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInsert = (figure: Figure) => {
    onInsertFigure(figure);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个图片吗?')) {
      setFigures(figures.filter((f) => f.id !== id));
    }
  };

  return (
    <div className="figure-manager">
      <div className="figure-manager-header">
        <h4>图表管理</h4>
        <div className="figure-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <FiImage /> 上传图片
          </button>
        </div>
      </div>

      <div className="figure-list">
        {figures.length === 0 ? (
          <p className="empty-text">暂无图片</p>
        ) : (
          figures.map((figure) => (
            <div key={figure.id} className="figure-item">
              <div className="figure-preview">
                {figure.path ? (
                  <img src={figure.path} alt={figure.caption} />
                ) : (
                  <div className="figure-placeholder">
                    <FiImage size={32} />
                  </div>
                )}
              </div>
              <div className="figure-info">
                <span className="figure-number">{figure.number}</span>
                <span className="figure-caption">{figure.caption}</span>
              </div>
              <div className="figure-actions">
                <button onClick={() => handleInsert(figure)} title="插入到文档">
                  插入
                </button>
                <button onClick={() => handleDelete(figure.id)} title="删除">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showUploadDialog && (
        <div className="dialog-overlay" onClick={() => setShowUploadDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>上传图片</h3>
            <div className="form-group">
              <label>类型:</label>
              <select
                value={figureType}
                onChange={(e) => setFigureType(e.target.value as 'figure' | 'table')}
              >
                <option value="figure">图片</option>
                <option value="table">表格</option>
              </select>
            </div>
            <div className="form-group">
              <label>标题:</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="输入图片标题"
              />
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowUploadDialog(false)}>取消</button>
              <button className="primary" onClick={handleUpload}>
                上传
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .figure-manager {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .figure-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .figure-manager-header h4 {
          margin: 0;
          font-size: 16px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .figure-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-text {
          text-align: center;
          color: #9ca3af;
          padding: 20px;
        }

        .figure-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          gap: 12px;
        }

        .figure-preview {
          width: 80px;
          height: 60px;
          border-radius: 4px;
          overflow: hidden;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .figure-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .figure-placeholder {
          color: #9ca3af;
        }

        .figure-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .figure-number {
          font-size: 12px;
          color: #6b7280;
        }

        .figure-caption {
          font-size: 14px;
          color: #111827;
        }

        .figure-actions {
          display: flex;
          gap: 8px;
        }

        .figure-actions button {
          padding: 6px 12px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }

        .figure-actions button:hover {
          background: #f9fafb;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }

        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .dialog-actions button {
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
        }

        .dialog-actions button.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
      `}</style>
    </div>
  );
};
