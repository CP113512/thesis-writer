/**
 * 编号服务 - 自动管理图表和公式的编号
 */

export class NumberingService {
  /**
   * 重新计算章节编号
   */
  static renumberChapters(chapters: any[]): any[] {
    let chapterNum = 0;

    chapters.forEach((chapter) => {
      if (chapter.level === 1 && !chapter.isFixed) {
        chapterNum++;
        chapter.number = `${chapterNum}`;
      }
    });

    return chapters;
  }

  /**
   * 重新计算图表编号
   * 格式: {章节号}-{序号} (如: 图1-1, 表2-3)
   */
  static renumberFigures(figures: any[], chapters: any[]): any[] {
    const chapterFigureCount: Map<string, number> = new Map();

    // 按位置排序
    const sortedFigures = [...figures].sort((a, b) => a.position - b.position);

    sortedFigures.forEach((figure) => {
      // 找到图片所属的章节
      const chapter = chapters.find((ch) => ch.id === figure.chapterId);
      if (!chapter) return;

      const chapterNumber = chapter.number || '0';
      const count = (chapterFigureCount.get(chapterNumber) || 0) + 1;
      chapterFigureCount.set(chapterNumber, count);

      // 生成编号
      if (figure.type === 'figure') {
        figure.number = `${chapterNumber}-${count}`;
      } else if (figure.type === 'table') {
        figure.number = `${chapterNumber}-${count}`;
      }
    });

    return sortedFigures;
  }

  /**
   * 格式化图片标题
   */
  static formatFigureCaption(number: string, caption: string, type: 'figure' | 'table'): string {
    const prefix = type === 'figure' ? '图' : '表';
    return `${prefix}${number} ${caption}`;
  }

  /**
   * 格式化公式编号
   */
  static formatEquationNumber(chapterNumber: string, equationNumber: number): string {
    return `(${chapterNumber}-${equationNumber})`;
  }

  /**
   * 更新文档中的所有引用
   */
  static updateReferences(content: string, oldNumber: string, newNumber: string): string {
    if (!content) return content;

    try {
      const contentObj = JSON.parse(content);
      this.updateReferencesInNode(contentObj, oldNumber, newNumber);
      return JSON.stringify(contentObj);
    } catch {
      return content;
    }
  }

  private static updateReferencesInNode(node: any, oldNumber: string, newNumber: string): void {
    if (node.attrs && node.attrs.figureNumber === oldNumber) {
      node.attrs.figureNumber = newNumber;
    }

    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any) => {
        this.updateReferencesInNode(child, oldNumber, newNumber);
      });
    }
  }
}

export const numberingService = new NumberingService();
