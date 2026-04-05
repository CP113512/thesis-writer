import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiPlus, FiTrash2, FiCheck } from 'react-icons/fi';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../services/api';
import './TemplateSettings.css';

interface Template {
  id: string;
  name: string;
  school: string;
  isBuiltin: boolean;
  config: TemplateConfig;
}

interface TemplateConfig {
  page: {
    size: string;
    margin: { top: number; bottom: number; left: number; right: number };
    headerHeight: number;
    footerHeight: number;
  };
  fonts: {
    heading1: FontConfig;
    heading2: FontConfig;
    heading3: FontConfig;
    heading4: FontConfig;
    body: FontConfig;
    bodyEn: FontConfig;
    caption: FontConfig;
    captionEn: FontConfig;
    reference: FontConfig;
    referenceEn: FontConfig;
  };
  paragraph: {
    lineHeight: number;
    paragraphSpacing: number;
    firstLineIndent: number;
    alignment: string;
  };
  chapter: {
    numbering: string;
    separator: string;
    titleFormat: string;
  };
  figure: {
    numbering: string;
    captionPosition: string;
    captionFormat: string;
  };
  table: {
    numbering: string;
    captionPosition: string;
    captionFormat: string;
  };
  reference: {
    style: string;
    order: string;
    hangingIndent: boolean;
  };
  header: {
    content: string;
    oddPage: string;
    evenPage: string;
  };
  footer: {
    showPageNumber: boolean;
    pageNumberFormat: string;
    pageNumberPosition: string;
    startFrom: number;
  };
}

interface FontConfig {
  family: string;
  size: number;
  bold?: boolean;
}

interface TemplateSettingsProps {
  onClose: () => void;
}

// 字号选项
const FONT_SIZES = [
  { value: 22, label: '二号' },
  { value: 18, label: '小二号' },
  { value: 16, label: '三号' },
  { value: 15, label: '小三号' },
  { value: 14, label: '四号' },
  { value: 12, label: '小四号' },
  { value: 10.5, label: '五号' },
  { value: 9, label: '小五号' },
];

// 安全的深拷贝函数
function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  // 降级方案：JSON 方式（注意：不支持函数、undefined、Symbol）
  return JSON.parse(JSON.stringify(obj));
}

// 验证边距值（0-10 cm）
function validateMargin(value: string): number {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;
  if (num > 10) return 10;
  return Math.round(num * 10) / 10; // 保留一位小数
}

// 验证字号值
function validateFontSize(value: string): number {
  const num = parseFloat(value);
  if (isNaN(num) || num < 9) return 12;
  if (num > 22) return 22;
  return num;
}

// 默认模板配置
const DEFAULT_CONFIG: TemplateConfig = {
  page: {
    size: 'A4',
    margin: { top: 2.5, bottom: 2.5, left: 3, right: 2.5 },
    headerHeight: 1.5,
    footerHeight: 1.5,
  },
  fonts: {
    heading1: { family: '黑体', size: 16, bold: true },
    heading2: { family: '黑体', size: 15, bold: true },
    heading3: { family: '黑体', size: 14, bold: true },
    heading4: { family: '黑体', size: 12, bold: true },
    body: { family: '宋体', size: 12 },
    bodyEn: { family: 'Times New Roman', size: 12 },
    caption: { family: '宋体', size: 10.5 },
    captionEn: { family: 'Times New Roman', size: 10.5 },
    reference: { family: '宋体', size: 10.5 },
    referenceEn: { family: 'Times New Roman', size: 10.5 },
  },
  paragraph: {
    lineHeight: 1.5,
    paragraphSpacing: 0,
    firstLineIndent: 2,
    alignment: 'justify',
  },
  chapter: {
    numbering: '第N章',
    separator: ' ',
    titleFormat: '{number}{separator}{title}',
  },
  figure: {
    numbering: '{chapter}-{number}',
    captionPosition: 'below',
    captionFormat: '图{number} {caption}',
  },
  table: {
    numbering: '{chapter}-{number}',
    captionPosition: 'above',
    captionFormat: '表{number} {caption}',
  },
  reference: {
    style: 'GB/T-7714',
    order: 'appearance',
    hangingIndent: true,
  },
  header: {
    content: '',
    oddPage: '',
    evenPage: '',
  },
  footer: {
    showPageNumber: true,
    pageNumberFormat: '1',
    pageNumberPosition: 'center',
    startFrom: 1,
  },
};

export const TemplateSettings: React.FC<TemplateSettingsProps> = ({ onClose }) => {
  const { currentProject, loadProject } = useProjectStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [editingConfig, setEditingConfig] = useState<TemplateConfig>(deepClone(DEFAULT_CONFIG));
  const [hasChanges, setHasChanges] = useState(false);

  // 加载模板列表
  useEffect(() => {
    loadTemplates();
  }, []);

  // 当选中模板变化时，加载其配置
  useEffect(() => {
    const loadSelectedTemplate = async () => {
      if (selectedId) {
        try {
          const template = await api.getTemplate(selectedId);
          if (template?.config) {
            setEditingConfig(template.config);
            setHasChanges(false);
          }
        } catch (e) {
          console.warn('Failed to load template:', e);
        }
      }
    };
    loadSelectedTemplate();
  }, [selectedId]);

  const loadTemplates = async () => {
    try {
      const allTemplates = await api.getAllTemplates();
      setTemplates(allTemplates);

      // 设置当前选中的模板
      const currentTemplateId = currentProject?.templateId;
      if (currentTemplateId && allTemplates.some((t: Template) => t.id === currentTemplateId)) {
        setSelectedId(currentTemplateId);
      } else if (allTemplates.length > 0) {
        setSelectedId(allTemplates[0].id);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  // 选择模板
  const handleSelectTemplate = async (templateId: string) => {
    if (hasChanges) {
      if (!confirm('当前模板有未保存的修改，是否放弃？')) {
        return;
      }
    }

    setSelectedId(templateId);

    if (currentProject && templateId !== currentProject.templateId) {
      try {
        await api.updateProject({
          ...currentProject,
          templateId: templateId,
        });
        await loadProject(currentProject.id);
      } catch (error) {
        console.error('Failed to update project template:', error);
      }
    }
  };

  // 新建模板
  const handleCreateTemplate = async () => {
    const name = prompt('请输入模板名称：');
    if (!name?.trim()) return;

    try {
      const newTemplate: Template = {
        id: `template-${Date.now()}`,
        name: name.trim(),
        school: '',
        isBuiltin: false,
        config: deepClone(editingConfig),
      };

      await api.createTemplate(newTemplate);
      await loadTemplates();
      setSelectedId(newTemplate.id);
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('创建失败');
    }
  };

  // 删除模板
  const handleDeleteTemplate = async (template: Template) => {
    if (template.isBuiltin) {
      alert('内置模板不能删除');
      return;
    }
    if (!confirm(`确定删除模板「${template.name}」吗？`)) return;

    try {
      await api.deleteTemplate(template.id);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('删除失败');
    }
  };

  // 更新配置
  const updateConfig = useCallback((path: string, value: unknown) => {
    setEditingConfig(prev => {
      const newConfig = deepClone(prev);
      const keys = path.split('.');
      let obj: Record<string, unknown> = newConfig as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      obj[keys[keys.length - 1]] = value;
      return newConfig;
    });
    setHasChanges(true);
  }, []);

  // 保存配置
  const handleSave = async () => {
    const selectedTemplate = templates.find(t => t.id === selectedId);
    if (!selectedTemplate) return;

    if (selectedTemplate.isBuiltin) {
      // 内置模板，创建副本
      const name = prompt('内置模板不可修改，请输入新模板名称：', selectedTemplate.name + ' (副本)');
      if (!name?.trim()) return;

      try {
        const newTemplate: Template = {
          id: `template-${Date.now()}`,
          name: name.trim(),
          school: '',
          isBuiltin: false,
          config: editingConfig,
        };
        await api.createTemplate(newTemplate);
        await loadTemplates();
        setSelectedId(newTemplate.id);
        setHasChanges(false);

        // 切换到新模板
        if (currentProject) {
          await api.updateProject({
            ...currentProject,
            templateId: newTemplate.id,
          });
          await loadProject(currentProject.id);
        }
      } catch (error) {
        console.error('Failed to save template:', error);
        alert('保存失败');
      }
    } else {
      // 自定义模板，直接更新
      try {
        await api.updateTemplate({
          ...selectedTemplate,
          config: editingConfig,
        });
        setHasChanges(false);

        // 如果是当前项目使用的模板，重新加载项目
        if (currentProject && currentProject.templateId === selectedId) {
          await loadProject(currentProject.id);
        }
      } catch (error) {
        console.error('Failed to save template:', error);
        alert('保存失败');
      }
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedId);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="template-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="template-header">
          <h3>格式设置</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* 模板选择区 */}
        <div className="template-selector">
          <div className="template-tabs">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`template-tab ${selectedId === template.id ? 'active' : ''}`}
                onClick={() => handleSelectTemplate(template.id)}
              >
                <span className="tab-name">{template.name}</span>
                {selectedId === template.id && <FiCheck className="tab-check" />}
                {template.isBuiltin && <span className="builtin-tag">内置</span>}
                {!template.isBuiltin && selectedId === template.id && (
                  <button
                    className="tab-delete"
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template); }}
                  >
                    <FiTrash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <button className="tab-add" onClick={handleCreateTemplate}>
              <FiPlus size={14} />
            </button>
          </div>
        </div>

        {/* 配置编辑区 */}
        <div className="template-config">
          <div className="config-section">
            <div className="section-title">页面设置</div>
            <div className="config-row">
              <div className="config-item small">
                <label>纸张</label>
                <select
                  value={editingConfig.page?.size || 'A4'}
                  onChange={(e) => updateConfig('page.size', e.target.value)}
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="B5">B5</option>
                </select>
              </div>
              <div className="config-item small">
                <label>上边距</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={editingConfig.page?.margin?.top || 2.5}
                  onChange={(e) => updateConfig('page.margin.top', validateMargin(e.target.value))}
                />
              </div>
              <div className="config-item small">
                <label>下边距</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={editingConfig.page?.margin?.bottom || 2.5}
                  onChange={(e) => updateConfig('page.margin.bottom', validateMargin(e.target.value))}
                />
              </div>
              <div className="config-item small">
                <label>左边距</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={editingConfig.page?.margin?.left || 3}
                  onChange={(e) => updateConfig('page.margin.left', validateMargin(e.target.value))}
                />
              </div>
              <div className="config-item small">
                <label>右边距</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={editingConfig.page?.margin?.right || 2.5}
                  onChange={(e) => updateConfig('page.margin.right', validateMargin(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="config-section">
            <div className="section-title">标题格式</div>
            {(['heading1', 'heading2', 'heading3', 'heading4'] as const).map((key, idx) => (
              <div className="config-row" key={key}>
                <div className="config-item label-item">
                  <span className={`level-badge level-${idx + 1}`}>
                    {['一级标题', '二级标题', '三级标题', '四级标题'][idx]}
                  </span>
                </div>
                <div className="config-item">
                  <select
                    value={editingConfig.fonts?.[key]?.family || '黑体'}
                    onChange={(e) => updateConfig(`fonts.${key}.family`, e.target.value)}
                  >
                    <option value="黑体">黑体</option>
                    <option value="宋体">宋体</option>
                    <option value="楷体">楷体</option>
                    <option value="仿宋">仿宋</option>
                  </select>
                </div>
                <div className="config-item small">
                  <select
                    value={editingConfig.fonts?.[key]?.size || 12}
                    onChange={(e) => updateConfig(`fonts.${key}.size`, parseFloat(e.target.value))}
                  >
                    {FONT_SIZES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="config-item checkbox-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingConfig.fonts?.[key]?.bold ?? true}
                      onChange={(e) => updateConfig(`fonts.${key}.bold`, e.target.checked)}
                    />
                    加粗
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="config-section">
            <div className="section-title">正文格式</div>
            <div className="config-row">
              <div className="config-item label-item"><label>中文字体</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.fonts?.body?.family || '宋体'}
                  onChange={(e) => updateConfig('fonts.body.family', e.target.value)}
                >
                  <option value="宋体">宋体</option>
                  <option value="仿宋">仿宋</option>
                  <option value="楷体">楷体</option>
                </select>
              </div>
              <div className="config-item label-item"><label>英文字体</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.fonts?.bodyEn?.family || 'Times New Roman'}
                  onChange={(e) => updateConfig('fonts.bodyEn.family', e.target.value)}
                >
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Arial">Arial</option>
                </select>
              </div>
              <div className="config-item small">
                <label>字号</label>
                <select
                  value={editingConfig.fonts?.body?.size || 12}
                  onChange={(e) => updateConfig('fonts.body.size', parseFloat(e.target.value))}
                >
                  {FONT_SIZES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="config-row">
              <div className="config-item label-item"><label>行距</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.paragraph?.lineHeight || 1.5}
                  onChange={(e) => updateConfig('paragraph.lineHeight', parseFloat(e.target.value))}
                >
                  <option value={1}>单倍</option>
                  <option value={1.25}>1.25倍</option>
                  <option value={1.5}>1.5倍</option>
                  <option value={1.75}>1.75倍</option>
                  <option value={2}>2倍</option>
                </select>
              </div>
              <div className="config-item label-item"><label>首行缩进</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.paragraph?.firstLineIndent || 2}
                  onChange={(e) => updateConfig('paragraph.firstLineIndent', parseInt(e.target.value))}
                >
                  <option value={0}>无</option>
                  <option value={1}>1字符</option>
                  <option value={2}>2字符</option>
                </select>
              </div>
            </div>
          </div>

          <div className="config-section">
            <div className="section-title">图表标题</div>
            <div className="config-row">
              <div className="config-item label-item"><label>图编号</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.figure?.numbering?.includes('chapter') ? 'chapter' : 'continuous'}
                  onChange={(e) => updateConfig('figure.numbering', e.target.value === 'chapter' ? '{chapter}-{number}' : '{number}')}
                >
                  <option value="chapter">按章节 (图1-1)</option>
                  <option value="continuous">连续 (图1)</option>
                </select>
              </div>
              <div className="config-item label-item"><label>图标题位置</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.figure?.captionPosition || 'below'}
                  onChange={(e) => updateConfig('figure.captionPosition', e.target.value)}
                >
                  <option value="below">图下方</option>
                  <option value="above">图上方</option>
                </select>
              </div>
            </div>
            <div className="config-row">
              <div className="config-item label-item"><label>表编号</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.table?.numbering?.includes('chapter') ? 'chapter' : 'continuous'}
                  onChange={(e) => updateConfig('table.numbering', e.target.value === 'chapter' ? '{chapter}-{number}' : '{number}')}
                >
                  <option value="chapter">按章节 (表1-1)</option>
                  <option value="continuous">连续 (表1)</option>
                </select>
              </div>
              <div className="config-item label-item"><label>表标题位置</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.table?.captionPosition || 'above'}
                  onChange={(e) => updateConfig('table.captionPosition', e.target.value)}
                >
                  <option value="above">表上方</option>
                  <option value="below">表下方</option>
                </select>
              </div>
            </div>
          </div>

          <div className="config-section">
            <div className="section-title">参考文献</div>
            <div className="config-row">
              <div className="config-item label-item"><label>引用格式</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.reference?.style || 'GB/T-7714'}
                  onChange={(e) => updateConfig('reference.style', e.target.value)}
                >
                  <option value="GB/T-7714">GB/T 7714</option>
                  <option value="APA">APA</option>
                  <option value="MLA">MLA</option>
                </select>
              </div>
              <div className="config-item checkbox-item">
                <label>
                  <input
                    type="checkbox"
                    checked={editingConfig.reference?.hangingIndent ?? true}
                    onChange={(e) => updateConfig('reference.hangingIndent', e.target.checked)}
                  />
                  悬挂缩进
                </label>
              </div>
            </div>
          </div>

          <div className="config-section">
            <div className="section-title">页眉页脚</div>
            <div className="config-row">
              <div className="config-item label-item"><label>页眉内容</label></div>
              <div className="config-item flex-2">
                <input
                  type="text"
                  value={editingConfig.header?.content || ''}
                  onChange={(e) => updateConfig('header.content', e.target.value)}
                  placeholder="留空则不显示"
                />
              </div>
            </div>
            <div className="config-row">
              <div className="config-item checkbox-item">
                <label>
                  <input
                    type="checkbox"
                    checked={editingConfig.footer?.showPageNumber ?? true}
                    onChange={(e) => updateConfig('footer.showPageNumber', e.target.checked)}
                  />
                  显示页码
                </label>
              </div>
              <div className="config-item label-item"><label>页码位置</label></div>
              <div className="config-item">
                <select
                  value={editingConfig.footer?.pageNumberPosition || 'center'}
                  onChange={(e) => updateConfig('footer.pageNumberPosition', e.target.value)}
                >
                  <option value="center">居中</option>
                  <option value="left">左侧</option>
                  <option value="right">右侧</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="template-footer">
          <div className="footer-left">
            {selectedTemplate?.isBuiltin && <span className="hint">内置模板修改后将保存为新模板</span>}
          </div>
          <div className="footer-right">
            <button onClick={onClose}>关闭</button>
            <button className="primary" onClick={handleSave} disabled={!hasChanges}>
              {selectedTemplate?.isBuiltin ? '另存为新模板' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
