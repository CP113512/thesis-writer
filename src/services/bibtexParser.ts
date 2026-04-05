/**
 * BibTeX 解析器
 */

export interface BibTeXEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

export class BibTeXParser {
  /**
   * 解析 BibTeX 文本
   */
  static parse(text: string): BibTeXEntry[] {
    const entries: BibTeXEntry[] = [];
    const lines = text.split('\n');

    let currentEntry: Partial<BibTeXEntry> | null = null;
    let currentField = '';
    let currentValue = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 跳过注释和空行
      if (trimmedLine.startsWith('%') || trimmedLine === '') {
        continue;
      }

      // 开始新的条目
      if (trimmedLine.startsWith('@')) {
        // 保存上一个条目
        if (currentEntry && currentEntry.type && currentEntry.key && currentEntry.fields) {
          entries.push({
            type: currentEntry.type,
            key: currentEntry.key,
            fields: currentEntry.fields,
          });
        }

        // 解析新条目
        const match = trimmedLine.match(/@(\w+)\s*\{\s*([^,]+)\s*,/);
        if (match) {
          currentEntry = {
            type: match[1].toLowerCase(),
            key: match[2].trim(),
            fields: {},
          };
          currentField = '';
          currentValue = '';
        }
        continue;
      }

      // 解析字段
      if (currentEntry && currentEntry.fields) {
        const fieldMatch = trimmedLine.match(/^(\w+)\s*=\s*(.+)$/);

        if (fieldMatch) {
          // 保存上一个字段
          if (currentField && currentValue) {
            currentEntry.fields[currentField] = this.cleanValue(currentValue);
          }

          currentField = fieldMatch[1].toLowerCase();
          currentValue = fieldMatch[2];
        } else if (currentField) {
          // 续行
          currentValue += ' ' + trimmedLine;
        }

        // 条目结束
        if (trimmedLine === '}') {
          if (currentField && currentValue) {
            currentEntry.fields[currentField] = this.cleanValue(currentValue);
          }

          if (currentEntry.type && currentEntry.key) {
            entries.push({
              type: currentEntry.type,
              key: currentEntry.key,
              fields: currentEntry.fields,
            });
          }

          currentEntry = null;
          currentField = '';
          currentValue = '';
        }
      }
    }

    // 保存最后一个条目
    if (currentEntry && currentEntry.type && currentEntry.key && currentEntry.fields) {
      entries.push({
        type: currentEntry.type,
        key: currentEntry.key,
        fields: currentEntry.fields,
      });
    }

    return entries;
  }

  /**
   * 清理字段值
   */
  private static cleanValue(value: string): string {
    let cleaned = value.trim();

    // 移除结尾的逗号
    if (cleaned.endsWith(',')) {
      cleaned = cleaned.slice(0, -1);
    }

    // 移除大括号包围
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      cleaned = cleaned.slice(1, -1);
    }

    // 移除引号包围
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    return cleaned.trim();
  }

  /**
   * 将 BibTeX 条目转换为 Reference 对象
   */
  static toReference(entry: BibTeXEntry, projectId: string): any {
    const authors = this.parseAuthors(entry.fields.author || entry.fields.authors || '');

    return {
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      type: this.mapType(entry.type),
      key: entry.key,
      authors,
      title: entry.fields.title || '',
      journal: entry.fields.journal || entry.fields.booktitle || '',
      year: parseInt(entry.fields.year) || new Date().getFullYear(),
      volume: entry.fields.volume || '',
      issue: entry.fields.number || '',
      pages: entry.fields.pages || '',
      publisher: entry.fields.publisher || '',
      doi: entry.fields.doi || '',
      url: entry.fields.url || '',
      bibtex: `@${entry.type}{${entry.key},\n${Object.entries(entry.fields)
        .map(([k, v]) => `  ${k} = {${v}}`)
        .join(',\n')}\n}`,
    };
  }

  /**
   * 解析作者列表
   */
  private static parseAuthors(authorString: string): any[] {
    if (!authorString) return [];

    const authors = authorString.split(/\s+and\s+/);

    return authors.map((author) => {
      const parts = author.trim().split(',');

      if (parts.length === 2) {
        // LastName, FirstName 格式
        return {
          lastName: parts[0].trim(),
          firstName: parts[1].trim(),
        };
      } else {
        // FirstName LastName 格式
        const nameParts = author.trim().split(/\s+/);
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ');

        return {
          lastName,
          firstName,
        };
      }
    });
  }

  /**
   * 映射文献类型
   */
  private static mapType(bibtexType: string): string {
    const typeMap: Record<string, string> = {
      article: 'journal',
      inproceedings: 'conference',
      conference: 'conference',
      book: 'book',
      phdthesis: 'thesis',
      mastersthesis: 'thesis',
      misc: 'web',
      techreport: 'journal',
    };

    return typeMap[bibtexType.toLowerCase()] || 'journal';
  }
}

export const bibtexParser = new BibTeXParser();
