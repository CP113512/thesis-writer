// 渲染进程 API 封装

declare global {
  interface Window {
    electronAPI: {
      // 数据库初始化
      dbInitialize: () => Promise<{ success: boolean; error?: string }>;

      // 项目操作
      dbCreateProject: (project: any) => Promise<{ success: boolean; error?: string }>;
      dbGetProject: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbGetAllProjects: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbUpdateProject: (project: any) => Promise<{ success: boolean; error?: string }>;
      dbDeleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;

      // 章节操作
      dbCreateChapter: (chapter: any) => Promise<{ success: boolean; error?: string }>;
      dbGetChaptersByProject: (projectId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbUpdateChapter: (chapter: any) => Promise<{ success: boolean; error?: string }>;
      dbDeleteChapter: (id: string) => Promise<{ success: boolean; error?: string }>;

      // 参考文献操作
      dbCreateReference: (reference: any) => Promise<{ success: boolean; error?: string }>;
      dbGetReferencesByProject: (projectId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbUpdateReference: (reference: any) => Promise<{ success: boolean; error?: string }>;
      dbDeleteReference: (id: string) => Promise<{ success: boolean; error?: string }>;

      // 模板操作
      dbCreateTemplate: (template: any) => Promise<{ success: boolean; error?: string }>;
      dbGetTemplate: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbGetAllTemplates: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbUpdateTemplate: (template: any) => Promise<{ success: boolean; error?: string }>;
      dbDeleteTemplate: (id: string) => Promise<{ success: boolean; error?: string }>;

      // 设置操作
      dbGetSetting: (key: string) => Promise<{ success: boolean; data?: string; error?: string }>;
      dbSetSetting: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;

      // 图表操作
      dbCreateFigure: (figure: any) => Promise<{ success: boolean; error?: string }>;
      dbGetFiguresByProject: (projectId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetFiguresByChapter: (chapterId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbUpdateFigure: (figure: any) => Promise<{ success: boolean; error?: string }>;
      dbDeleteFigure: (id: string) => Promise<{ success: boolean; error?: string }>;

      // 导出
      exportToWord: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;

      // 示例文档
      scanExampleDocuments: () => Promise<{ success: boolean; data?: { name: string; path: string; size: number; modified: string }[]; error?: string }>;
      readExampleDocument: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    };
  }
}

export const api = {
  // 初始化数据库
  async initializeDatabase(): Promise<void> {
    if (!window.electronAPI) {
      console.warn('Electron API not available, running in browser mode');
      return;
    }

    const result = await window.electronAPI.dbInitialize();
    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize database');
    }
  },

  // 项目操作
  async createProject(project: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbCreateProject(project);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create project');
    }
  },

  async getProject(id: string): Promise<any | null> {
    if (!window.electronAPI) return null;

    const result = await window.electronAPI.dbGetProject(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get project');
    }
    return result.data || null;
  },

  async getAllProjects(): Promise<any[]> {
    if (!window.electronAPI) return [];

    const result = await window.electronAPI.dbGetAllProjects();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get projects');
    }
    return result.data || [];
  },

  async updateProject(project: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbUpdateProject(project);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update project');
    }
  },

  async deleteProject(id: string): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbDeleteProject(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete project');
    }
  },

  // 章节操作
  async createChapter(chapter: any): Promise<void> {
    if (!window.electronAPI) return;

    console.log('API: Creating chapter:', chapter);
    const result = await window.electronAPI.dbCreateChapter(chapter);
    console.log('API: Create chapter result:', result);
    if (!result.success) {
      const error = new Error(result.error || 'Failed to create chapter');
      console.error('API: Create chapter failed:', error.message, chapter);
      throw error;
    }
  },

  async getChaptersByProject(projectId: string): Promise<any[]> {
    if (!window.electronAPI) return [];

    const result = await window.electronAPI.dbGetChaptersByProject(projectId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get chapters');
    }
    return result.data || [];
  },

  async updateChapter(chapter: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbUpdateChapter(chapter);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update chapter');
    }
  },

  async deleteChapter(id: string): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbDeleteChapter(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete chapter');
    }
  },

  // 参考文献操作
  async createReference(reference: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbCreateReference(reference);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create reference');
    }
  },

  async getReferencesByProject(projectId: string): Promise<any[]> {
    if (!window.electronAPI) return [];

    const result = await window.electronAPI.dbGetReferencesByProject(projectId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get references');
    }
    return result.data || [];
  },

  async updateReference(reference: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbUpdateReference(reference);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update reference');
    }
  },

  async deleteReference(id: string): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbDeleteReference(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete reference');
    }
  },

  // 模板操作
  async createTemplate(template: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbCreateTemplate(template);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create template');
    }
  },

  async getTemplate(id: string): Promise<any | null> {
    if (!window.electronAPI) return null;

    const result = await window.electronAPI.dbGetTemplate(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get template');
    }
    return result.data || null;
  },

  async getAllTemplates(): Promise<any[]> {
    if (!window.electronAPI) return [];

    const result = await window.electronAPI.dbGetAllTemplates();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get templates');
    }
    return result.data || [];
  },

  async updateTemplate(template: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbUpdateTemplate(template);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update template');
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbDeleteTemplate(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete template');
    }
  },

  // 设置操作
  async getSetting(key: string): Promise<string | null> {
    if (!window.electronAPI) return null;

    const result = await window.electronAPI.dbGetSetting(key);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get setting');
    }
    return result.data || null;
  },

  async setSetting(key: string, value: string): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbSetSetting(key, value);
    if (!result.success) {
      throw new Error(result.error || 'Failed to set setting');
    }
  },

  // 导出操作
  async exportToWord(data: any): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.exportToWord(data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to export');
    }
    return result.path || '';
  },

  // 图表操作
  async createFigure(figure: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbCreateFigure(figure);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create figure');
    }
  },

  async getFiguresByProject(projectId: string): Promise<any[]> {
    if (!window.electronAPI) return [];

    const result = await window.electronAPI.dbGetFiguresByProject(projectId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get figures');
    }
    return result.data || [];
  },

  async getFiguresByChapter(chapterId: string): Promise<any[]> {
    if (!window.electronAPI) return [];

    const result = await window.electronAPI.dbGetFiguresByChapter(chapterId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get figures');
    }
    return result.data || [];
  },

  async updateFigure(figure: any): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbUpdateFigure(figure);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update figure');
    }
  },

  async deleteFigure(id: string): Promise<void> {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.dbDeleteFigure(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete figure');
    }
  },

  // 示例文档操作
  async scanExampleDocuments(): Promise<{ name: string; path: string; size: number; modified: string }[]> {
    if (!window.electronAPI) return [];

    const result = await window.electronAPI.scanExampleDocuments();
    if (!result.success) {
      throw new Error(result.error || 'Failed to scan example documents');
    }
    return result.data || [];
  },

  async readExampleDocument(filePath: string): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.readExampleDocument(filePath);
    if (!result.success) {
      throw new Error(result.error || 'Failed to read example document');
    }
    return result.data || '';
  },
};
