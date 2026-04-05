import { contextBridge, ipcRenderer } from 'electron';

// 向渲染进程暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据库初始化
  dbInitialize: () => ipcRenderer.invoke('db:initialize'),

  // 项目相关
  createProject: (data: any) => ipcRenderer.invoke('project:create', data),
  openProject: (filePath: string) => ipcRenderer.invoke('project:open', filePath),
  saveProject: (data: any) => ipcRenderer.invoke('project:save', data),

  // 数据库 - 项目操作
  dbCreateProject: (project: any) => ipcRenderer.invoke('db:createProject', project),
  dbGetProject: (id: string) => ipcRenderer.invoke('db:getProject', id),
  dbGetAllProjects: () => ipcRenderer.invoke('db:getAllProjects'),
  dbUpdateProject: (project: any) => ipcRenderer.invoke('db:updateProject', project),
  dbDeleteProject: (id: string) => ipcRenderer.invoke('db:deleteProject', id),

  // 数据库 - 章节操作
  dbCreateChapter: (chapter: any) => ipcRenderer.invoke('db:createChapter', chapter),
  dbGetChaptersByProject: (projectId: string) => ipcRenderer.invoke('db:getChaptersByProject', projectId),
  dbUpdateChapter: (chapter: any) => ipcRenderer.invoke('db:updateChapter', chapter),
  dbDeleteChapter: (id: string) => ipcRenderer.invoke('db:deleteChapter', id),

  // 数据库 - 参考文献操作
  dbCreateReference: (reference: any) => ipcRenderer.invoke('db:createReference', reference),
  dbGetReferencesByProject: (projectId: string) => ipcRenderer.invoke('db:getReferencesByProject', projectId),
  dbUpdateReference: (reference: any) => ipcRenderer.invoke('db:updateReference', reference),
  dbDeleteReference: (id: string) => ipcRenderer.invoke('db:deleteReference', id),

  // 数据库 - 模板操作
  dbCreateTemplate: (template: any) => ipcRenderer.invoke('db:createTemplate', template),
  dbGetTemplate: (id: string) => ipcRenderer.invoke('db:getTemplate', id),
  dbGetAllTemplates: () => ipcRenderer.invoke('db:getAllTemplates'),
  dbUpdateTemplate: (template: any) => ipcRenderer.invoke('db:updateTemplate', template),
  dbDeleteTemplate: (id: string) => ipcRenderer.invoke('db:deleteTemplate', id),

  // 数据库 - 设置操作
  dbGetSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
  dbSetSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),

  // 数据库 - 图表操作
  dbCreateFigure: (figure: any) => ipcRenderer.invoke('db:createFigure', figure),
  dbGetFiguresByProject: (projectId: string) => ipcRenderer.invoke('db:getFiguresByProject', projectId),
  dbGetFiguresByChapter: (chapterId: string) => ipcRenderer.invoke('db:getFiguresByChapter', chapterId),
  dbUpdateFigure: (figure: any) => ipcRenderer.invoke('db:updateFigure', figure),
  dbDeleteFigure: (id: string) => ipcRenderer.invoke('db:deleteFigure', id),

  // 文件对话框
  showOpenDialog: () => ipcRenderer.invoke('dialog:open'),
  showSaveDialog: () => ipcRenderer.invoke('dialog:save'),

  // 导出
  exportToWord: (data: any) => ipcRenderer.invoke('export:word', data),

  // 示例文档
  scanExampleDocuments: () => ipcRenderer.invoke('examples:scan'),
  readExampleDocument: (filePath: string) => ipcRenderer.invoke('examples:read', filePath),
});
