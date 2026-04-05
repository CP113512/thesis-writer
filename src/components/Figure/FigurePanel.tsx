import React, { useState, useEffect, useMemo } from 'react';
import { FiImage, FiGrid, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import { useProjectStore } from '../../stores/projectStore';
import './FigurePanel.css';

interface FigureItem {
  id: string;
  type: 'figure' | 'table';
  chapterId: string;
  chapterTitle: string;
  chapterNumber: string;
  alt: string;  // 图片或表格的名称/标题
  number: string;  // 计算出的编号，如 "1-1"
  order: number;  // 在章节内的顺序
}

interface FigurePanelProps {
  onClose: () => void;
}

export const FigurePanel: React.FC<FigurePanelProps> = ({ onClose }) => {
  const { currentProject, updateChapterContent } = useProjectStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // 从所有章节中提取图片和表格
  const figures = useMemo(() => {
    if (!currentProject) return [];

    const items: FigureItem[] = [];
    const sortedChapters = [...currentProject.chapters].sort((a, b) => a.orderIndex - b.orderIndex);

    sortedChapters.forEach(chapter => {
      try {
        const content = JSON.parse(chapter.content || '{"type":"doc","content":[]}');
        let figureOrder = 0;
        let tableOrder = 0;

        const traverse = (node: any) => {
          if (node.type === 'image' && node.attrs?.alt) {
            figureOrder++;
            const number = chapter.number ? `${chapter.number}-${figureOrder}` : String(figureOrder);
            items.push({
              id: `${chapter.id}-figure-${figureOrder}`,
              type: 'figure',
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              chapterNumber: chapter.number,
              alt: node.attrs.alt,
              number,
              order: figureOrder,
            });
          }
          if (node.type === 'tableCaption' && node.attrs?.caption) {
            tableOrder++;
            const number = chapter.number ? `${chapter.number}-${tableOrder}` : String(tableOrder);
            items.push({
              id: `${chapter.id}-table-${tableOrder}`,
              type: 'table',
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              chapterNumber: chapter.number,
              alt: node.attrs.caption,
              number,
              order: tableOrder,
            });
          }
          if (node.content && Array.isArray(node.content)) {
            node.content.forEach(traverse);
          }
        };

        traverse(content);
      } catch (e) {
        // 解析失败，跳过
      }
    });

    return items;
  }, [currentProject]);

  // 开始编辑
  const handleStartEdit = (item: FigureItem) => {
    setEditingId(item.id);
    setEditingValue(item.alt);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  // 保存编辑
  const handleSaveEdit = (item: FigureItem) => {
    if (!editingValue.trim() || !currentProject) return;

    const chapter = currentProject.chapters.find(ch => ch.id === item.chapterId);
    if (!chapter) return;

    try {
      const content = JSON.parse(chapter.content || '{"type":"doc","content":[]}');
      let targetOrder = 0;

      const updateNode = (node: any): any => {
        if (item.type === 'figure' && node.type === 'image' && node.attrs?.alt) {
          targetOrder++;
          if (targetOrder === item.order) {
            return { ...node, attrs: { ...node.attrs, alt: editingValue.trim() } };
          }
        }
        if (item.type === 'table' && node.type === 'tableCaption' && node.attrs?.caption) {
          targetOrder++;
          if (targetOrder === item.order) {
            return { ...node, attrs: { ...node.attrs, caption: editingValue.trim() } };
          }
        }
        if (node.content && Array.isArray(node.content)) {
          return { ...node, content: node.content.map(updateNode) };
        }
        return node;
      };

      const updatedContent = updateNode(content);
      updateChapterContent(chapter.id, JSON.stringify(updatedContent));
    } catch (e) {
      console.error('Failed to update figure/table caption:', e);
    }

    setEditingId(null);
    setEditingValue('');
  };

  // 分组：按章节分组
  const groupedFigures = useMemo(() => {
    const groups: { chapterId: string; chapterTitle: string; chapterNumber: string; items: FigureItem[] }[] = [];

    figures.forEach(item => {
      let group = groups.find(g => g.chapterId === item.chapterId);
      if (!group) {
        group = {
          chapterId: item.chapterId,
          chapterTitle: item.chapterTitle,
          chapterNumber: item.chapterNumber,
          items: [],
        };
        groups.push(group);
      }
      group.items.push(item);
    });

    return groups;
  }, [figures]);

  // 统计
  const figureCount = figures.filter(f => f.type === 'figure').length;
  const tableCount = figures.filter(f => f.type === 'table').length;

  return (
    <div className="figure-panel-overlay" onClick={onClose}>
      <div className="figure-panel" onClick={(e) => e.stopPropagation()}>
        <div className="figure-panel-header">
          <h3>图表管理</h3>
          <div className="figure-stats">
            <span><FiImage /> 图片 {figureCount}</span>
            <span><FiGrid /> 表格 {tableCount}</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="figure-panel-content">
          {groupedFigures.length === 0 ? (
            <div className="empty-state">
              <p>暂无图表</p>
              <p className="hint">在编辑器中插入图片或表格后，可以在这里管理它们的名称</p>
            </div>
          ) : (
            groupedFigures.map(group => (
              <div key={group.chapterId} className="figure-group">
                <div className="group-header">
                  <span className="chapter-number">
                    {group.chapterNumber || ''}
                  </span>
                  <span className="chapter-title">{group.chapterTitle}</span>
                </div>
                <div className="group-items">
                  {group.items.map(item => (
                    <div key={item.id} className={`figure-item ${item.type}`}>
                      <div className="item-icon">
                        {item.type === 'figure' ? <FiImage /> : <FiGrid />}
                      </div>
                      <div className="item-info">
                        <span className="item-number">
                          {item.type === 'figure' ? '图' : '表'}{item.number}
                        </span>
                        {editingId === item.id ? (
                          <div className="edit-input-wrapper">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                            />
                            <button className="btn-save" onClick={() => handleSaveEdit(item)}>
                              <FiCheck />
                            </button>
                            <button className="btn-cancel" onClick={handleCancelEdit}>
                              <FiX />
                            </button>
                          </div>
                        ) : (
                          <span className="item-caption">{item.alt}</span>
                        )}
                      </div>
                      {editingId !== item.id && (
                        <button
                          className="btn-edit"
                          onClick={() => handleStartEdit(item)}
                          title="编辑名称"
                        >
                          <FiEdit2 />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
