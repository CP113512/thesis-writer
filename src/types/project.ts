// 项目类型定义
export interface Project {
  id: string;
  name: string;
  templateId: string;
  template?: Template;
  createdAt: Date;
  updatedAt: Date;
  filePath: string;
  chapters: Chapter[];
  references: Reference[];
  // 论文元数据
  metadata?: ThesisMetadata;
}

// 论文元数据
export interface ThesisMetadata {
  title: string;           // 论文题目
  author: string;          // 学生姓名
  studentId: string;       // 学号
  major: string;           // 专业班级
  college: string;         // 学院
  advisor: string;         // 指导教师
  advisorTitle: string;    // 指导教师职称/学位
  completionDate: string;  // 完成时间
  // 摘要
  abstractZh?: string;     // 中文摘要
  keywordsZh?: string;     // 中文关键词
  abstractEn?: string;     // 英文摘要
  keywordsEn?: string;     // 英文关键词
}

export interface Chapter {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  orderIndex: number;
  level: 1 | 2 | 3;
  number: string;
  content: string; // JSON 格式的编辑器内容
  children: Chapter[];
  isFixed: boolean; // 固定章节（摘要、参考文献等）
}

export interface Figure {
  id: string;
  chapterId: string;
  type: 'figure' | 'table' | 'equation';
  number: string;
  caption: string;
  path?: string;
  content?: string;
  position: number;
  width: string;
}

export interface Reference {
  id: string;
  projectId: string;
  type: 'journal' | 'conference' | 'book' | 'thesis' | 'web' | 'report' | 'standard' | 'patent' | 'newspaper' | 'misc';
  key: string;
  authors: Author[];
  title: string;
  journal?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  bibtex?: string;
}

export interface Author {
  firstName: string;
  lastName: string;
  isCorresponding?: boolean;
}

export interface Citation {
  id: string;
  referenceId: string;
  chapterId: string;
  position: number;
  style: 'number' | 'author-year';
}

export interface Template {
  id: string;
  name: string;
  school: string;
  isBuiltin: boolean;
  config: TemplateConfig;
}

export interface TemplateConfig {
  page: PageConfig;
  fonts: FontConfigs;
  paragraph: ParagraphConfig;
  chapter: ChapterConfig;
  figure: FigureConfig;
  table: TableConfig;
  equation: EquationConfig;
  reference: ReferenceConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  // 新增：特殊章节配置
  specialChapters?: SpecialChapterConfig;
  // 新增：页码配置
  pageNumbering?: PageNumberingConfig;
}

// 特殊章节配置（摘要、目录等）
export interface SpecialChapterConfig {
  abstractZh: FontConfig;   // 中文摘要标题
  abstractEn: FontConfig;   // 英文摘要标题
  keywords: FontConfig;     // 关键词
  contents: FontConfig;     // 目录标题
}

// 页码配置
export interface PageNumberingConfig {
  frontMatterStyle: 'roman' | 'arabic';  // 前置部分页码样式
  bodyStyle: 'arabic';                     // 正文页码样式
  startFrom: number;                       // 正文起始页码
}

export interface PageConfig {
  size: 'A4' | 'A5' | 'B5';
  margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  headerHeight: number;
  footerHeight: number;
}

export interface FontConfig {
  family: string;
  size: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

export interface FontConfigs {
  title: FontConfig;
  subtitle: FontConfig;
  heading1: FontConfig;
  heading2: FontConfig;
  heading3: FontConfig;
  heading4: FontConfig;
  body: FontConfig;
  bodyEn: FontConfig;
  caption: FontConfig;
  captionEn: FontConfig;
  footnote: FontConfig;
  reference: FontConfig;
  referenceEn: FontConfig;
}

export interface ParagraphConfig {
  lineHeight: number;
  paragraphSpacing: number;
  firstLineIndent: number;
  alignment: 'left' | 'justify';
}

export interface ChapterConfig {
  numbering: string;
  separator: string;
  titleFormat: string;
}

export interface FigureConfig {
  numbering: string;
  captionPosition: 'below' | 'above';
  captionFormat: string;
}

export interface TableConfig {
  numbering: string;
  captionPosition: 'above' | 'below';
  captionFormat: string;
}

export interface EquationConfig {
  numbering: string;
  position: 'left' | 'center' | 'right';
}

export interface ReferenceConfig {
  style: 'GB/T-7714' | 'APA' | 'MLA' | 'Chicago';
  order: 'appearance' | 'alphabetical';
  hangingIndent: boolean;
}

export interface HeaderConfig {
  content: string;
  oddPage: string;
  evenPage: string;
}

export interface FooterConfig {
  showPageNumber: boolean;
  pageNumberFormat: string;
  pageNumberPosition: 'left' | 'center' | 'right';
  startFrom: number;
}

// 编辑器节点类型
export interface EditorNode {
  type: string;
  attrs?: Record<string, any>;
  content?: EditorNode[];
  marks?: { type: string; attrs?: Record<string, any> }[];
  text?: string;
}

// 应用状态
export interface AppState {
  currentProject: Project | null;
  currentChapterId: string | null;
  isLoading: boolean;
  error: string | null;
}
