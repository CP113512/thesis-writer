import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { JSONContent } from '@tiptap/core';
import {
  FiImage, FiCode, FiGrid, FiBookOpen, FiTable, FiList, FiRotateCcw, FiRotateCw
} from 'react-icons/fi';
import { FigurePanel } from '../Figure/FigurePanel';

interface ToolbarProps {
  editor: Editor | null;
  onInsertReference?: () => void;
}

// 从编辑器内容中提取所有图片
function extractFigures(editor: Editor): { alt: string; src: string }[] {
  const figures: { alt: string; src: string }[] = [];
  const json = editor.getJSON();

  const traverse = (node: JSONContent) => {
    if (node.type === 'image' && node.attrs?.alt) {
      figures.push({ alt: node.attrs.alt as string, src: node.attrs.src as string });
    }
    if (node.content) {
      node.content.forEach(traverse);
    }
  };

  traverse(json);
  return figures;
}

// 从编辑器内容中提取所有表格（通过 tableCaption 节点）
function extractTables(editor: Editor): { alt: string }[] {
  const tables: { alt: string }[] = [];
  const json = editor.getJSON();

  const traverse = (node: JSONContent) => {
    if (node.type === 'tableCaption' && node.attrs?.caption) {
      tables.push({ alt: node.attrs.caption as string });
    }
    if (node.content) {
      node.content.forEach(traverse);
    }
  };

  traverse(json);
  return tables;
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor, onInsertReference }) => {
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showFigureRefDialog, setShowFigureRefDialog] = useState(false);
  const [showTableRefDialog, setShowTableRefDialog] = useState(false);
  const [showFigurePanel, setShowFigurePanel] = useState(false);
  const [showFigureCaptionDialog, setShowFigureCaptionDialog] = useState(false);
  const [showTableCaptionDialog, setShowTableCaptionDialog] = useState(false);
  const [formulaText, setFormulaText] = useState('');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableCaption, setTableCaption] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [figureCaptionText, setFigureCaptionText] = useState('');
  const [tableCaptionText, setTableCaptionText] = useState('');
  const [figures, setFigures] = useState<{ alt: string; src: string }[]>([]);
  const [tables, setTables] = useState<{ alt: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 选中的图片/表格名称状态
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>('');
  const [selectedTableCaption, setSelectedTableCaption] = useState<string>('');
  const [editImageAlt, setEditImageAlt] = useState<string>('');
  const [editTableCaption, setEditTableCaption] = useState<string>('');

  // 在连续滚动模式下，editor 可能为 null，但工具栏仍然需要显示
  const isEditorAvailable = !!editor;

  // 监听编辑器选中状态变化
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      // 检查是否选中了图片
      const imageNode = editor.getAttributes('image');
      if (imageNode?.src) {
        setSelectedImageAlt(imageNode.alt || '');
        setEditImageAlt(imageNode.alt || '');
        setSelectedTableCaption('');
        setEditTableCaption('');
        return;
      }

      // 检查是否选中了表格
      if (editor.isActive('table')) {
        // 尝试多种方式获取表格属性
        let caption = '';

        // 方式1: 通过 getAttributes
        const tableAttrs = editor.getAttributes('table');
        console.log('tableAttrs:', tableAttrs);
        const title = tableAttrs?.title || '';
        caption = title.replace(/^表名:\s*/, '');

        // 方式2: 如果方式1没有获取到，尝试从选中的节点获取
        if (!caption) {
          const { from } = editor.state.selection;
          const doc = editor.state.doc;
          doc.descendants((node, pos) => {
            if (node.type.name === 'table' && pos <= from && from <= pos + node.nodeSize) {
              console.log('found table node:', node.attrs);
              const nodeTitle = node.attrs?.title || '';
              caption = nodeTitle.replace(/^表名:\s*/, '');
              return false;
            }
          });
        }

        // 方式3: 尝试查找关联的 tableCaption 节点
        if (!caption) {
          const { from } = editor.state.selection;
          const doc = editor.state.doc;
          doc.descendants((node, pos) => {
            if (node.type.name === 'table' && pos <= from && from <= pos + node.nodeSize) {
              // 检查下一个节点是否是 tableCaption
              const nextPos = pos + node.nodeSize;
              if (nextPos < doc.content.size) {
                const nextNode = doc.nodeAt(nextPos);
                console.log('nextNode:', nextNode?.type?.name, nextNode?.attrs);
                if (nextNode && nextNode.type.name === 'tableCaption' && nextNode.attrs?.caption) {
                  caption = nextNode.attrs.caption;
                }
              }
              return false;
            }
          });
        }

        console.log('final caption:', caption);
        setSelectedTableCaption(caption);
        setEditTableCaption(caption);
        setSelectedImageAlt('');
        setEditImageAlt('');
        return;
      }

      // 未选中图片或表格
      setSelectedImageAlt('');
      setEditImageAlt('');
      setSelectedTableCaption('');
      setEditTableCaption('');
    };

    // 初始检查
    updateSelection();

    // 监听选中变化
    editor.on('selectionUpdate', updateSelection);
    editor.on('focus', updateSelection);

    return () => {
      editor.off('selectionUpdate', updateSelection);
      editor.off('focus', updateSelection);
    };
  }, [editor]);

  // 更新图片名称
  const handleUpdateImageAlt = () => {
    if (editor && selectedImageAlt && editImageAlt.trim()) {
      editor.chain().focus().updateAttributes('image', { alt: editImageAlt.trim() }).run();
      setSelectedImageAlt(editImageAlt.trim());
    }
  };

  // 更新表格名称
  const handleUpdateTableCaption = () => {
    if (editor && selectedTableCaption && editTableCaption.trim()) {
      const newCaption = editTableCaption.trim();

      // 更新表格的 title 属性
      editor.chain().focus().updateAttributes('table', { title: `表名: ${newCaption}` }).run();

      // 尝试找到并更新关联的 tableCaption 节点
      const { from } = editor.state.selection;
      const doc = editor.state.doc;

      // 遍历文档找到当前选中的表格节点位置
      doc.descendants((node, pos) => {
        if (node.type.name === 'table' && pos <= from && from <= pos + node.nodeSize) {
          // 找到表格后，检查下一个节点是否是 tableCaption
          const nextPos = pos + node.nodeSize;
          if (nextPos < doc.content.size) {
            const nextNode = doc.nodeAt(nextPos);
            if (nextNode && nextNode.type.name === 'tableCaption') {
              // 更新 tableCaption 节点
              const tr = editor.state.tr;
              tr.setNodeMarkup(nextPos, undefined, { caption: newCaption });
              editor.view.dispatch(tr);
            }
          }
          return false; // 停止遍历
        }
      });

      setSelectedTableCaption(newCaption);
    }
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImageBase64(base64);
        // 从文件名提取图名（去掉后缀）
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        setImageCaption(fileName);
        setShowImageDialog(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleInsertImage = () => {
    if (editor && imageBase64 && imageCaption.trim()) {
      // 插入图片，设置 alt 和 title 属性
      // alt 用于导出时的图名，title 用于编辑器中的悬停提示
      editor.chain().focus().setImage({
        src: imageBase64,
        alt: imageCaption.trim(),
        title: `图名: ${imageCaption.trim()}`
      }).run();

      // 重置状态
      setImageBase64('');
      setImageCaption('');
      setShowImageDialog(false);
    }
  };

  const insertCodeBlock = () => {
    if (editor) {
      editor.chain().focus().toggleCodeBlock().run();
    }
  };

  const handleInsertFormula = () => {
    if (editor && formulaText.trim()) {
      editor.chain().focus().setCodeBlock().run();
      editor.commands.insertContent(formulaText);
      setFormulaText('');
      setShowFormulaDialog(false);
    }
  };

  const handleInsertTable = () => {
    if (!editor || !tableCaption.trim()) return;

    const captionText = tableCaption.trim();

    // 先插入表格
    editor
      .chain()
      .focus()
      .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true })
      .run();

    // 给表格添加 title 属性（用于悬停提示）
    editor.chain().focus().updateAttributes('table', { title: `表名: ${captionText}` }).run();

    // 在表格后插入表格名称节点（隐藏）
    editor.chain().focus().insertContent({
      type: 'tableCaption',
      attrs: { caption: captionText },
    }).run();

    // 重置状态
    setTableCaption('');
    setShowTableDialog(false);
  };

  const handleOpenFigureRefDialog = () => {
    if (editor) {
      const figs = extractFigures(editor);
      setFigures(figs);
      setShowFigureRefDialog(true);
    }
  };

  const handleOpenTableRefDialog = () => {
    if (editor) {
      const tbls = extractTables(editor);
      setTables(tbls);
      setShowTableRefDialog(true);
    }
  };

  const handleInsertFigureRef = (figureAlt: string) => {
    if (editor) {
      editor.chain().focus().insertContent({
        type: 'figureRef',
        attrs: { figureAlt },
      }).run();
      setShowFigureRefDialog(false);
    }
  };

  const handleInsertTableRef = (tableAlt: string) => {
    if (editor) {
      editor.chain().focus().insertContent({
        type: 'tableRef',
        attrs: { tableAlt },
      }).run();
      setShowTableRefDialog(false);
    }
  };

  const handleInsertFigureCaption = () => {
    if (editor && figureCaptionText.trim()) {
      editor.chain().focus().insertContent({
        type: 'figureCaption',
        attrs: { caption: figureCaptionText.trim() },
      }).run();
      setFigureCaptionText('');
      setShowFigureCaptionDialog(false);
    }
  };

  const handleInsertTableCaptionOnly = () => {
    if (editor && tableCaptionText.trim()) {
      editor.chain().focus().insertContent({
        type: 'tableCaption',
        attrs: { caption: tableCaptionText.trim() },
      }).run();
      setTableCaptionText('');
      setShowTableCaptionDialog(false);
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!isEditorAvailable || !editor.can().undo()}
          title="撤销 (Ctrl+Z)"
        >
          <FiRotateCcw /> 撤销
        </button>
        <button
          className="toolbar-btn"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!isEditorAvailable || !editor.can().redo()}
          title="重做 (Ctrl+Shift+Z)"
        >
          <FiRotateCw /> 重做
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="toolbar-section-title">标题</span>
        <button
          className={`toolbar-btn ${isEditorAvailable && editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!isEditorAvailable}
        >
          一级标题
        </button>
        <button
          className={`toolbar-btn ${isEditorAvailable && editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!isEditorAvailable}
        >
          二级标题
        </button>
        <button
          className={`toolbar-btn ${isEditorAvailable && editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!isEditorAvailable}
        >
          三级标题
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="toolbar-section-title">插入</span>
        <button className="toolbar-btn" onClick={handleImageSelect} disabled={!isEditorAvailable}>
          <FiImage /> 图片
        </button>
        <button className="toolbar-btn" onClick={handleOpenFigureRefDialog} disabled={!isEditorAvailable}>
          <FiImage /> 图引
        </button>
        <button className="toolbar-btn" onClick={() => setShowTableDialog(true)} disabled={!isEditorAvailable}>
          <FiGrid /> 表格
        </button>
        <button className="toolbar-btn" onClick={handleOpenTableRefDialog} disabled={!isEditorAvailable}>
          <FiTable /> 表引
        </button>
        <button className="toolbar-btn" onClick={insertCodeBlock} disabled={!isEditorAvailable}>
          <FiCode /> 代码
        </button>
        <button className="toolbar-btn" onClick={() => setShowFormulaDialog(true)} disabled={!isEditorAvailable}>
          公式
        </button>
        <button className="toolbar-btn" onClick={onInsertReference} disabled={!isEditorAvailable}>
          <FiBookOpen /> 引用
        </button>
        <button className="toolbar-btn" onClick={() => setShowFigurePanel(true)}>
          <FiList /> 图表管理
        </button>
      </div>

      {/* 图片操作（选中图片时显示） */}
      {isEditorAvailable && selectedImageAlt !== '' && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <span className="toolbar-section-title">图片</span>
            <input
              type="text"
              value={editImageAlt}
              onChange={(e) => setEditImageAlt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateImageAlt();
                }
              }}
              placeholder="输入图名"
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5da',
                borderRadius: '4px',
                fontSize: '13px',
                width: '150px',
              }}
            />
            <button
              className="toolbar-btn"
              onClick={handleUpdateImageAlt}
            >
              保存
            </button>
          </div>
        </>
      )}

      {/* 表格操作（选中表格时显示） */}
      {isEditorAvailable && editor.isActive('table') && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <span className="toolbar-section-title">表格</span>
            <button
              className="toolbar-btn"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              左侧加列
            </button>
            <button
              className="toolbar-btn"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              右侧加列
            </button>
            <button
              className="toolbar-btn"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              删除列
            </button>
            <button
              className="toolbar-btn"
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              上方加行
            </button>
            <button
              className="toolbar-btn"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              下方加行
            </button>
            <button
              className="toolbar-btn"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              删除行
            </button>
            <button
              className="toolbar-btn"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              删除表格
            </button>
            <input
              type="text"
              value={editTableCaption}
              onChange={(e) => setEditTableCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateTableCaption();
                }
              }}
              placeholder="输入表名"
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5da',
                borderRadius: '4px',
                fontSize: '13px',
                width: '120px',
                marginLeft: '8px',
              }}
            />
            <button
              className="toolbar-btn"
              onClick={handleUpdateTableCaption}
            >
              保存
            </button>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageChange}
      />

      {/* 公式对话框 */}
      {showFormulaDialog && (
        <div className="dialog-overlay" onClick={() => setShowFormulaDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>插入公式</h3>
            <textarea
              placeholder="输入 LaTeX 公式，例如：\frac{a}{b}, \sum_{i=1}^{n}"
              value={formulaText}
              onChange={(e) => setFormulaText(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '8px', fontFamily: 'monospace', fontSize: '14px' }}
            />
            <div className="dialog-actions">
              <button onClick={() => setShowFormulaDialog(false)}>取消</button>
              <button onClick={handleInsertFormula} className="primary">插入</button>
            </div>
          </div>
        </div>
      )}

      {/* 表格对话框 */}
      {showTableDialog && (
        <div className="dialog-overlay" onClick={() => setShowTableDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>插入表格</h3>
            <div className="table-size-input">
              <div className="input-group">
                <label>行数</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 3)}
                />
              </div>
              <div className="input-group">
                <label>列数</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value) || 3)}
                />
              </div>
            </div>
            <div className="input-group" style={{ marginTop: '12px' }}>
              <label>表名</label>
              <input
                type="text"
                placeholder="例如：实验参数配置"
                value={tableCaption}
                onChange={(e) => setTableCaption(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowTableDialog(false)}>取消</button>
              <button onClick={handleInsertTable} className="primary" disabled={!tableCaption.trim()}>插入</button>
            </div>
          </div>
        </div>
      )}

      {/* 图片对话框 */}
      {showImageDialog && (
        <div className="dialog-overlay" onClick={() => setShowImageDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>插入图片</h3>
            <div className="image-preview">
              <img src={imageBase64} alt="预览" style={{ maxWidth: '100%', maxHeight: '200px' }} />
            </div>
            <div className="input-group" style={{ marginTop: '12px' }}>
              <label>图名</label>
              <input
                type="text"
                placeholder="例如：系统架构图"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowImageDialog(false)}>取消</button>
              <button onClick={handleInsertImage} className="primary" disabled={!imageCaption.trim()}>插入</button>
            </div>
          </div>
        </div>
      )}

      {/* 图片引用对话框 */}
      {showFigureRefDialog && (
        <div className="dialog-overlay" onClick={() => setShowFigureRefDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>插入图片引用</h3>
            {figures.length === 0 ? (
              <div className="empty-hint" style={{ padding: '20px', textAlign: 'center' }}>
                <p>当前章节中没有图片</p>
                <p style={{ fontSize: '12px', color: '#6c757d' }}>请先插入图片</p>
              </div>
            ) : (
              <div className="figure-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {figures.map((fig, index) => (
                  <div
                    key={index}
                    className="figure-item"
                    onClick={() => handleInsertFigureRef(fig.alt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                  >
                    <img
                      src={fig.src}
                      alt={fig.alt}
                      style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <span style={{ fontSize: '14px' }}>{fig.alt}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="dialog-actions">
              <button onClick={() => setShowFigureRefDialog(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 表格引用对话框 */}
      {showTableRefDialog && (
        <div className="dialog-overlay" onClick={() => setShowTableRefDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>插入表格引用</h3>
            {tables.length === 0 ? (
              <div className="empty-hint" style={{ padding: '20px', textAlign: 'center' }}>
                <p>当前章节中没有表格</p>
                <p style={{ fontSize: '12px', color: '#6c757d' }}>请先插入带名称的表格</p>
              </div>
            ) : (
              <div className="table-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {tables.map((tbl, index) => (
                  <div
                    key={index}
                    className="table-item"
                    onClick={() => handleInsertTableRef(tbl.alt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef',
                      marginBottom: '8px',
                    }}
                  >
                    <FiTable style={{ fontSize: '20px', color: '#6c757d' }} />
                    <span style={{ fontSize: '14px' }}>{tbl.alt}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="dialog-actions">
              <button onClick={() => setShowTableRefDialog(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 图名对话框 */}
      {showFigureCaptionDialog && (
        <div className="dialog-overlay" onClick={() => setShowFigureCaptionDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>插入图名</h3>
            <div className="input-group" style={{ marginTop: '12px' }}>
              <label>图名</label>
              <input
                type="text"
                placeholder="例如：系统架构图"
                value={figureCaptionText}
                onChange={(e) => setFigureCaptionText(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
                autoFocus
              />
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowFigureCaptionDialog(false)}>取消</button>
              <button onClick={handleInsertFigureCaption} className="primary" disabled={!figureCaptionText.trim()}>插入</button>
            </div>
          </div>
        </div>
      )}

      {/* 表名对话框 */}
      {showTableCaptionDialog && (
        <div className="dialog-overlay" onClick={() => setShowTableCaptionDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>插入表名</h3>
            <div className="input-group" style={{ marginTop: '12px' }}>
              <label>表名</label>
              <input
                type="text"
                placeholder="例如：实验参数配置"
                value={tableCaptionText}
                onChange={(e) => setTableCaptionText(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
                autoFocus
              />
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowTableCaptionDialog(false)}>取消</button>
              <button onClick={handleInsertTableCaptionOnly} className="primary" disabled={!tableCaptionText.trim()}>插入</button>
            </div>
          </div>
        </div>
      )}

      {/* 图表管理面板 */}
      {showFigurePanel && (
        <FigurePanel onClose={() => setShowFigurePanel(false)} />
      )}
    </div>
  );
};
