/**
 * 预览服务 - 实时渲染论文格式
 */

export class PreviewService {
  /**
   * 将编辑器内容渲染为预览HTML
   */
  static renderPreview(content: string, templateConfig: any): string {
    if (!content) return '';

    try {
      const doc = JSON.parse(content);
      return this.renderNode(doc, templateConfig);
    } catch (error) {
      console.error('Failed to render preview:', error);
      return '';
    }
  }

  /**
   * 渲染节点
   */
  private static renderNode(node: any, config: any): string {
    switch (node.type) {
      case 'doc':
        return this.renderChildren(node, config);

      case 'paragraph':
        return this.renderParagraph(node, config);

      case 'heading':
        return this.renderHeading(node, config);

      case 'text':
        return this.renderText(node, config);

      case 'table':
        return this.renderTable(node, config);

      default:
        return '';
    }
  }

  /**
   * 渲染子节点
   */
  private static renderChildren(node: any, config: any): string {
    if (!node.content) return '';

    return node.content.map((child: any) => this.renderNode(child, config)).join('');
  }

  /**
   * 渲染段落
   */
  private static renderParagraph(node: any, config: any): string {
    const content = this.renderChildren(node, config);

    const style = `
      font-family: ${config.fonts?.body?.family || '宋体'}, serif;
      font-size: ${config.fonts?.body?.size || 12}pt;
      line-height: ${config.paragraph?.lineHeight || 1.5};
      text-indent: ${config.paragraph?.firstLineIndent || 2}em;
      text-align: ${config.paragraph?.alignment || 'justify'};
      margin: 0.5em 0;
    `;

    return `<p style="${style}">${content || '&nbsp;'}</p>`;
  }

  /**
   * 渲染标题
   */
  private static renderHeading(node: any, config: any): string {
    const level = node.attrs?.level || 1;
    const content = this.renderChildren(node, config);

    const fontConfig = config.fonts?.[`heading${level}`] || config.fonts?.heading1;

    const style = `
      font-family: ${fontConfig?.family || '黑体'}, sans-serif;
      font-size: ${fontConfig?.size || 16}pt;
      font-weight: ${fontConfig?.bold ? 'bold' : 'normal'};
      text-align: ${level === 1 ? 'center' : 'left'};
      margin: 1em 0 0.5em;
    `;

    return `<h${level} style="${style}">${content}</h${level}>`;
  }

  /**
   * 渲染文本
   */
  private static renderText(node: any, _config: any): string {
    let text = node.text || '';

    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `<strong>${text}</strong>`;
            break;
          case 'italic':
            text = `<em>${text}</em>`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
        }
      }
    }

    return text;
  }

  /**
   * 渲染表格
   */
  private static renderTable(node: any, config: any): string {
    if (!node.content) return '';

    const style = `
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    `;

    const rows = node.content
      .filter((child: any) => child.type === 'tableRow')
      .map((row: any) => this.renderTableRow(row, config))
      .join('');

    return `<table style="${style}">${rows}</table>`;
  }

  /**
   * 渲染表格行
   */
  private static renderTableRow(node: any, config: any): string {
    if (!node.content) return '';

    const cells = node.content
      .map((cell: any) => this.renderTableCell(cell, config))
      .join('');

    return `<tr>${cells}</tr>`;
  }

  /**
   * 渲染表格单元格
   */
  private static renderTableCell(node: any, config: any): string {
    const content = this.renderChildren(node, config);
    const isHeader = node.type === 'tableHeader';

    const style = `
      border: 1px solid #000;
      padding: 0.5em;
      text-align: left;
      ${isHeader ? 'font-weight: bold; background: #f3f4f6;' : ''}
    `;

    const tag = isHeader ? 'th' : 'td';

    return `<${tag} style="${style}">${content}</${tag}>`;
  }

  /**
   * 生成完整的预览HTML
   */
  static generatePreviewHTML(chapters: any[], config: any): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: ${config.fonts?.body?.family || '宋体'}, serif;
            font-size: ${config.fonts?.body?.size || 12}pt;
            line-height: ${config.paragraph?.lineHeight || 1.5};
            max-width: 800px;
            margin: 0 auto;
            padding: 2em;
            background: white;
          }
          h1, h2, h3 {
            color: #111;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          td, th {
            border: 1px solid #000;
            padding: 0.5em;
          }
        </style>
      </head>
      <body>
    `;

    for (const chapter of chapters) {
      if (chapter.content) {
        html += this.renderPreview(chapter.content, config);
      }
    }

    html += `
      </body>
      </html>
    `;

    return html;
  }
}

export const previewService = new PreviewService();
