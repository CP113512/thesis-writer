/**
 * GB/T-7714 参考文献格式解析器
 * 支持解析格式如:
 * [1] 高飞.科研奖励查重系统开发及省部级平台应用探索[J].软件,2026,47(01):12-15+74.
 * [2] 芦东.PET酶促降解催化剂的设计与应用开发[D].北京化工大学,2025.DOI:10.26939/d.cnki.gbhgu.2025.002110.
 */

export interface ParsedReference {
  type: 'journal' | 'conference' | 'book' | 'thesis' | 'web' | 'standard' | 'newspaper';
  authors: { lastName: string; firstName: string }[];
  title: string;
  journal?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  url?: string;
  doi?: string;
  standardNumber?: string; // 标准号
}

export class GBRefParser {
  /**
   * 批量解析 GB/T-7714 格式的参考文献
   */
  static parseBatch(text: string): ParsedReference[] {
    const results: ParsedReference[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 尝试移除行首的序号 [1] 或 1. 或 1
      const cleanedLine = this.removeLineNumber(trimmed);
      if (!cleanedLine) continue;

      const parsed = this.parseSingle(cleanedLine);
      if (parsed) {
        results.push(parsed);
      }
    }

    return results;
  }

  /**
   * 移除行首序号
   */
  private static removeLineNumber(line: string): string {
    // 匹配 [1] 或 1. 或 1、或 1 空格
    return line
      .replace(/^\s*\[\s*\d+\s*\]\s*/, '')
      .replace(/^\s*\d+\s*[.、\s]\s*/, '')
      .trim();
  }

  /**
   * 提取 DOI
   */
  private static extractDOI(text: string): { text: string; doi: string } {
    const doiMatch = text.match(/DOI:\s*(10\.\d{4,}\/[^\s.]+(?:\.[^\s.]+)*)/i);
    if (doiMatch) {
      const doi = doiMatch[1];
      const cleanedText = text.replace(/DOI:\s*10\.\d{4,}\/[^\s.]+(?:\.[^\s.]+)*/i, '').trim();
      // 清理末尾的句点
      return { text: cleanedText.replace(/\.\s*$/, ''), doi };
    }
    return { text, doi: '' };
  }

  /**
   * 解析单条 GB/T-7714 格式参考文献
   */
  static parseSingle(text: string): ParsedReference | null {
    // 先提取 DOI
    const { text: textWithoutDOI, doi } = this.extractDOI(text);

    // 期刊论文 [J]
    // 格式: 作者.题名[J].刊名,年,卷(期):起止页码.
    const journalMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[J\]\.\s*(.+?),\s*(\d{4})(?:,\s*(\d+)\s*(?:\((\d+)\))?(?::\s*(.+?))?)?\.?$/
    );
    if (journalMatch) {
      return {
        type: 'journal',
        authors: this.parseAuthors(journalMatch[1]),
        title: journalMatch[2],
        journal: journalMatch[3],
        year: parseInt(journalMatch[4]),
        volume: journalMatch[5] || '',
        issue: journalMatch[6] || '',
        pages: this.cleanPages(journalMatch[7]),
        doi,
      };
    }

    // 会议论文 [C] 或 [C]//
    // 格式: 作者.题名[C].会议名,年:起止页码.
    const conferenceMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[C\](?:\/\/)?\s*([^,]+),\s*(\d{4})(?::\s*(.+?))?\.?$/
    );
    if (conferenceMatch) {
      return {
        type: 'conference',
        authors: this.parseAuthors(conferenceMatch[1]),
        title: conferenceMatch[2],
        journal: conferenceMatch[3].trim(),
        year: parseInt(conferenceMatch[4]),
        pages: this.cleanPages(conferenceMatch[5]),
        doi,
      };
    }

    // 书籍 [M]
    // 格式: 作者.书名[M].出版地:出版社,年.
    const bookMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?):\s*(.+?),\s*(\d{4})\.?$/
    );
    if (bookMatch) {
      return {
        type: 'book',
        authors: this.parseAuthors(bookMatch[1]),
        title: bookMatch[2],
        publisher: bookMatch[4],
        year: parseInt(bookMatch[5]),
        doi,
      };
    }

    // 学位论文 [D]
    // 格式: 作者.题名[D].城市:学校,年. 或 作者.题名[D].学校,年.
    const thesisMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[D\]\.\s*(?:(.+?):\s*)?(.+?),\s*(\d{4})\.?$/
    );
    if (thesisMatch) {
      return {
        type: 'thesis',
        authors: this.parseAuthors(thesisMatch[1]),
        title: thesisMatch[2],
        publisher: thesisMatch[4], // 学校
        year: parseInt(thesisMatch[5]),
        doi,
      };
    }

    // 标准 [S]
    // 格式: 标准名[S].标准号,年.
    const standardMatch = textWithoutDOI.match(
      /^(.+?)\s*\[S\]\.\s*(.+?),\s*(\d{4})\.?$/
    );
    if (standardMatch) {
      return {
        type: 'journal',
        authors: [],
        title: standardMatch[1],
        standardNumber: standardMatch[2],
        year: parseInt(standardMatch[3]),
        doi,
      };
    }

    // 报纸 [N]
    // 格式: 作者.题名[N].报纸名,年-月-日(版次).
    const newspaperMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[N\]\.\s*(.+?),\s*(\d{4}-\d{2}-\d{2})(?:\((\d+)\))?\.?$/
    );
    if (newspaperMatch) {
      return {
        type: 'journal',
        authors: this.parseAuthors(newspaperMatch[1]),
        title: newspaperMatch[2],
        journal: newspaperMatch[3],
        year: parseInt(newspaperMatch[4].substring(0, 4)),
        issue: newspaperMatch[5] || '',
        doi,
      };
    }

    // 网络资源 [EB/OL]
    // 格式: 作者.题名[EB/OL].网址,访问日期.
    const webMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[EB\/OL\]\.\s*(.+?),\s*(\d{4}[-/]\d{2}[-/]\d{2})?\.?$/
    );
    if (webMatch) {
      return {
        type: 'web',
        authors: this.parseAuthors(webMatch[1]),
        title: webMatch[2],
        url: webMatch[3],
        year: webMatch[4] ? parseInt(webMatch[4].substring(0, 4)) : new Date().getFullYear(),
        doi,
      };
    }

    // 报告 [R]
    // 格式: 作者.题名[R].出版地:出版者,年.
    const reportMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[R\]\.\s*(.+?):\s*(.+?),\s*(\d{4})\.?$/
    );
    if (reportMatch) {
      return {
        type: 'journal',
        authors: this.parseAuthors(reportMatch[1]),
        title: reportMatch[2],
        publisher: reportMatch[4],
        year: parseInt(reportMatch[5]),
        doi,
      };
    }

    // 专利 [P]
    // 格式: 专利所有者.专利名[P].国名:专利号,发布日期.
    const patentMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[P\]\.\s*(.+?):\s*(.+?),\s*(\d{4}[-/]\d{2}[-/]\d{2})\.?$/
    );
    if (patentMatch) {
      return {
        type: 'journal',
        authors: this.parseAuthors(patentMatch[1]),
        title: patentMatch[2],
        publisher: patentMatch[4],
        year: parseInt(patentMatch[5].substring(0, 4)),
        doi,
      };
    }

    // 如果都不匹配，尝试基本解析
    const basicMatch = textWithoutDOI.match(
      /^(.+?)\.\s*(.+?)\s*\[([A-Z\/]+)\]\.\s*(.+?),\s*(\d{4})/
    );
    if (basicMatch) {
      return {
        type: 'journal',
        authors: this.parseAuthors(basicMatch[1]),
        title: basicMatch[2],
        journal: basicMatch[4],
        year: parseInt(basicMatch[5]),
        doi,
      };
    }

    return null;
  }

  /**
   * 解析作者列表
   * 支持格式: "高飞" "张三,李四" "Wang J, Li M" "王明, 李华"
   */
  private static parseAuthors(authorString: string): { lastName: string; firstName: string }[] {
    if (!authorString) return [];

    // 分割作者，支持逗号、顿号、分号
    const authorList = authorString.split(/[,，、;；]\s*/);

    return authorList.map(author => {
      author = author.trim();
      if (!author) return { lastName: '', firstName: '' };

      // 西文作者: "Wang J" 或 "Wang J S" 格式
      if (/^[A-Za-z]/.test(author)) {
        const parts = author.split(/\s+/);
        if (parts.length === 1) {
          return { lastName: parts[0], firstName: '' };
        }
        // 最后一个是姓，前面是名
        const lastName = parts[parts.length - 1];
        const firstName = parts.slice(0, -1).join(' ');
        return { lastName, firstName };
      }

      // 中文作者: 通常是 "姓+名" 连写
      // 假设第一个字是姓，后面是名（简化处理）
      if (author.length === 1) {
        return { lastName: author, firstName: '' };
      } else if (author.length === 2) {
        return { lastName: author[0], firstName: author[1] };
      } else if (author.length === 3) {
        // 复姓处理（简单）
        const compoundSurnames = ['欧阳', '司马', '上官', '诸葛', '东方', '皇甫', '尉迟', '公孙', '慕容', '端木'];
        for (const compound of compoundSurnames) {
          if (author.startsWith(compound)) {
            return { lastName: compound, firstName: author.substring(2) };
          }
        }
        return { lastName: author[0], firstName: author.substring(1) };
      } else {
        // 4字及以上，假设第一个是姓
        return { lastName: author[0], firstName: author.substring(1) };
      }
    }).filter(a => a.lastName || a.firstName);
  }

  /**
   * 清理页码格式
   */
  private static cleanPages(pages?: string): string {
    if (!pages) return '';
    // 处理 "12-15+74" 这种格式，保留原样
    return pages.trim();
  }

  /**
   * 将 ParsedReference 转换为 Reference 对象
   */
  static toReference(parsed: ParsedReference, projectId: string): any {
    return {
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      type: parsed.type,
      key: `ref${Date.now()}`,
      authors: parsed.authors,
      title: parsed.title,
      journal: parsed.journal,
      year: parsed.year,
      volume: parsed.volume || '',
      issue: parsed.issue || '',
      pages: parsed.pages || '',
      publisher: parsed.publisher || '',
      url: parsed.url || '',
      doi: parsed.doi || '',
    };
  }
}
