import { api } from './api';

// 默认模板配置
export const DEFAULT_TEMPLATES = [
  {
    id: 'shengda',
    name: '升达大学',
    school: '郑州升达经贸管理学院',
    isBuiltin: true,
    config: {
      page: {
        size: 'A4',
        margin: { top: 2.5, bottom: 2.5, left: 3, right: 2.5 },
        headerHeight: 1.5,
        footerHeight: 1.5,
      },
      fonts: {
        // 论文题目：二号黑体（22pt）
        title: { family: '黑体', size: 22, bold: true },
        subtitle: { family: '宋体', size: 16 },
        // 第一层级（章）：三号黑体（16pt）
        heading1: { family: '黑体', size: 16, bold: true },
        // 第二层级（节）：小三号黑体（15pt）
        heading2: { family: '黑体', size: 15, bold: true },
        // 第三层级（条）：四号黑体（14pt）
        heading3: { family: '黑体', size: 14, bold: true },
        // 第四层级及以下：小四号黑体（12pt）
        heading4: { family: '黑体', size: 12, bold: true },
        // 正文：小四号宋体（12pt）
        body: { family: '宋体', size: 12 },
        bodyEn: { family: 'Times New Roman', size: 12 },
        // 图表标题：五号宋体（10.5pt）
        caption: { family: '宋体', size: 10.5 },
        captionEn: { family: 'Times New Roman', size: 10.5 },
        footnote: { family: '宋体', size: 9 },
        // 参考文献：五号宋体（10.5pt）
        reference: { family: '宋体', size: 10.5 },
        referenceEn: { family: 'Times New Roman', size: 10.5 },
      },
      paragraph: {
        // 1.5倍行距
        lineHeight: 1.5,
        paragraphSpacing: 0,
        // 首行缩进2字符
        firstLineIndent: 2,
        alignment: 'justify',
      },
      chapter: {
        // 章节编号：纯数字（1, 1.1, 1.1.1）
        numbering: '{number}',
        separator: ' ',
        titleFormat: '{number}{separator}{title}',
      },
      figure: {
        // 图编号：章号-序号
        numbering: '{chapter}-{number}',
        // 图题置于图下方中间
        captionPosition: 'below',
        captionFormat: '图{number} {caption}',
      },
      table: {
        // 表编号：章号-序号
        numbering: '{chapter}-{number}',
        // 表题置于表格上方中间
        captionPosition: 'above',
        captionFormat: '表{number} {caption}',
      },
      equation: {
        numbering: '({chapter}-{number})',
        position: 'right',
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
      // 特殊章节配置
      specialChapters: {
        // 中文摘要标题：小三号黑体
        abstractZh: { family: '黑体', size: 15, bold: true },
        // 英文摘要标题：加粗4号 Times New Roman
        abstractEn: { family: 'Times New Roman', size: 14, bold: true },
        // 关键词：小四号黑体
        keywords: { family: '黑体', size: 12, bold: true },
        // 目录标题：四号黑体
        contents: { family: '黑体', size: 14, bold: true },
      },
      // 页码配置
      pageNumbering: {
        frontMatterStyle: 'roman',  // 前置部分用罗马数字
        bodyStyle: 'arabic',         // 正文用阿拉伯数字
        startFrom: 1,
      },
    },
  },
  {
    id: 'zhengda',
    name: '郑州大学',
    school: '郑州大学',
    isBuiltin: true,
    config: {
      page: {
        size: 'A4',
        margin: { top: 2.5, bottom: 2.5, left: 3, right: 2.5 },
        headerHeight: 1.5,
        footerHeight: 1.5,
      },
      fonts: {
        title: { family: '黑体', size: 22, bold: true },
        subtitle: { family: '宋体', size: 16 },
        heading1: { family: '黑体', size: 18, bold: true },
        heading2: { family: '黑体', size: 16, bold: true },
        heading3: { family: '黑体', size: 14, bold: true },
        heading4: { family: '黑体', size: 12, bold: true },
        body: { family: '宋体', size: 12 },
        bodyEn: { family: 'Times New Roman', size: 12 },
        caption: { family: '宋体', size: 10.5 },
        captionEn: { family: 'Times New Roman', size: 10.5 },
        footnote: { family: '宋体', size: 9 },
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
      equation: {
        numbering: '({chapter}-{number})',
        position: 'right',
      },
      reference: {
        style: 'GB/T-7714',
        order: 'appearance',
        hangingIndent: true,
      },
      header: {
        content: '郑州大学本科毕业论文',
        oddPage: '',
        evenPage: '',
      },
      footer: {
        showPageNumber: true,
        pageNumberFormat: '1',
        pageNumberPosition: 'center',
        startFrom: 1,
      },
    },
  },
  {
    id: 'henda',
    name: '河南大学',
    school: '河南大学',
    isBuiltin: true,
    config: {
      page: {
        size: 'A4',
        margin: { top: 2.5, bottom: 2.5, left: 3, right: 2.5 },
        headerHeight: 1.5,
        footerHeight: 1.5,
      },
      fonts: {
        title: { family: '黑体', size: 22, bold: true },
        subtitle: { family: '宋体', size: 16 },
        heading1: { family: '黑体', size: 16, bold: true },
        heading2: { family: '宋体', size: 14, bold: true },
        heading3: { family: '宋体', size: 12, bold: true },
        heading4: { family: '宋体', size: 12, bold: true },
        body: { family: '宋体', size: 12 },
        bodyEn: { family: 'Times New Roman', size: 12 },
        caption: { family: '宋体', size: 10.5 },
        captionEn: { family: 'Times New Roman', size: 10.5 },
        footnote: { family: '宋体', size: 9 },
        reference: { family: '宋体', size: 10.5 },
        referenceEn: { family: 'Times New Roman', size: 10.5 },
      },
      paragraph: {
        lineHeight: 1.25,
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
      equation: {
        numbering: '({chapter}-{number})',
        position: 'right',
      },
      reference: {
        style: 'GB/T-7714',
        order: 'appearance',
        hangingIndent: true,
      },
      header: {
        content: '河南大学本科毕业论文',
        oddPage: '',
        evenPage: '',
      },
      footer: {
        showPageNumber: true,
        pageNumberFormat: '1',
        pageNumberPosition: 'center',
        startFrom: 1,
      },
    },
  },
  {
    id: 'nanda',
    name: '南京大学',
    school: '南京大学',
    isBuiltin: true,
    config: {
      page: {
        size: 'A4',
        margin: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        headerHeight: 1.5,
        footerHeight: 1.5,
      },
      fonts: {
        title: { family: '黑体', size: 22, bold: true },
        subtitle: { family: '宋体', size: 16 },
        heading1: { family: '黑体', size: 16, bold: true },
        heading2: { family: '黑体', size: 14, bold: true },
        heading3: { family: '黑体', size: 12, bold: true },
        heading4: { family: '宋体', size: 12, bold: true },
        body: { family: '宋体', size: 12 },
        bodyEn: { family: 'Times New Roman', size: 12 },
        caption: { family: '宋体', size: 10.5 },
        captionEn: { family: 'Times New Roman', size: 10.5 },
        footnote: { family: '宋体', size: 9 },
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
      equation: {
        numbering: '({chapter}-{number})',
        position: 'right',
      },
      reference: {
        style: 'GB/T-7714',
        order: 'appearance',
        hangingIndent: true,
      },
      header: {
        content: '南京大学本科毕业论文',
        oddPage: '',
        evenPage: '',
      },
      footer: {
        showPageNumber: true,
        pageNumberFormat: '1',
        pageNumberPosition: 'center',
        startFrom: 1,
      },
    },
  },
  {
    id: 'beida',
    name: '北京大学',
    school: '北京大学',
    isBuiltin: true,
    config: {
      page: {
        size: 'A4',
        margin: { top: 3, bottom: 2.5, left: 3, right: 2.5 },
        headerHeight: 2,
        footerHeight: 1.5,
      },
      fonts: {
        title: { family: '黑体', size: 22, bold: true },
        subtitle: { family: '宋体', size: 16 },
        heading1: { family: '宋体', size: 16, bold: true },
        heading2: { family: '宋体', size: 14, bold: true },
        heading3: { family: '宋体', size: 12, bold: true },
        heading4: { family: '宋体', size: 12, bold: true },
        body: { family: '宋体', size: 12 },
        bodyEn: { family: 'Times New Roman', size: 12 },
        caption: { family: '宋体', size: 10.5 },
        captionEn: { family: 'Times New Roman', size: 10.5 },
        footnote: { family: '宋体', size: 9 },
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
      equation: {
        numbering: '({chapter}-{number})',
        position: 'right',
      },
      reference: {
        style: 'GB/T-7714',
        order: 'appearance',
        hangingIndent: true,
      },
      header: {
        content: '北京大学本科毕业论文',
        oddPage: '',
        evenPage: '',
      },
      footer: {
        showPageNumber: true,
        pageNumberFormat: '1',
        pageNumberPosition: 'center',
        startFrom: 1,
      },
    },
  },
  {
    id: 'qinghua',
    name: '清华大学',
    school: '清华大学',
    isBuiltin: true,
    config: {
      page: {
        size: 'A4',
        margin: { top: 2.5, bottom: 2.5, left: 3, right: 2.5 },
        headerHeight: 1.5,
        footerHeight: 1.5,
      },
      fonts: {
        title: { family: '黑体', size: 22, bold: true },
        subtitle: { family: '宋体', size: 16 },
        heading1: { family: '黑体', size: 16, bold: true },
        heading2: { family: '黑体', size: 14, bold: true },
        heading3: { family: '黑体', size: 12, bold: true },
        heading4: { family: '宋体', size: 12, bold: true },
        body: { family: '宋体', size: 12 },
        bodyEn: { family: 'Times New Roman', size: 12 },
        caption: { family: '宋体', size: 10.5 },
        captionEn: { family: 'Times New Roman', size: 10.5 },
        footnote: { family: '宋体', size: 9 },
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
      equation: {
        numbering: '({chapter}-{number})',
        position: 'right',
      },
      reference: {
        style: 'GB/T-7714',
        order: 'appearance',
        hangingIndent: true,
      },
      header: {
        content: '清华大学本科毕业论文',
        oddPage: '',
        evenPage: '',
      },
      footer: {
        showPageNumber: true,
        pageNumberFormat: '1',
        pageNumberPosition: 'center',
        startFrom: 1,
      },
    },
  },
];

// 初始化内置模板
export async function initializeDefaultTemplates(): Promise<void> {
  try {
    // 检查是否已有模板
    const existingTemplates = await api.getAllTemplates();

    if (existingTemplates.length === 0) {
      // 没有模板,初始化默认模板
      for (const template of DEFAULT_TEMPLATES) {
        try {
          await api.createTemplate(template);
          console.log('Created template:', template.name);
        } catch (error) {
          // 忽略重复键错误
          console.warn('Template already exists:', template.name);
        }
      }
      console.log('Default templates initialized');
    } else {
      console.log('Templates already exist:', existingTemplates.length);
    }
  } catch (error) {
    console.error('Failed to initialize templates:', error);
  }
}
