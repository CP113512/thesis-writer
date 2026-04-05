import React, { useState, useRef } from 'react';
import { FiUpload, FiCheck, FiDownload, FiCopy } from 'react-icons/fi';
import { BibTeXParser } from '../../services/bibtexParser';
import { GBRefParser } from '../../services/gbRefParser';
import { useProjectStore } from '../../stores/projectStore';

interface RefImportProps {
  onClose: () => void;
}

type ImportFormat = 'bibtex' | 'gb7714';

export const RefImport: React.FC<RefImportProps> = ({ onClose }) => {
  const [importFormat, setImportFormat] = useState<ImportFormat>('gb7714');
  const [inputText, setInputText] = useState('');
  const [parsedEntries, setParsedEntries] = useState<any[]>([]);
  const [imported, setImported] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentProject, addReference } = useProjectStore();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
      parseText(text, importFormat);
    };
    reader.readAsText(file);
  };

  const parseText = (text: string, format: ImportFormat) => {
    try {
      if (format === 'bibtex') {
        const entries = BibTeXParser.parse(text);
        const references = entries.map((entry) =>
          BibTeXParser.toReference(entry, currentProject?.id || '')
        );
        setParsedEntries(references);
      } else {
        const parsed = GBRefParser.parseBatch(text);
        const references = parsed.map((p) =>
          GBRefParser.toReference(p, currentProject?.id || '')
        );
        setParsedEntries(references);
      }
    } catch (error) {
      console.error('Failed to parse:', error);
      alert('解析失败，请检查格式');
    }
  };

  const handleImport = async () => {
    if (!currentProject) return;

    try {
      for (const ref of parsedEntries) {
        await addReference(ref);
      }

      setImported(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to import references:', error);
      alert('导入失败');
    }
  };

  // 导出功能
  const references = currentProject?.references || [];

  const exportToGB7714 = () => {
    const lines = references.map((ref, index) => formatReferenceGB(ref, index));
    return lines.join('\n');
  };

  const exportToBibTeX = () => {
    return references.map(ref => formatReferenceBibTeX(ref)).join('\n\n');
  };

  const formatReferenceGB = (ref: any, index: number): string => {
    const authors = ref.authors.map((a: any) => `${a.lastName}${a.firstName}`).join(',');

    switch (ref.type) {
      case 'journal':
        let journal = `[${index + 1}] ${authors}.${ref.title}[J].${ref.journal},${ref.year}`;
        if (ref.volume) journal += `,${ref.volume}`;
        if (ref.issue) journal += `(${ref.issue})`;
        if (ref.pages) journal += `:${ref.pages}`;
        return journal + '.';
      case 'conference':
        return `[${index + 1}] ${authors}.${ref.title}[C].${ref.journal || '会议论文集'},${ref.year}${ref.pages ? `:${ref.pages}` : ''}.`;
      case 'book':
        return `[${index + 1}] ${authors}.${ref.title}[M].${ref.publisher},${ref.year}.`;
      case 'thesis':
        return `[${index + 1}] ${authors}.${ref.title}[D].${ref.publisher || '学位论文'},${ref.year}.`;
      case 'web':
        return `[${index + 1}] ${authors}.${ref.title}[EB/OL].${ref.url},${ref.year}.`;
      default:
        return `[${index + 1}] ${authors}.${ref.title}.${ref.year}.`;
    }
  };

  const formatReferenceBibTeX = (ref: any): string => {
    const authors = ref.authors.map((a: any) =>
      `${a.lastName}, ${a.firstName}`
    ).join(' and ');

    const fields: string[] = [];
    fields.push(`  author = {${authors}}`);
    fields.push(`  title = {${ref.title}}`);

    if (ref.journal) fields.push(`  journal = {${ref.journal}}`);
    if (ref.year) fields.push(`  year = {${ref.year}}`);
    if (ref.volume) fields.push(`  volume = {${ref.volume}}`);
    if (ref.issue) fields.push(`  number = {${ref.issue}}`);
    if (ref.pages) fields.push(`  pages = {${ref.pages}}`);
    if (ref.publisher) fields.push(`  publisher = {${ref.publisher}}`);
    if (ref.url) fields.push(`  url = {${ref.url}}`);

    const entryType = ref.type === 'journal' ? 'article' :
                      ref.type === 'conference' ? 'inproceedings' :
                      ref.type === 'book' ? 'book' :
                      ref.type === 'thesis' ? 'phdthesis' : 'misc';

    return `@${entryType}{${ref.key || `ref${ref.id.slice(-6)}`},\n${fields.join(',\n')}\n}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog ref-import-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>参考文献导入/导出</h3>
        </div>

        {/* Tab 切换 */}
        <div className="tab-bar">
          <button
            className={activeTab === 'import' ? 'active' : ''}
            onClick={() => setActiveTab('import')}
          >
            导入
          </button>
          <button
            className={activeTab === 'export' ? 'active' : ''}
            onClick={() => setActiveTab('export')}
          >
            导出 ({references.length})
          </button>
        </div>

        <div className="dialog-content">
          {activeTab === 'import' ? (
            !imported ? (
              <>
                <div className="import-method">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".bib,.txt"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiUpload /> 选择文件 (.bib/.txt)
                  </button>
                </div>

                <div className="or-divider">或</div>

                {/* 格式选择 */}
                <div className="format-selector">
                  <label>
                    <input
                      type="radio"
                      checked={importFormat === 'gb7714'}
                      onChange={() => {
                        setImportFormat('gb7714');
                        if (inputText) parseText(inputText, 'gb7714');
                      }}
                    />
                    GB/T-7714 格式
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={importFormat === 'bibtex'}
                      onChange={() => {
                        setImportFormat('bibtex');
                        if (inputText) parseText(inputText, 'bibtex');
                      }}
                    />
                    BibTeX 格式
                  </label>
                </div>

                <div className="bibtex-input">
                  <label>
                    {importFormat === 'gb7714'
                      ? '粘贴 GB/T-7714 格式参考文献（每条一行）:'
                      : '粘贴 BibTeX 内容:'}
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      parseText(e.target.value, importFormat);
                    }}
                    placeholder={importFormat === 'gb7714'
                      ? `[1] 高飞.科研奖励查重系统开发及省部级平台应用探索[J].软件,2026,47(01):12-15+74.
[2] 张三,李四.人工智能研究进展[J].计算机学报,2025,48(3):500-520.`
                      : `@article{key,
  author = {Author Name},
  title = {Article Title},
  journal = {Journal Name},
  year = {2023},
}`}
                    rows={10}
                  />
                </div>

                {parsedEntries.length > 0 && (
                  <div className="parsed-entries">
                    <h4>解析结果 ({parsedEntries.length} 条)</h4>
                    <ul>
                      {parsedEntries.map((entry, index) => (
                        <li key={index}>
                          <span className="entry-type">[{entry.type}]</span>
                          <span className="entry-title">{entry.title}</span>
                          {entry.authors && entry.authors.length > 0 && (
                            <span className="entry-authors">
                              {' '}- {entry.authors.map((a: any) => `${a.lastName}${a.firstName}`).join(',')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="import-success">
                <FiCheck size={48} className="success-icon" />
                <h4>导入成功!</h4>
                <p>已导入 {parsedEntries.length} 条参考文献</p>
              </div>
            )
          ) : (
            // 导出面板
            <div className="export-panel">
              {references.length === 0 ? (
                <div className="empty-hint">暂无参考文献可导出</div>
              ) : (
                <>
                  <div className="export-format-btns">
                    <button
                      className="export-btn"
                      onClick={() => handleDownload(exportToGB7714(), 'references.txt')}
                    >
                      <FiDownload /> 导出 GB/T-7714 格式 (.txt)
                    </button>
                    <button
                      className="export-btn"
                      onClick={() => handleDownload(exportToBibTeX(), 'references.bib')}
                    >
                      <FiDownload /> 导出 BibTeX 格式 (.bib)
                    </button>
                  </div>

                  <div className="export-preview">
                    <div className="preview-header">
                      <span>GB/T-7714 格式预览</span>
                      <button onClick={() => handleCopy(exportToGB7714())}>
                        <FiCopy /> 复制
                      </button>
                    </div>
                    <pre>{exportToGB7714()}</pre>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          {activeTab === 'import' && !imported ? (
            <>
              <button onClick={onClose}>取消</button>
              <button
                className="primary"
                onClick={handleImport}
                disabled={parsedEntries.length === 0}
              >
                导入 {parsedEntries.length > 0 && `(${parsedEntries.length}条)`}
              </button>
            </>
          ) : (
            <button className="primary" onClick={onClose}>
              完成
            </button>
          )}
        </div>

        <style>{`
          .ref-import-dialog {
            width: 700px;
            max-height: 90vh;
          }

          .tab-bar {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 20px;
          }

          .tab-bar button {
            flex: 1;
            padding: 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            color: #6b7280;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
          }

          .tab-bar button:hover {
            color: #374151;
          }

          .tab-bar button.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
            font-weight: 500;
          }

          .import-method {
            text-align: center;
            margin-bottom: 20px;
          }

          .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          }

          .btn-primary:hover {
            background: #2563eb;
          }

          .btn-primary:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .or-divider {
            text-align: center;
            color: #9ca3af;
            margin: 20px 0;
            position: relative;
          }

          .or-divider::before,
          .or-divider::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 40%;
            height: 1px;
            background: #e5e7eb;
          }

          .or-divider::before {
            left: 0;
          }

          .or-divider::after {
            right: 0;
          }

          .format-selector {
            display: flex;
            gap: 20px;
            margin-bottom: 16px;
          }

          .format-selector label {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 14px;
          }

          .format-selector input[type="radio"] {
            margin: 0;
          }

          .bibtex-input {
            margin-bottom: 20px;
          }

          .bibtex-input label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
          }

          .bibtex-input textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            resize: vertical;
          }

          .parsed-entries {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
          }

          .parsed-entries h4 {
            margin: 0 0 12px;
            font-size: 14px;
          }

          .parsed-entries ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .parsed-entries li {
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
          }

          .parsed-entries li:last-child {
            border-bottom: none;
          }

          .entry-type {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-right: 8px;
          }

          .entry-title {
            color: #374151;
          }

          .entry-authors {
            color: #6b7280;
            font-size: 12px;
          }

          .import-success {
            text-align: center;
            padding: 40px 0;
          }

          .success-icon {
            color: #10b981;
            margin-bottom: 16px;
          }

          .import-success h4 {
            margin: 0 0 8px;
            font-size: 18px;
          }

          .import-success p {
            margin: 0;
            color: #6b7280;
          }

          .export-panel {
            min-height: 300px;
          }

          .empty-hint {
            text-align: center;
            color: #9ca3af;
            padding: 60px 0;
          }

          .export-format-btns {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
          }

          .export-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .export-btn:hover {
            border-color: #3b82f6;
            color: #3b82f6;
          }

          .export-preview {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
          }

          .preview-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
            font-weight: 500;
          }

          .preview-header button {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 12px;
          }

          .preview-header button:hover {
            background: #f3f4f6;
          }

          .export-preview pre {
            margin: 0;
            padding: 16px;
            font-size: 13px;
            font-family: 'Courier New', monospace;
            max-height: 300px;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-all;
          }

          .dialog-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 20px;
          }

          .dialog-footer button {
            padding: 8px 20px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            background: white;
            cursor: pointer;
          }

          .dialog-footer button.primary {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
          }
        `}</style>
      </div>
    </div>
  );
};
