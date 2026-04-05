import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  convertInchesToTwip,
  TableOfContents,
  StyleLevel,
  File,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';

// 日志文件路径 - 使用用户数据目录
let logFile: string | null = null;

function getLogFile(): string {
  if (!logFile) {
    logFile = path.join(app.getPath('userData'), 'export.log');
  }
  return logFile;
}

function log(message: string): void {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    // 使用异步写入避免阻塞主进程
    fs.promises.appendFile(getLogFile(), logMessage).catch(() => {
      // 忽略写入错误
    });
  } catch {
    // 忽略错误
  }
}

interface Chapter {
  id: string;
  title: string;
  level: number;
  number: string;
  content: string;
  isFixed: boolean;
  children: Chapter[];
}

interface Reference {
  id: string;
  type: string;
  authors: Array<{ firstName: string; lastName: string }>;
  title: string;
  journal?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
}

// 论文元数据
interface ThesisMetadata {
  title?: string;
  author?: string;
  studentId?: string;
  major?: string;
  college?: string;
  advisor?: string;
  advisorTitle?: string;
  completionDate?: string;
  abstractZh?: string;
  keywordsZh?: string;
  abstractEn?: string;
  keywordsEn?: string;
}

// 导出时的上下文，用于跟踪编号
interface ExportContext {
  figureCounter: number;       // 章节内图片计数
  tableCounter: number;        // 章节内表格计数
  citationOrder: string[];     // 引用出现顺序（referenceId数组）
  citationNumbers: Map<string, number>; // 引用ID到编号的映射
  chapterNumber: string;       // 当前章节编号
  figureNumbers: Map<string, string>; // 图片alt到编号的映射
  tableNumbers: Map<string, string>;  // 表格alt到编号的映射
  romanPageNumber: number;     // 罗马数字页码
  arabicPageNumber: number;    // 阿拉伯数字页码
}

// 特殊章节类型
type SpecialChapterType = 'cover' | 'titlePage' | 'abstractZh' | 'abstractEn' | 'contents' | 'reference' | 'acknowledgement' | 'appendix' | null;

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
  italic?: boolean;
  color?: string;
}

export class ExportService {
  /**
   * 导出项目到Word文档
   */
  async exportToWord(
    projectName: string,
    chapters: Chapter[],
    references: Reference[],
    templateConfig: TemplateConfig,
    outputPath?: string,
    metadata?: ThesisMetadata
  ): Promise<string> {
    // 如果没有指定输出路径,让用户选择
    if (!outputPath) {
      const result = await dialog.showSaveDialog({
        title: '保存Word文档',
        defaultPath: `${projectName}.docx`,
        filters: [{ name: 'Word文档', extensions: ['docx'] }],
      });

      if (result.canceled || !result.filePath) {
        throw new Error('用户取消导出');
      }

      outputPath = result.filePath;
    }

    // 创建文档
    const doc = await this.createDocument(chapters, references, templateConfig, metadata);

    // 保存文件
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  }

  /**
   * 创建Word文档 - 支持多节（前置部分罗马数字页码，正文阿拉伯数字页码）
   */
  private async createDocument(
    chapters: Chapter[],
    references: Reference[],
    config: TemplateConfig,
    metadata?: ThesisMetadata
  ): Promise<Document> {
    // 创建导出上下文
    const context: ExportContext = {
      figureCounter: 0,
      tableCounter: 0,
      citationOrder: [],
      citationNumbers: new Map(),
      chapterNumber: '',
      figureNumbers: new Map(),
      tableNumbers: new Map(),
      romanPageNumber: 0,
      arabicPageNumber: 0,
    };

    // 分离前置章节和正文章节
    const frontMatterChapters: Chapter[] = [];
    const bodyChapters: Chapter[] = [];

    // 识别章节类型
    for (const chapter of chapters) {
      const specialType = this.getSpecialChapterType(chapter);
      if (specialType === 'cover' || specialType === 'titlePage' ||
          specialType === 'abstractZh' || specialType === 'abstractEn' ||
          specialType === 'contents') {
        frontMatterChapters.push(chapter);
      } else {
        bodyChapters.push(chapter);
      }
    }

    // 检查是否已有参考文献章节
    const hasReferenceChapter = chapters.some(ch => ch.title === '参考文献');

    // 创建前置部分内容（封面、扉页、摘要、目录）
    const frontMatterChildren: (Paragraph | Table)[] = [];

    // 添加封面
    if (metadata) {
      frontMatterChildren.push(...this.createCoverPage(metadata, config));
      frontMatterChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // 添加扉页
      frontMatterChildren.push(...this.createTitlePage(metadata, config));
      frontMatterChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // 处理前置章节（摘要等）
    for (const chapter of frontMatterChapters) {
      const chapterItems = await this.createChapterContent(chapter, config, context, references, false);
      frontMatterChildren.push(...chapterItems);
    }

    // 添加目录
    frontMatterChildren.push(this.createTableOfContents(config));

    // 创建正文部分内容
    const bodyChildren: (Paragraph | Table)[] = [];

    // 添加正文章节
    for (let i = 0; i < bodyChapters.length; i++) {
      const chapterItems = await this.createChapterContent(bodyChapters[i], config, context, references, i === 0);
      bodyChildren.push(...chapterItems);
    }

    // 如果没有参考文献章节，才在最后添加参考文献标题
    if (!hasReferenceChapter && context.citationOrder.length > 0) {
      bodyChildren.push(new Paragraph({ text: '' })); // 空行
      bodyChildren.push(this.createHeadingParagraph('参考文献', 1, config));

      // 按引用顺序输出参考文献
      for (const refId of context.citationOrder) {
        const ref = references.find(r => r.id === refId);
        if (ref) {
          const citationNum = context.citationNumbers.get(refId) || 0;
          const refText = this.formatReference(ref, citationNum, config.reference?.style || 'GB/T-7714');
          bodyChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: refText,
                  font: config.fonts.reference?.family || '宋体',
                  size: this.ptToHalfPt(config.fonts.reference?.size || 10.5),
                }),
              ],
              indent: config.reference?.hangingIndent
                ? { hanging: this.cmToTwip((config.paragraph?.firstLineIndent || 2) * 0.35) }
                : undefined,
            })
          );
        }
      }
    }

    // 创建文档 - 使用多节结构
    const doc = new Document({
      sections: [
        // 第一节：前置部分（罗马数字页码）
        {
          properties: {
            page: {
              size: this.getPageSize(config.page.size),
              margin: {
                top: this.cmToTwip(config.page.margin.top),
                bottom: this.cmToTwip(config.page.margin.bottom),
                left: this.cmToTwip(config.page.margin.left),
                right: this.cmToTwip(config.page.margin.right),
              },
              pageNumbers: {
                formatType: NumberFormat.UPPER_ROMAN,
                start: 1,
              },
            },
            titlePage: true,
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: config.fonts.body?.family || '宋体',
                      size: this.ptToHalfPt(10.5),
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: frontMatterChildren,
        },
        // 第二节：正文部分（阿拉伯数字页码）
        {
          properties: {
            page: {
              size: this.getPageSize(config.page.size),
              margin: {
                top: this.cmToTwip(config.page.margin.top),
                bottom: this.cmToTwip(config.page.margin.bottom),
                left: this.cmToTwip(config.page.margin.left),
                right: this.cmToTwip(config.page.margin.right),
              },
              pageNumbers: {
                formatType: NumberFormat.DECIMAL,
                start: 1,
              },
            },
          },
          headers: this.createHeaders(config),
          footers: this.createFooters(config),
          children: bodyChildren,
        },
      ],
    });

    return doc;
  }

  /**
   * 获取特殊章节类型
   */
  private getSpecialChapterType(chapter: Chapter): SpecialChapterType {
    const title = chapter.title.trim();

    if (title.includes('封面') || title === '封皮') return 'cover';
    if (title.includes('扉页') || title === '题名页') return 'titlePage';
    if (title === '摘要' || title.includes('中文摘要')) return 'abstractZh';
    if (title === 'Abstract' || title.includes('英文摘要')) return 'abstractEn';
    if (title === '目录' || title === '目 录') return 'contents';
    if (title === '参考文献') return 'reference';
    if (title === '致谢') return 'acknowledgement';
    if (title === '附录') return 'appendix';

    return null;
  }

  /**
   * 创建封面页
   */
  private createCoverPage(metadata: ThesisMetadata, config: TemplateConfig): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // 学校名称 - 宋体小初号加黑，居中
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: config.header?.content || '郑州升达经贸管理学院',
          font: '宋体',
          size: this.ptToHalfPt(26), // 小初号约26pt
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }));

    // 空行
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));

    // "本科毕业论文（设计）" - 宋体二号加黑，居中
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: '本科毕业论文（设计）',
          font: '宋体',
          size: this.ptToHalfPt(22), // 二号
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }));

    // 空行
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));

    // 论文题目 - 三号黑体，居中
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: metadata.title || '',
          font: '黑体',
          size: this.ptToHalfPt(16), // 三号
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }));

    // 空行
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));

    // 学生信息表格
    const infoItems = [
      { label: '学生姓名', value: metadata.author || '' },
      { label: '专业班级', value: metadata.major || '' },
      { label: '学    号', value: metadata.studentId || '' },
      { label: '学    院', value: metadata.college || '' },
      { label: '指导教师', value: `${metadata.advisor || ''}（${metadata.advisorTitle || '讲师'}）` },
      { label: '完成时间', value: metadata.completionDate || '' },
    ];

    for (const item of infoItems) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `${item.label}                    ${item.value}`,
            font: '黑体',
            size: this.ptToHalfPt(14), // 四号
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));
    }

    return paragraphs;
  }

  /**
   * 创建扉页
   */
  private createTitlePage(metadata: ThesisMetadata, config: TemplateConfig): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // 学校名称 - 宋体小初号加黑，居中
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: config.header?.content || '郑州升达经贸管理学院',
          font: '宋体',
          size: this.ptToHalfPt(26),
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }));

    // 空行
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));

    // "本科毕业论文（设计）" - 宋体二号加黑，居中
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: '本科毕业论文（设计）',
          font: '宋体',
          size: this.ptToHalfPt(22),
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }));

    // 空行
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));

    // 论文题目
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: metadata.title || '',
          font: '黑体',
          size: this.ptToHalfPt(16),
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }));

    // 空行
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));

    // 学生信息
    const infoItems = [
      { label: '学生姓名', value: metadata.author || '' },
      { label: '专业班级', value: metadata.major || '' },
      { label: '学    号', value: metadata.studentId || '' },
      { label: '学    院', value: metadata.college || '' },
      { label: '指导教师', value: `${metadata.advisor || ''}（${metadata.advisorTitle || '讲师'}）` },
      { label: '完成时间', value: metadata.completionDate || '' },
    ];

    for (const item of infoItems) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `${item.label}                    ${item.value}`,
            font: '黑体',
            size: this.ptToHalfPt(14),
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));
    }

    return paragraphs;
  }

  /**
   * 创建目录
   */
  private createTableOfContents(config: TemplateConfig): Paragraph {
    // 目录标题
    const tocTitle = new Paragraph({
      children: [
        new TextRun({
          text: '目  录',
          font: config.fonts?.heading1?.family || '黑体',
          size: this.ptToHalfPt(config.fonts?.heading1?.size || 16),
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 },
    });

    // 创建目录域
    const toc = new TableOfContents('目录', {
      headingStyleRange: '1-3',
      stylesWithLevels: [
        new StyleLevel('Heading1', 1),
        new StyleLevel('Heading2', 2),
        new StyleLevel('Heading3', 3),
      ],
    });

    // 返回目录内容（注意：目录标题和目录域需要分开处理）
    // 由于 docx 库的限制，我们只能返回 Paragraph，目录需要通过 TableOfContents 单独处理
    // 这里先返回标题，目录内容需要在 sections.children 中添加 TableOfContents
    return tocTitle;
  }

  /**
   * 创建章节内容
   */
  private async createChapterContent(
    chapter: Chapter,
    config: TemplateConfig,
    context: ExportContext,
    references: Reference[],
    isFirstChapter: boolean = false
  ): Promise<(Paragraph | Table)[]> {
    const results: (Paragraph | Table)[] = [];

    // 获取特殊章节类型
    const specialType = this.getSpecialChapterType(chapter);

    // 更新章节编号（用于图表编号时只取章级别序号）
    // 例如：chapter.number 为 "1" 时取 "1"，为 "1.1" 时取 "1"，为 "1.1.1" 时取 "1"
    if (chapter.number) {
      const topLevelNumber = chapter.number.split('.')[0];
      log(`Chapter: ${chapter.title}, number: ${chapter.number}, level: ${chapter.level}, topLevelNumber: ${topLevelNumber}, currentContext: ${context.chapterNumber}`);
      // 只有当章级别变化时才更新，并重置计数器
      if (context.chapterNumber !== topLevelNumber) {
        log(`New chapter detected, resetting counters. Old: ${context.chapterNumber}, New: ${topLevelNumber}`);
        context.chapterNumber = topLevelNumber;
        // 进入新的一章时，重置图片和表格计数器
        context.figureCounter = 0;
        context.tableCounter = 0;
      }
    } else if (chapter.level === 1) {
      // 一级标题没有编号时（如摘要、致谢等），重置章节编号
      log(`Chapter without number: ${chapter.title}, clearing chapterNumber`);
      context.chapterNumber = '';
    }

    // 一级标题前添加分页符（每个一级标题换页，但第一个章节不加）
    if (chapter.level === 1 && !isFirstChapter) {
      results.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // 添加章节标题（带数字序号）
    let titleText = chapter.title;
    if (chapter.number) {
      // 所有级别标题都只显示数字序号
      titleText = `${chapter.number} ${chapter.title}`;
    }

    // 根据特殊章节类型创建标题
    if (specialType === 'abstractZh') {
      // 中文摘要标题：小三号黑体，居中
      results.push(this.createSpecialChapterTitle('摘  要', config, 'abstractZh'));
    } else if (specialType === 'abstractEn') {
      // 英文摘要标题：加粗4号 Times New Roman，居中
      results.push(this.createSpecialChapterTitle('Abstract', config, 'abstractEn'));
    } else if (specialType === 'acknowledgement') {
      // 致谢标题：居中
      results.push(this.createSpecialChapterTitle('致  谢', config, 'acknowledgement'));
    } else if (specialType === 'reference') {
      // 参考文献标题：居中
      results.push(this.createSpecialChapterTitle('参考文献', config, 'reference'));
    } else if (specialType === 'contents') {
      // 目录标题：四号黑体，居中
      results.push(this.createSpecialChapterTitle('目  录', config, 'contents'));
    } else {
      results.push(this.createHeadingParagraph(titleText, chapter.level, config));
    }

    // 如果是参考文献章节，输出参考文献列表（只输出被引用的）
    if (specialType === 'reference') {
      // 只按引用顺序输出被引用的参考文献
      if (context.citationOrder.length > 0) {
        for (const refId of context.citationOrder) {
          const ref = references.find(r => r.id === refId);
          if (ref) {
            const citationNum = context.citationNumbers.get(refId) || 0;
            const refText = this.formatReference(ref, citationNum, config.reference?.style || 'GB/T-7714');
            results.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: refText,
                    font: config.fonts.reference?.family || '宋体',
                    size: this.ptToHalfPt(config.fonts.reference?.size || 10.5),
                  }),
                ],
                indent: config.reference?.hangingIndent
                  ? { hanging: this.cmToTwip((config.paragraph?.firstLineIndent || 2) * 0.35) }
                  : undefined,
              })
            );
          }
        }
      }
      // 注意：如果没有引用任何文献，不输出参考文献列表
    }

    // 解析并添加章节内容（跳过第一个标题，因为已经在上面处理了）
    if (chapter.content) {
      try {
        const content = JSON.parse(chapter.content);

        log(`Processing chapter: ${chapter.title}, number: ${chapter.number}`);

        // 第一遍：扫描章节内容，为图片分配编号
        this.assignFigureNumbers(content, context, config);
        this.assignTableNumbers(content, context, config);
        log(`Assigned figure numbers: ${JSON.stringify(Object.fromEntries(context.figureNumbers))}`);
        log(`Assigned table numbers: ${JSON.stringify(Object.fromEntries(context.tableNumbers))}`);

        // 第二遍：解析内容
        const contentItems = this.parseEditorContent(content, config, context, true, specialType);
        log(`Generated ${contentItems.length} content items`);
        results.push(...contentItems);
      } catch (error) {
        log(`Failed to parse chapter content: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * 创建特殊章节标题
   */
  private createSpecialChapterTitle(
    title: string,
    config: TemplateConfig,
    type: 'abstractZh' | 'abstractEn' | 'contents' | 'reference' | 'acknowledgement'
  ): Paragraph {
    let fontConfig: FontConfig;

    switch (type) {
      case 'abstractZh':
        // 中文摘要：小三号黑体
        fontConfig = config.fonts?.heading2 || { family: '黑体', size: 15, bold: true };
        break;
      case 'abstractEn':
        // 英文摘要：加粗4号 Times New Roman
        fontConfig = { family: 'Times New Roman', size: 14, bold: true };
        break;
      case 'contents':
        // 目录：四号黑体
        fontConfig = config.fonts?.heading3 || { family: '黑体', size: 14, bold: true };
        break;
      case 'reference':
      case 'acknowledgement':
        // 参考文献、致谢：三号黑体
        fontConfig = config.fonts?.heading1 || { family: '黑体', size: 16, bold: true };
        break;
      default:
        fontConfig = config.fonts?.heading1 || { family: '黑体', size: 16, bold: true };
    }

    return new Paragraph({
      children: [
        new TextRun({
          text: title,
          font: fontConfig.family,
          size: this.ptToHalfPt(fontConfig.size),
          bold: fontConfig.bold,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 },
    });
  }

  /**
   * 为章节内的图片分配编号
   */
  private assignFigureNumbers(node: any, context: ExportContext, config: TemplateConfig): void {
    // 图片节点必须有 src，alt 可以为空（此时使用默认名称）
    if (node.type === 'image' && node.attrs?.src) {
      context.figureCounter++;
      // 根据配置决定编号格式
      const numberingFormat = config.figure?.numbering || '{chapter}-{number}';
      let figureNum: string;
      if (numberingFormat.includes('chapter') && context.chapterNumber) {
        figureNum = numberingFormat.replace('{chapter}', context.chapterNumber).replace('{number}', String(context.figureCounter));
      } else {
        figureNum = String(context.figureCounter);
      }
      // 使用 alt 作为标识符，如果没有 alt 则使用序号
      const figureKey = node.attrs.alt || `figure-${context.figureCounter}`;
      context.figureNumbers.set(figureKey, figureNum);
      log(`Assigned figure number: ${figureKey} -> ${figureNum}`);
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        this.assignFigureNumbers(child, context, config);
      }
    }
  }

  /**
   * 为章节内的表格分配编号
   */
  private assignTableNumbers(node: any, context: ExportContext, config: TemplateConfig): void {
    if (node.type === 'tableCaption' && node.attrs?.caption) {
      context.tableCounter++;
      // 根据配置决定编号格式
      const numberingFormat = config.table?.numbering || '{chapter}-{number}';
      let tableNum: string;
      if (numberingFormat.includes('chapter') && context.chapterNumber) {
        tableNum = numberingFormat.replace('{chapter}', context.chapterNumber).replace('{number}', String(context.tableCounter));
      } else {
        tableNum = String(context.tableCounter);
      }
      context.tableNumbers.set(node.attrs.caption, tableNum);
      log(`Assigned table number: ${node.attrs.caption} -> ${tableNum}`);
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        this.assignTableNumbers(child, context, config);
      }
    }
  }

  /**
   * 解析编辑器内容 - 返回 Paragraph 或 Table 的数组
   * @param skipFirstHeading 是否跳过第一个标题（因为章节标题已经单独处理）
   * @param specialType 特殊章节类型，用于处理摘要等特殊格式
   */
  private parseEditorContent(
    content: any,
    config: TemplateConfig,
    context: ExportContext,
    skipFirstHeading: boolean = false,
    specialType: SpecialChapterType = null
  ): (Paragraph | Table)[] {
    const results: (Paragraph | Table)[] = [];

    if (!content.content || !Array.isArray(content.content)) {
      return results;
    }

    let headingSkipped = false;
    const nodes = content.content;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // 如果需要跳过第一个标题，且还没有跳过过
      if (skipFirstHeading && !headingSkipped && node.type === 'heading') {
        headingSkipped = true;
        continue; // 跳过这个标题节点
      }

      // 特殊处理：关键词段落（中文摘要）
      if (specialType === 'abstractZh' && node.type === 'paragraph') {
        const text = this.extractText(node);
        if (text.startsWith('关键词') || text.startsWith('关键词：') || text.startsWith('关键词:')) {
          results.push(this.createKeywordsParagraph(text, config, 'zh'));
          continue;
        }
      }

      // 特殊处理：关键词段落（英文摘要）
      if (specialType === 'abstractEn' && node.type === 'paragraph') {
        const text = this.extractText(node);
        if (text.startsWith('Key words') || text.startsWith('Key words:') || text.startsWith('Key words：')) {
          results.push(this.createKeywordsParagraph(text, config, 'en'));
          continue;
        }
      }

      // 特殊处理：表格和表格标题的顺序
      if (node.type === 'table') {
        const nextNode = nodes[i + 1];

        // 检查下一个节点是否是 tableCaption
        if (nextNode?.type === 'tableCaption') {
          const tableCaption = this.parseTableCaption(nextNode, config, context);
          const table = this.parseTableWithCaption(node, config, context);

          // 根据配置决定标题位置
          const captionPosition = config.table?.captionPosition || 'above';
          if (captionPosition === 'above') {
            // 标题在表格上方
            results.push(tableCaption);
            results.push(...table);
          } else {
            // 标题在表格下方
            results.push(...table);
            results.push(tableCaption);
          }

          i++; // 跳过下一个节点（tableCaption）
          continue;
        }
      }

      // 跳过独立的 figureCaption 和 tableCaption 节点（它们已经在上面的逻辑中处理）
      if (node.type === 'figureCaption' || node.type === 'tableCaption') {
        // 检查前一个节点是否是表格或图片
        const prevNode = nodes[i - 1];
        if (prevNode?.type === 'table' || prevNode?.type === 'image') {
          continue; // 已经在上面处理过了
        }
        // 否则独立处理（这种情况理论上不应该发生）
      }

      // 普通节点处理
      const result = this.parseNode(node, config, context);
      if (result) {
        if (Array.isArray(result)) {
          results.push(...result);
        } else {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * 创建关键词段落
   */
  private createKeywordsParagraph(text: string, config: TemplateConfig, lang: 'zh' | 'en'): Paragraph {
    // 解析关键词文本
    let labelText: string;
    let keywordsText: string;

    if (lang === 'zh') {
      // 中文关键词
      const match = text.match(/^关键词[：:]\s*(.+)$/);
      labelText = '关键词：';
      keywordsText = match ? match[1] : text.replace(/^关键词[：:]?\s*/, '');
    } else {
      // 英文关键词
      const match = text.match(/^Key words[：:]\s*(.+)$/i);
      labelText = 'Key words：';
      keywordsText = match ? match[1] : text.replace(/^Key words[：:]?\s*/i, '');
    }

    const children: TextRun[] = [];

    // 标签部分
    if (lang === 'zh') {
      // 中文："关键词："用小四号黑体
      children.push(new TextRun({
        text: labelText,
        font: config.fonts?.heading4?.family || '黑体',
        size: this.ptToHalfPt(config.fonts?.heading4?.size || 12),
        bold: config.fonts?.heading4?.bold ?? true,
      }));
      // 关键词内容用小四号宋体
      children.push(new TextRun({
        text: keywordsText,
        font: config.fonts.body?.family || '宋体',
        size: this.ptToHalfPt(config.fonts.body?.size || 12),
      }));
    } else {
      // 英文："Key words："用加粗小四号 Times New Roman
      children.push(new TextRun({
        text: labelText,
        font: 'Times New Roman',
        size: this.ptToHalfPt(12),
        bold: true,
      }));
      // 关键词内容用小四号 Times New Roman
      children.push(new TextRun({
        text: keywordsText,
        font: 'Times New Roman',
        size: this.ptToHalfPt(12),
      }));
    }

    return new Paragraph({
      children: children,
      spacing: { before: 240, after: 120 },
    });
  }

  /**
   * 解析单个节点 - 返回 Paragraph、Table 或数组
   */
  private parseNode(node: any, config: TemplateConfig, context: ExportContext): (Paragraph | Table)[] | Paragraph | Table | null {
    switch (node.type) {
      case 'paragraph':
        return [this.parseParagraph(node, config, context)];

      case 'heading':
        return this.parseHeading(node, config);

      case 'table':
        return this.parseTableWithCaption(node, config, context);

      case 'image':
        return this.parseImageWithCaption(node, config, context);

      case 'figureCaption':
        return this.parseFigureCaption(node, config, context);

      case 'tableCaption':
        return this.parseTableCaption(node, config, context);

      case 'codeBlock':
        return this.parseCodeBlock(node, config);

      default:
        return null;
    }
  }

  /**
   * 解析段落
   */
  private parseParagraph(node: any, config: TemplateConfig, context: ExportContext): Paragraph {
    const children: TextRun[] = [];

    if (node.content) {
      for (const child of node.content) {
        if (child.type === 'text') {
          let text = child.text || '';

          // 处理引用占位符 {{ref:xxx}}
          const citationRegex = /\{\{ref:([^}]+)\}\}/g;
          let lastIndex = 0;
          const matches = [...text.matchAll(citationRegex)];

          if (matches.length > 0) {
            for (const match of matches) {
              // 添加占位符前的文本
              if (match.index! > lastIndex) {
                const beforeText = text.slice(lastIndex, match.index);
                children.push(this.createTextRun(beforeText, child, config));
              }

              // 处理引用
              const refId = match[1];
              this.addCitation(refId, context);
              const citationNum = context.citationNumbers.get(refId) || 0;
              children.push(new TextRun({
                text: `[${citationNum}]`,
                font: config.fonts.body?.family || '宋体',
                size: this.ptToHalfPt(config.fonts.body?.size || 12),
                superScript: true,
              }));

              lastIndex = match.index! + match[0].length;
            }

            // 添加最后的文本
            if (lastIndex < text.length) {
              children.push(this.createTextRun(text.slice(lastIndex), child, config));
            }
          } else {
            children.push(this.createTextRun(text, child, config));
          }
        } else if (child.type === 'citation') {
          // 处理 citation 节点
          const refId = child.attrs?.referenceId;
          log(`Found citation node, refId: ${refId}`);
          if (refId) {
            this.addCitation(refId, context);
            const citationNum = context.citationNumbers.get(refId) || 0;
            log(`Citation number for ${refId}: ${citationNum}`);
            children.push(new TextRun({
              text: `[${citationNum}]`,
              font: config.fonts.body?.family || '宋体',
              size: this.ptToHalfPt(config.fonts.body?.size || 12),
              superScript: true,
            }));
          }
        } else if (child.type === 'figureRef') {
          // 处理图片引用节点
          const figureAlt = child.attrs?.figureAlt;
          log(`Found figureRef node, figureAlt: ${figureAlt}`);
          if (figureAlt) {
            const figureNum = context.figureNumbers.get(figureAlt) || 'X-X';
            log(`Figure number for ${figureAlt}: ${figureNum}`);
            children.push(new TextRun({
              text: `图${figureNum}`,
              font: config.fonts.body?.family || '宋体',
              size: this.ptToHalfPt(config.fonts.body?.size || 12),
            }));
          }
        } else if (child.type === 'tableRef') {
          // 处理表格引用节点
          const tableAlt = child.attrs?.tableAlt;
          log(`Found tableRef node, tableAlt: ${tableAlt}`);
          if (tableAlt) {
            const tableNum = context.tableNumbers.get(tableAlt) || 'X-X';
            log(`Table number for ${tableAlt}: ${tableNum}`);
            children.push(new TextRun({
              text: `表${tableNum}`,
              font: config.fonts.body?.family || '宋体',
              size: this.ptToHalfPt(config.fonts.body?.size || 12),
            }));
          }
        }
      }
    }

    // 首行缩进：使用配置的字符数 * 字体大小
    // 例如 2字符 * 12pt = 24pt 缩进
    // docx 库需要 twip 单位 (1 pt = 20 twip)
    const fontSize = config.fonts.body?.size || 12;
    const indentChars = config.paragraph?.firstLineIndent || 2;
    const firstLineIndentPt = fontSize * indentChars;
    const firstLineIndentTwip = this.ptToTwip(firstLineIndentPt);

    return new Paragraph({
      children: children.length > 0 ? children : [new TextRun('')],
      alignment: config.paragraph?.alignment === 'justify'
        ? AlignmentType.JUSTIFIED
        : AlignmentType.LEFT,
      indent: { firstLine: firstLineIndentTwip },
      spacing: { line: this.lineHeightToTwip(config.paragraph?.lineHeight || 1.5) },
    });
  }

  /**
   * 创建文本运行
   */
  private createTextRun(text: string, node: any, config: TemplateConfig): TextRun {
    const fontFamily = this.containsChinese(text)
      ? (config.fonts.body?.family || '宋体')
      : (config.fonts.bodyEn?.family || config.fonts.body?.family || 'Times New Roman');

    return new TextRun({
      text: text,
      font: fontFamily,
      size: this.ptToHalfPt(config.fonts.body?.size || 12),
      bold: node.marks?.some((m: any) => m.type === 'bold'),
      italics: node.marks?.some((m: any) => m.type === 'italic'),
    });
  }

  /**
   * 创建标题段落（统一样式处理）
   * @param text 标题文本
   * @param level 标题级别 (1, 2, 3, 4)
   * @param config 模板配置
   */
  private createHeadingParagraph(text: string, level: number, config: TemplateConfig): Paragraph {
    const fontConfigKey = `heading${Math.min(level, 4)}` as 'heading1' | 'heading2' | 'heading3' | 'heading4';
    const fontConfig = config.fonts?.[fontConfigKey] || config.fonts?.heading1;

    // 特殊章节标题居中：摘要、Abstract、目录、参考文献、致谢
    const specialChapters = ['摘要', 'Abstract', '目录', '参考文献', '致谢'];
    const isSpecialChapter = level === 1 && specialChapters.some(ch => text.includes(ch));

    // 标题间距：一级标题距下文双倍行距（约480twip），其他标题正常间距
    const spacingAfter = level === 1 ? 480 : 120;

    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          font: fontConfig?.family || '黑体',
          size: this.ptToHalfPt(fontConfig?.size || 16),
          bold: fontConfig?.bold ?? true,
          color: '000000',
        }),
      ],
      heading: this.getHeadingLevel(level),
      alignment: isSpecialChapter ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 240, after: spacingAfter },
    });
  }

  /**
   * 添加引用到上下文
   */
  private addCitation(refId: string, context: ExportContext): void {
    if (!context.citationNumbers.has(refId)) {
      context.citationOrder.push(refId);
      context.citationNumbers.set(refId, context.citationOrder.length);
    }
  }

  /**
   * 解析标题
   */
  private parseHeading(node: any, config: TemplateConfig): Paragraph {
    const level = node.attrs?.level || 1;
    const text = this.extractText(node);
    return this.createHeadingParagraph(text, level, config);
  }

  /**
   * 解析代码块
   */
  private parseCodeBlock(node: any, config: TemplateConfig): Paragraph {
    const codeText = this.extractText(node);

    return new Paragraph({
      children: [
        new TextRun({
          text: codeText,
          font: 'Courier New',
          size: this.ptToHalfPt(10.5),
        }),
      ],
      spacing: { before: 120, after: 120, line: 276 }, // 1.15 倍行距
    });
  }

  /**
   * 解析表格 - 返回表格和标题（三线表格式）
   */
  private parseTableWithCaption(node: any, config: TemplateConfig, context: ExportContext): (Paragraph | Table)[] {
    const results: (Paragraph | Table)[] = [];
    const rows: TableRow[] = [];
    const totalRows = node.content?.length || 0;
    let columnCount = 0;

    // 先获取列数
    if (node.content && node.content[0]?.content) {
      columnCount = node.content[0].content.filter(
        (c: any) => c.type === 'tableCell' || c.type === 'tableHeader'
      ).length;
    }

    if (node.content) {
      for (let rowIndex = 0; rowIndex < node.content.length; rowIndex++) {
        const rowNode = node.content[rowIndex];
        if (rowNode.type === 'tableRow') {
          const cells: TableCell[] = [];
          const isFirstRow = rowIndex === 0;
          const isLastRow = rowIndex === totalRows - 1;

          if (rowNode.content) {
            for (const cellNode of rowNode.content) {
              if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
                const cellContent = this.extractText(cellNode);
                const isHeader = cellNode.type === 'tableHeader' || isFirstRow;

                // 三线表边框设置
                const cellBorders: any = {
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                };

                if (isFirstRow) {
                  // 表头行：顶部粗线，底部细线
                  cellBorders.top = { style: BorderStyle.SINGLE, size: 15, color: '000000' };
                  cellBorders.bottom = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
                } else if (isLastRow) {
                  // 最后一行：底部粗线
                  cellBorders.bottom = { style: BorderStyle.SINGLE, size: 15, color: '000000' };
                }

                cells.push(
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cellContent,
                            // 表格内容使用五号宋体（10.5pt）
                            font: config.fonts.caption?.family || '宋体',
                            size: this.ptToHalfPt(config.fonts.caption?.size || 10.5),
                            bold: isHeader,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 100 / columnCount, type: WidthType.PERCENTAGE },
                    borders: cellBorders,
                  })
                );
              }
            }
          }

          rows.push(new TableRow({ children: cells }));
        }
      }
    }

    // 只添加表格，表格标题由 tableCaption 节点处理
    results.push(new Table({
      rows: rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));

    return results;
  }

  /**
   * 解析表格名称节点
   */
  private parseTableCaption(node: any, config: TemplateConfig, context: ExportContext): Paragraph {
    const caption = node.attrs?.caption || '';
    const tableNum = context.tableNumbers.get(caption) || '';

    // 规范化表名
    const normalizedCaption = this.normalizeTableCaption(caption);

    return new Paragraph({
      children: [
        new TextRun({
          text: `表${tableNum} ${normalizedCaption}`,
          font: config.fonts.caption?.family || '宋体',
          size: this.ptToHalfPt(config.fonts.caption?.size || 10.5),
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 120 },
    });
  }

  /**
   * 解析图片 - 返回图片和标题
   */
  private parseImageWithCaption(node: any, config: TemplateConfig, context: ExportContext): (Paragraph | Table)[] {
    const results: (Paragraph | Table)[] = [];
    const src = node.attrs?.src;
    const alt = node.attrs?.alt || '';

    log(`Parsing image, alt: "${alt}", src length: ${src?.length}`);

    if (!src) {
      log(`No src found, skipping image`);
      return results;
    }

    // 如果是 base64 图片
    if (src.startsWith('data:')) {
      try {
        const matches = src.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          // 使用 alt 作为 key，如果没有 alt 则使用默认 key
          const figureKey = alt || `figure-${context.figureCounter}`;

          // 获取已分配的图片编号
          const figureNum = context.figureNumbers.get(figureKey);
          log(`Looking for figure number with key: "${figureKey}", found: ${figureNum}`);

          if (!figureNum) {
            log(`WARNING: Figure number not found for key "${figureKey}"`);
          }

          // 规范化图名
          const normalizedCaption = this.normalizeFigureCaption(alt);

          // 创建图片标题
          const captionParagraph = new Paragraph({
            children: [
              new TextRun({
                text: `图${figureNum || 'X-X'} ${normalizedCaption}`,
                font: config.fonts.caption?.family || '宋体',
                size: this.ptToHalfPt(config.fonts.caption?.size || 10.5),
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 120 },
          });

          // 获取图片实际尺寸并按比例缩放
          const imageDimensions = this.getImageDimensions(buffer);
          const maxWidth = 450; // 最大宽度（像素，约12cm）
          let imageWidth = imageDimensions.width;
          let imageHeight = imageDimensions.height;

          if (imageWidth > maxWidth) {
            const ratio = maxWidth / imageWidth;
            imageWidth = maxWidth;
            imageHeight = Math.round(imageHeight * ratio);
          }

          // 创建图片段落
          const imageParagraph = new Paragraph({
            children: [
              new ImageRun({
                data: buffer,
                transformation: {
                  width: imageWidth,
                  height: imageHeight,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          });

          // 根据配置决定标题位置
          const captionPosition = config.figure?.captionPosition || 'below';
          if (captionPosition === 'above') {
            log(`Adding figure caption ABOVE image: 图${figureNum} ${alt}`);
            results.push(captionParagraph);
            results.push(imageParagraph);
          } else {
            log(`Adding figure caption BELOW image: 图${figureNum} ${alt}`);
            results.push(imageParagraph);
            results.push(captionParagraph);
          }
        } else {
          log(`Failed to match base64 pattern`);
        }
      } catch (error) {
        log(`Failed to parse image: ${(error as Error).message}`);
      }
    } else {
      log(`Src is not base64, skipping`);
    }

    return results;
  }

  /**
   * 获取图片实际尺寸
   */
  private getImageDimensions(buffer: Buffer): { width: number; height: number } {
    // 默认尺寸
    const defaultSize = { width: 400, height: 300 };

    try {
      // PNG 格式
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
      // JPEG 格式 (FFD8FF)
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        let offset = 2;
        while (offset < buffer.length - 4) {
          if (buffer[offset] !== 0xFF) {
            offset++;
            continue;
          }
          const marker = buffer[offset + 1];
          // SOF0, SOF1, SOF2 等标记
          if ((marker >= 0xC0 && marker <= 0xCF) && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          // 跳过当前段
          const segmentLength = buffer.readUInt16BE(offset + 2);
          offset += 2 + segmentLength;
        }
      }
    } catch (error) {
      log(`Failed to get image dimensions: ${(error as Error).message}`);
    }

    return defaultSize;
  }

  /**
   * 解析图名节点
   */
  private parseFigureCaption(node: any, config: TemplateConfig, context: ExportContext): Paragraph[] {
    const results: Paragraph[] = [];
    const caption = node.attrs?.caption || '';

    // 增加图片计数
    context.figureCounter++;
    const figureNum = context.chapterNumber
      ? `${context.chapterNumber}-${context.figureCounter}`
      : String(context.figureCounter);

    // 规范化图名
    const normalizedCaption = this.normalizeFigureCaption(caption);

    // 添加图名
    results.push(new Paragraph({
      children: [
        new TextRun({
          text: `图${figureNum} ${normalizedCaption}`,
          font: config.fonts.caption?.family || '宋体',
          size: this.ptToHalfPt(config.fonts.caption?.size || 10.5),
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 120 },
    }));

    return results;
  }

  /**
   * 提取文本内容
   */
  private extractText(node: any): string {
    if (node.text) {
      return node.text;
    }

    if (node.content) {
      return node.content.map((child: any) => this.extractText(child)).join('');
    }

    return '';
  }

  /**
   * 格式化参考文献 - 支持 GB/T-7714 多种文献类型
   */
  private formatReference(
    ref: Reference,
    index: number,
    style: string
  ): string {
    const authors = this.formatAuthors(ref.authors);
    const typeLabel = this.getReferenceTypeLabel(ref.type);

    switch (style) {
      case 'GB/T-7714':
        return this.formatReferenceGBT7714(ref, index, authors, typeLabel);

      default:
        return `[${index}] ${authors}. ${ref.title}. ${ref.journal || ref.publisher}, ${ref.year}.`;
    }
  }

  /**
   * 格式化作者列表
   */
  private formatAuthors(authors: Array<{ firstName: string; lastName: string }>): string {
    if (!authors || authors.length === 0) {
      return '佚名';
    }

    if (authors.length <= 3) {
      return authors.map(a => `${a.lastName}${a.firstName}`).join(', ');
    }

    // 超过3位作者，只列前3位，后加"，等"
    return `${authors.slice(0, 3).map(a => `${a.lastName}${a.firstName}`).join(', ')}，等`;
  }

  /**
   * 获取参考文献类型标识
   */
  private getReferenceTypeLabel(type: string): string {
    const typeLabels: Record<string, string> = {
      journal: 'J',           // 期刊文章
      book: 'M',              // 专著
      thesis: 'D',            // 学位论文
      conference: 'C',        // 会议论文
      report: 'R',            // 报告
      standard: 'S',          // 标准
      patent: 'P',            // 专利
      newspaper: 'N',         // 报纸文章
      web: 'EB/OL',           // 电子资源
      software: 'CP/DK',      // 计算机程序
      database: 'DB/OL',      // 数据库
      archive: 'A',           // 档案
      map: 'CM',              // 地图
      score: 'M',             // 乐谱
      misc: 'Z',              // 其他
    };

    return typeLabels[type] || 'J';
  }

  /**
   * 按 GB/T-7714 格式化参考文献
   */
  private formatReferenceGBT7714(
    ref: Reference,
    index: number,
    authors: string,
    typeLabel: string
  ): string {
    const parts: string[] = [];

    // 序号
    parts.push(`[${index}]`);

    // 作者
    parts.push(`${authors}.`);

    // 题名 + 类型标识
    parts.push(`${ref.title}[${typeLabel}].`);

    // 根据文献类型处理其他信息
    switch (ref.type) {
      case 'journal':
        // 期刊文章：刊名, 年, 卷(期): 页码.
        if (ref.journal) parts.push(`${ref.journal},`);
        parts.push(`${ref.year}`);
        if (ref.volume) {
          parts.push(`, ${ref.volume}`);
          if (ref.issue) parts.push(`(${ref.issue})`);
        }
        if (ref.pages) parts.push(`: ${ref.pages}`);
        break;

      case 'book':
        // 专著：出版地: 出版者, 年: 页码.
        if (ref.publisher) parts.push(`${ref.publisher},`);
        parts.push(`${ref.year}.`);
        if (ref.pages) parts.push(`: ${ref.pages}`);
        break;

      case 'thesis':
        // 学位论文：保存地: 保存单位, 年.
        if (ref.publisher) parts.push(`${ref.publisher},`);
        parts.push(`${ref.year}.`);
        break;

      case 'conference':
        // 会议论文：会议名称, 会议地点, 年: 页码.
        if (ref.journal) parts.push(`${ref.journal},`);
        parts.push(`${ref.year}`);
        if (ref.pages) parts.push(`: ${ref.pages}`);
        break;

      case 'report':
        // 报告：报告地: 报告单位, 年.
        if (ref.publisher) parts.push(`${ref.publisher},`);
        parts.push(`${ref.year}.`);
        break;

      case 'standard':
        // 标准：标准号, 题名. 出版地: 出版者, 年.
        if (ref.publisher) parts.push(`${ref.publisher},`);
        parts.push(`${ref.year}.`);
        break;

      case 'patent':
        // 专利：专利号. 公开日期.
        if (ref.publisher) parts.push(`${ref.publisher}.`);
        break;

      case 'newspaper':
        // 报纸：报纸名, 出版日期(版次).
        if (ref.journal) parts.push(`${ref.journal},`);
        parts.push(`${ref.year}`);
        if (ref.pages) parts.push(`(${ref.pages})`);
        break;

      case 'web':
        // 电子资源：出版地: 出版者, 年(更新日期)[引用日期]. 获取路径.
        if (ref.publisher) parts.push(`${ref.publisher},`);
        parts.push(`${ref.year}.`);
        if (ref.url) parts.push(` ${ref.url}.`);
        break;

      default:
        // 其他类型
        if (ref.journal) parts.push(`${ref.journal},`);
        parts.push(`${ref.year}`);
        if (ref.volume) parts.push(`, ${ref.volume}`);
        if (ref.pages) parts.push(`: ${ref.pages}`);
    }

    // 确保以句号结尾
    let result = parts.join(' ');
    if (!result.endsWith('.')) {
      result += '.';
    }

    return result;
  }

  /**
   * 创建页眉
   */
  private createHeaders(config: TemplateConfig): any {
    return {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: config.header?.content || '',
                font: config.fonts.body?.family || '宋体',
                size: this.ptToHalfPt(9),
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    };
  }

  /**
   * 创建页脚
   */
  private createFooters(config: TemplateConfig): any {
    if (!config.footer?.showPageNumber) {
      return {};
    }

    return {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                children: [PageNumber.CURRENT],
                font: config.fonts.body?.family || '宋体',
                size: this.ptToHalfPt(9),
              }),
            ],
            alignment: this.getPageNumberAlignment(config.footer?.pageNumberPosition || 'center'),
          }),
        ],
      }),
    };
  }

  /**
   * 辅助函数
   */
  private getPageSize(size: string): any {
    switch (size) {
      case 'A4':
        return { width: this.cmToTwip(21), height: this.cmToTwip(29.7) };
      case 'A5':
        return { width: this.cmToTwip(14.8), height: this.cmToTwip(21) };
      case 'B5':
        return { width: this.cmToTwip(17.6), height: this.cmToTwip(25) };
      default:
        return { width: this.cmToTwip(21), height: this.cmToTwip(29.7) };
    }
  }

  private getHeadingLevel(level: number): typeof HeadingLevel[keyof typeof HeadingLevel] {
    switch (level) {
      case 1:
        return HeadingLevel.HEADING_1;
      case 2:
        return HeadingLevel.HEADING_2;
      case 3:
        return HeadingLevel.HEADING_3;
      default:
        return HeadingLevel.HEADING_1;
    }
  }

  private getPageNumberAlignment(position: string): typeof AlignmentType[keyof typeof AlignmentType] {
    switch (position) {
      case 'left':
        return AlignmentType.LEFT;
      case 'right':
        return AlignmentType.RIGHT;
      default:
        return AlignmentType.CENTER;
    }
  }

  private cmToTwip(cm: number): number {
    return Math.round(cm * 567);
  }

  private ptToTwip(pt: number): number {
    return Math.round(pt * 20);
  }

  private ptToHalfPt(pt: number): number {
    return Math.round(pt * 2);
  }

  private lineHeightToTwip(lineHeight: number): number {
    return Math.round(lineHeight * 240);
  }

  private containsChinese(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  /**
   * 规范化图名：如果最后不是"图"字，则补上
   */
  private normalizeFigureCaption(caption: string): string {
    if (!caption) return caption;
    const trimmed = caption.trim();
    if (!trimmed) return caption;
    // 检查最后一个字符是否是"图"
    if (!trimmed.endsWith('图')) {
      return trimmed + '图';
    }
    return trimmed;
  }

  /**
   * 规范化表名：如果最后不是"表"字，则补上
   */
  private normalizeTableCaption(caption: string): string {
    if (!caption) return caption;
    const trimmed = caption.trim();
    if (!trimmed) return caption;
    // 检查最后一个字符是否是"表"
    if (!trimmed.endsWith('表')) {
      return trimmed + '表';
    }
    return trimmed;
  }
}

export const exportService = new ExportService();
