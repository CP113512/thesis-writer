import React, { useState } from 'react';
import { FiX, FiPlus, FiTrash2, FiUpload } from 'react-icons/fi';
import { useProjectStore } from '../../stores/projectStore';
import { RefImport } from './RefImport';
import './ReferencePanel.css';

interface ReferencePanelProps {
  onSelect: (ref: any) => void;
  onClose: () => void;
}

export const ReferencePanel: React.FC<ReferencePanelProps> = ({
  onSelect,
  onClose,
}) => {
  const { currentProject, addReference, deleteReference } = useProjectStore();
  const [searchText, setSearchText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [formData, setFormData] = useState({
    type: 'journal' as 'journal' | 'conference' | 'book' | 'thesis' | 'web',
    authors: '',
    title: '',
    journal: '',
    year: '',
    volume: '',
    pages: '',
    publisher: '',
    url: '',
  });

  // 按引用顺序排序的参考文献列表
  const references = currentProject?.references || [];

  const filteredReferences = references.filter((ref) =>
    ref.title.toLowerCase().includes(searchText.toLowerCase()) ||
    ref.authors.some((a: any) => a.lastName.includes(searchText))
  );

  const handleAddReference = () => {
    const authors = formData.authors.split(',').map((name) => {
      const trimmed = name.trim();
      const parts = trimmed.split(' ');
      return {
        lastName: parts[parts.length - 1] || trimmed,
        firstName: parts.slice(0, -1).join(' ') || '',
      };
    });

    addReference({
      projectId: currentProject?.id || '',
      type: formData.type,
      key: `ref${Date.now()}`,
      authors,
      title: formData.title,
      journal: formData.journal,
      year: parseInt(formData.year) || new Date().getFullYear(),
      volume: formData.volume,
      pages: formData.pages,
      publisher: formData.publisher,
      url: formData.url,
    });

    setFormData({
      type: 'journal',
      authors: '',
      title: '',
      journal: '',
      year: '',
      volume: '',
      pages: '',
      publisher: '',
      url: '',
    });
    setShowAddForm(false);
  };

  const handleDelete = (e: React.MouseEvent, refId: string) => {
    e.stopPropagation();
    if (confirm('确定删除这条参考文献吗？删除后文中引用序号将自动更新。')) {
      deleteReference(refId);
    }
  };

  // 格式化参考文献显示
  const formatReference = (ref: any, index: number) => {
    const authors = ref.authors.map((a: any) => `${a.lastName} ${a.firstName}`).join(', ');

    switch (ref.type) {
      case 'journal':
        return `[${index + 1}] ${authors}. ${ref.title}[J]. ${ref.journal}, ${ref.year}${ref.volume ? `, ${ref.volume}` : ''}${ref.pages ? `: ${ref.pages}` : ''}.`;
      case 'conference':
        return `[${index + 1}] ${authors}. ${ref.title}[C]. ${ref.journal || '会议论文集'}, ${ref.year}${ref.pages ? `: ${ref.pages}` : ''}.`;
      case 'book':
        return `[${index + 1}] ${authors}. ${ref.title}[M]. ${ref.publisher}, ${ref.year}.`;
      case 'thesis':
        return `[${index + 1}] ${authors}. ${ref.title}[D]. ${ref.publisher || '学位论文'}, ${ref.year}.`;
      case 'web':
        return `[${index + 1}] ${authors}. ${ref.title}[EB/OL]. ${ref.url}, ${ref.year}.`;
      default:
        return `[${index + 1}] ${authors}. ${ref.title}. ${ref.year}.`;
    }
  };

  return (
    <>
      <div className="reference-panel-overlay">
        <div className="reference-panel">
          <div className="reference-panel-header">
            <h3>参考文献</h3>
            <span className="ref-count">共 {references.length} 条</span>
            <button className="close-btn" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <div className="reference-panel-toolbar">
            <input
              type="text"
              className="search-input"
              placeholder="搜索文献..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <button className="import-btn" onClick={() => setShowImport(true)}>
              <FiUpload /> 导入/导出
            </button>
            <button className="add-btn" onClick={() => setShowAddForm(true)}>
              <FiPlus /> 添加
            </button>
          </div>

          {showAddForm ? (
            <div className="reference-form">
              <div className="form-row">
                <label>类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="journal">期刊论文 [J]</option>
                  <option value="conference">会议论文 [C]</option>
                  <option value="book">书籍 [M]</option>
                  <option value="thesis">学位论文 [D]</option>
                  <option value="web">网络资源 [EB/OL]</option>
                </select>
              </div>
              <div className="form-row">
                <label>作者（多人用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.authors}
                  onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                  placeholder="张三, 李四"
                />
              </div>
              <div className="form-row">
                <label>标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="论文标题"
                />
              </div>
              {(formData.type === 'journal' || formData.type === 'conference') && (
                <div className="form-row">
                  <label>{formData.type === 'journal' ? '期刊名' : '会议名'}</label>
                  <input
                    type="text"
                    value={formData.journal}
                    onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                  />
                </div>
              )}
              <div className="form-row half">
                <div>
                  <label>年份</label>
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                {formData.type === 'journal' && (
                  <div>
                    <label>卷期</label>
                    <input
                      type="text"
                      value={formData.volume}
                      onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                      placeholder="10(2)"
                    />
                  </div>
                )}
                {(formData.type === 'journal' || formData.type === 'conference') && (
                  <div>
                    <label>页码</label>
                    <input
                      type="text"
                      value={formData.pages}
                      onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                      placeholder="1-10"
                    />
                  </div>
                )}
              </div>
              {(formData.type === 'book' || formData.type === 'thesis') && (
                <div className="form-row">
                  <label>{formData.type === 'book' ? '出版社' : '学校'}</label>
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  />
                </div>
              )}
              {formData.type === 'web' && (
                <div className="form-row">
                  <label>网址</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>
              )}
              <div className="form-actions">
                <button onClick={() => setShowAddForm(false)}>取消</button>
                <button className="primary" onClick={handleAddReference}>添加</button>
              </div>
            </div>
          ) : (
            <div className="reference-list">
              {filteredReferences.length === 0 ? (
                <div className="empty-hint">
                  暂无参考文献，点击「添加」或「导入/导出」开始
                </div>
              ) : (
                filteredReferences.map((ref, index) => (
                  <div
                    key={ref.id}
                    className="reference-item"
                    onClick={() => onSelect(ref)}
                  >
                    <div className="reference-number">[{index + 1}]</div>
                    <div className="reference-content">
                      {formatReference(ref, index)}
                    </div>
                    <button
                      className="delete-ref-btn"
                      onClick={(e) => handleDelete(e, ref.id)}
                      title="删除"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="reference-tip">
            删除文献后，文中引用序号会在导出时自动更新
          </div>
        </div>
      </div>

      {showImport && <RefImport onClose={() => setShowImport(false)} />}
    </>
  );
};
