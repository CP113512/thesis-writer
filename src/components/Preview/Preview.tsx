import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import './Preview.css';

export const Preview: React.FC = () => {
  const { currentProject } = useProjectStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  // 根据容器宽度计算缩放比例
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // A4纸宽度约210mm，预览区域宽度约210px时缩放为60%
        // 根据实际容器宽度调整缩放比例
        const baseWidth = 210; // 基准宽度
        const baseScale = 0.6; // 基准缩放
        const newScale = (containerWidth / baseWidth) * baseScale;
        // 限制缩放范围
        setScale(Math.max(0.3, Math.min(1.2, newScale)));
      }
    };

    updateScale();

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 预计算所有图表编号
  const { figureNumbers, tableNumbers } = useMemo(() => {
    const figureNumbers = new Map<string, string>();
    const tableNumbers = new Map<string, string>();

    if (!currentProject) return { figureNumbers, tableNumbers };

    const config = currentProject.template?.config;

    let currentChapterNum = '';
    let figureCounter = 0;
    let tableCounter = 0;

    // 按章节顺序遍历
    const sortedChapters = [...currentProject.chapters].sort((a, b) => a.orderIndex - b.orderIndex);

    for (const chapter of sortedChapters) {
      // 更新章节编号（只取章级别）
      if (chapter.number) {
        const topLevel = chapter.number.split('.')[0];
        if (currentChapterNum !== topLevel) {
          currentChapterNum = topLevel;
          figureCounter = 0;
          tableCounter = 0;
        }
      } else if (chapter.level === 1) {
        // 一级标题没有编号时，清空章节编号
        currentChapterNum = '';
      }

      // 扫描章节内容
      if (chapter.content) {
        try {
          const json = JSON.parse(chapter.content);
          scanForFiguresAndTables(
            json,
            figureNumbers,
            tableNumbers,
            currentChapterNum,
            () => figureCounter++,
            () => tableCounter++,
            config
          );
        } catch {}
      }
    }

    return { figureNumbers, tableNumbers };
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="preview empty">
        <p>预览区域</p>
      </div>
    );
  }

  // 获取模板配置
  const template = currentProject.template;
  const config = template?.config;

  // 固定的样式（不随缩放变化）
  const pageStyle: React.CSSProperties = {
    fontFamily: config?.fonts?.body?.family || '宋体',
    fontSize: `${config?.fonts?.body?.size || 12}px`,
    lineHeight: config?.paragraph?.lineHeight || 1.5,
  };

  const heading1Style: React.CSSProperties = {
    fontFamily: config?.fonts?.heading1?.family || '黑体',
    fontSize: `${config?.fonts?.heading1?.size || 16}px`,
    fontWeight: config?.fonts?.heading1?.bold ? 'bold' : 'normal',
  };

  const heading2Style: React.CSSProperties = {
    fontFamily: config?.fonts?.heading2?.family || '黑体',
    fontSize: `${config?.fonts?.heading2?.size || 15}px`,
    fontWeight: config?.fonts?.heading2?.bold ? 'bold' : 'normal',
  };

  const heading3Style: React.CSSProperties = {
    fontFamily: config?.fonts?.heading3?.family || '黑体',
    fontSize: `${config?.fonts?.heading3?.size || 14}px`,
    fontWeight: config?.fonts?.heading3?.bold ? 'bold' : 'normal',
  };

  const captionStyle: React.CSSProperties = {
    fontFamily: config?.fonts?.caption?.family || '宋体',
    fontSize: `${config?.fonts?.caption?.size || 10.5}px`,
  };

  return (
    <div className="preview" ref={containerRef}>
      <div className="preview-header">
        <span className="preview-title">实时预览</span>
        <div className="preview-zoom">
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
        </div>
      </div>
      <div className="preview-content">
        <div
          className="preview-page-wrapper"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <div className="preview-page" style={pageStyle}>
            <div className="page-header">
              <span>{currentProject.name}</span>
            </div>
            <div className="page-body">
              {currentProject.chapters
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((chapter) => (
                  <div key={chapter.id} className="preview-chapter">
                    <h1 className="preview-chapter-title" style={heading1Style}>
                      {chapter.number ? `${chapter.number} ${chapter.title}` : chapter.title}
                    </h1>
                    {chapter.content && (
                      <div className="preview-chapter-content">
                        {renderContent(
                          chapter.content,
                        currentProject.references,
                        figureNumbers,
                        tableNumbers,
                        heading2Style,
                        heading3Style,
                        captionStyle,
                        config,
                        scale
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
          <div className="page-footer">
            <span className="page-number">1</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

// 扫描内容中的图表
function scanForFiguresAndTables(
  node: any,
  figureNumbers: Map<string, string>,
  tableNumbers: Map<string, string>,
  chapterNum: string,
  incFigure: () => void,
  incTable: () => void,
  config: any
) {
  if (node.type === 'image' && node.attrs?.src) {
    incFigure();
    const alt = node.attrs.alt || `figure-${figureNumbers.size + 1}`;
    // 根据配置决定编号格式
    const numberingFormat = config?.figure?.numbering || '{chapter}-{number}';
    let num: string;
    if (numberingFormat.includes('chapter') && chapterNum) {
      num = numberingFormat.replace('{chapter}', chapterNum).replace('{number}', String(figureNumbers.size + 1));
    } else {
      num = String(figureNumbers.size + 1);
    }
    figureNumbers.set(alt, num);
  }

  if (node.type === 'tableCaption' && node.attrs?.caption) {
    incTable();
    const caption = node.attrs.caption;
    // 根据配置决定编号格式
    const numberingFormat = config?.table?.numbering || '{chapter}-{number}';
    let num: string;
    if (numberingFormat.includes('chapter') && chapterNum) {
      num = numberingFormat.replace('{chapter}', chapterNum).replace('{number}', String(tableNumbers.size + 1));
    } else {
      num = String(tableNumbers.size + 1);
    }
    tableNumbers.set(caption, num);
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      scanForFiguresAndTables(child, figureNumbers, tableNumbers, chapterNum, incFigure, incTable, config);
    }
  }
}

// 渲染内容
function renderContent(
  content: string,
  references: any[],
  figureNumbers: Map<string, string>,
  tableNumbers: Map<string, string>,
  heading2Style: React.CSSProperties,
  heading3Style: React.CSSProperties,
  captionStyle: React.CSSProperties,
  config: any,
  scale: number = 0.6
): React.ReactNode {
  try {
    const json = JSON.parse(content);
    // 跳过第一个节点（章节标题已经单独渲染）
    const nodes = (json.content || []).slice(1);
    return renderNodes(nodes, references, figureNumbers, tableNumbers, heading2Style, heading3Style, captionStyle, config, scale);
  } catch {
    return null;
  }
}

function renderNodes(
  nodes: any[],
  references: any[],
  figureNumbers: Map<string, string>,
  tableNumbers: Map<string, string>,
  heading2Style: React.CSSProperties,
  heading3Style: React.CSSProperties,
  captionStyle: React.CSSProperties,
  config: any,
  scale: number = 0.6
): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // 处理表格名称
    if (node.type === 'tableCaption') {
      // 检查下一个节点是否是表格
      const nextNode = nodes[i + 1];
      if (nextNode?.type === 'table') {
        // 表名 + 表格，根据配置决定位置
        result.push(renderTableWithCaption(node, nextNode, tableNumbers, captionStyle, config));
        i++; // 跳过表格节点
        continue;
      } else {
        // 表格名称单独存在
        const caption = node.attrs?.caption || '表格名称';
        const num = tableNumbers.get(caption) || '';
        result.push(
          <div key={i} className="preview-table-caption" style={captionStyle}>
            {num ? `表${num} ` : ''}{caption}
          </div>
        );
      }
    } else if (node.type === 'table') {
      // 表格没有名称
      result.push(renderTable(node, i));
    } else if (node.type === 'image') {
      // 检查下一个节点是否是图名
      const nextNode = nodes[i + 1];
      if (nextNode?.type === 'figureCaption') {
        // 图片 + 图名，根据配置决定位置
        result.push(renderFigure(node, nextNode, figureNumbers, captionStyle, config));
        i++; // 跳过图名节点
        continue;
      } else {
        // 图片没有图名
        result.push(renderFigure(node, null, figureNumbers, captionStyle, config));
      }
    } else if (node.type === 'figureCaption') {
      // 单独的图名（图片在前面）
      const caption = node.attrs?.caption || '图名';
      const num = figureNumbers.get(caption) || '';
      result.push(
        <div key={i} className="preview-figure-caption" style={captionStyle}>
          {num ? `图${num} ` : ''}{caption}
        </div>
      );
    } else {
      result.push(renderNode(node, references, figureNumbers, tableNumbers, heading2Style, heading3Style, captionStyle, config, i, scale));
    }
  }

  return result;
}

function renderTableWithCaption(
  captionNode: any,
  tableNode: any,
  tableNumbers: Map<string, string>,
  captionStyle: React.CSSProperties,
  config: any
): React.ReactNode {
  const caption = captionNode.attrs?.caption || '表格名称';
  const num = tableNumbers.get(caption) || '';
  const captionText = num ? `表${num} ${caption}` : caption;
  const position = config?.table?.captionPosition || 'above';

  const captionElement = (
    <div key="caption" className="preview-table-caption" style={captionStyle}>
      {captionText}
    </div>
  );

  const tableElement = renderTable(tableNode, 'table');

  return (
    <div key="table-with-caption" className="preview-table-wrapper">
      {position === 'above' ? (
        <>
          {captionElement}
          {tableElement}
        </>
      ) : (
        <>
          {tableElement}
          {captionElement}
        </>
      )}
    </div>
  );
}

function renderTable(node: any, key: any): React.ReactNode {
  const rows = (node.content || []).map((row: any, ri: number) => {
    if (row.type === 'tableRow') {
      const cells = (row.content || []).map((cell: any, ci: number) => {
        const cellContent = (cell.content || []).map((n: any) => renderTextNode(n)).join('');
        if (cell.type === 'tableHeader') {
          return <th key={ci}>{cellContent}</th>;
        }
        return <td key={ci}>{cellContent}</td>;
      });
      return <tr key={ri}>{cells}</tr>;
    }
    return null;
  });

  return (
    <table key={key} className="preview-table">
      <tbody>{rows}</tbody>
    </table>
  );
}

function renderFigure(
  imageNode: any,
  captionNode: any | null,
  figureNumbers: Map<string, string>,
  captionStyle: React.CSSProperties,
  config: any
): React.ReactNode {
  const src = imageNode.attrs?.src;
  const alt = imageNode.attrs?.alt || '';
  const num = figureNumbers.get(alt) || '';
  const position = config?.figure?.captionPosition || 'below';

  const captionText = captionNode
    ? (num ? `图${num} ${captionNode.attrs?.caption || ''}` : (captionNode.attrs?.caption || '图名'))
    : (num ? `图${num} ${alt}` : alt || '图名');

  const captionElement = (
    <figcaption key="caption" className="preview-figure-caption" style={captionStyle}>
      {captionText}
    </figcaption>
  );

  const imageElement = src ? <img key="image" src={src} alt={alt} /> : null;

  return (
    <figure key="figure" className="preview-figure">
      {position === 'above' ? (
        <>
          {captionElement}
          {imageElement}
        </>
      ) : (
        <>
          {imageElement}
          {captionElement}
        </>
      )}
    </figure>
  );
}

function renderNode(
  node: any,
  references: any[],
  figureNumbers: Map<string, string>,
  tableNumbers: Map<string, string>,
  heading2Style: React.CSSProperties,
  heading3Style: React.CSSProperties,
  captionStyle: React.CSSProperties,
  config: any,
  key: any,
  scale: number = 0.6
): React.ReactNode {
  if (node.type === 'paragraph') {
    const content = (node.content || []).map((n: any, i: number) =>
      renderNode(n, references, figureNumbers, tableNumbers, heading2Style, heading3Style, captionStyle, config, `${key}-${i}`, scale)
    );
    // 首行缩进
    const indent = config?.paragraph?.firstLineIndent || 2;
    const fontSize = config?.fonts?.body?.size || 12;
    return (
      <p key={key} style={{ textIndent: `${indent * fontSize}px`, textAlign: config?.paragraph?.alignment || 'justify' }}>
        {content}
      </p>
    );
  }

  if (node.type === 'text') {
    return node.text || '';
  }

  if (node.type === 'heading') {
    const level = node.attrs?.level || 1;
    // 一级标题已通过章节标题渲染
    if (level === 1) return null;

    const content = (node.content || []).map((n: any) => renderTextNode(n)).join('');

    if (level === 2) {
      return <h2 key={key} style={heading2Style}>{content}</h2>;
    }
    if (level === 3) {
      return <h3 key={key} style={heading3Style}>{content}</h3>;
    }
    const heading4Style = {
      fontFamily: config?.fonts?.heading4?.family || '黑体',
      fontSize: `${(config?.fonts?.heading4?.size || 12) * scale}px`,
      fontWeight: config?.fonts?.heading4?.bold ? 'bold' : 'normal',
    };
    return <h4 key={key} style={heading4Style}>{content}</h4>;
  }

  if (node.type === 'citation') {
    const refId = node.attrs?.referenceId;
    const ref = references.find(r => r.id === refId);
    if (ref) {
      return <span key={key} className="preview-citation" title={ref.title}>[{ref.key || ref.title.slice(0, 10)}]</span>;
    }
    return <span key={key} className="preview-citation">[?]</span>;
  }

  if (node.type === 'figureRef') {
    const figureAlt = node.attrs?.figureAlt || '';
    const num = figureNumbers.get(figureAlt) || 'X-X';
    return <span key={key} className="preview-figure-ref">图{num}</span>;
  }

  if (node.type === 'tableRef') {
    const tableAlt = node.attrs?.tableAlt || '';
    const num = tableNumbers.get(tableAlt) || 'X-X';
    return <span key={key} className="preview-table-ref">表{num}</span>;
  }

  if (node.type === 'codeBlock') {
    const codeText = (node.content || []).map((n: any) => renderTextNode(n)).join('');
    return (
      <pre key={key} className="preview-code-block">
        <code>{codeText}</code>
      </pre>
    );
  }

  return null;
}

function renderTextNode(node: any): string {
  if (node.type === 'text') {
    return node.text || '';
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(renderTextNode).join('');
  }
  return '';
}
