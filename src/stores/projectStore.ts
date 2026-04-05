import { create } from 'zustand';
import type { Project, Chapter, Reference } from '../types/project';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../services/api';

// 重新计算章节编号（支持多级编号：1, 1.1, 1.1.1）
function renumberChapters(chapters: Chapter[]): Chapter[] {
  let chapterNum = 0;
  let sectionNum = 0;
  let subSectionNum = 0;

  return chapters.map((chapter) => {
    if (chapter.isFixed) {
      return { ...chapter, number: '' };
    }
    if (chapter.level === 1) {
      chapterNum++;
      sectionNum = 0;
      subSectionNum = 0;
      return { ...chapter, number: String(chapterNum) };
    }
    if (chapter.level === 2) {
      sectionNum++;
      subSectionNum = 0;
      return { ...chapter, number: `${chapterNum}.${sectionNum}` };
    }
    if (chapter.level === 3) {
      subSectionNum++;
      return { ...chapter, number: `${chapterNum}.${sectionNum}.${subSectionNum}` };
    }
    return { ...chapter, number: '' };
  });
}

interface ProjectState {
  currentProject: Project | null;
  currentChapterId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;
  isInitialized: boolean;
  autoSaveTimer: ReturnType<typeof setInterval> | null;

  // 初始化
  initializeDatabase: () => Promise<void>;
  enableAutoSave: () => void;
  disableAutoSave: () => void;

  // 项目操作
  createProject: (name: string, templateId: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  loadAllProjects: () => Promise<Project[]>;
  saveProject: () => Promise<void>;
  setCurrentProject: (project: Project) => void;
  importProject: (projectData: any) => Promise<void>;

  // 章节操作
  setCurrentChapter: (chapterId: string | null) => void;
  addChapter: (parentId: string | null, title: string, level?: 1 | 2 | 3, insertAfterId?: string) => Promise<void>;
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  reorderChapters: (chapters: Chapter[]) => Promise<void>;

  // 参考文献操作
  addReference: (reference: Omit<Reference, 'id'>) => Promise<void>;
  updateReference: (referenceId: string, updates: Partial<Reference>) => Promise<void>;
  deleteReference: (referenceId: string) => Promise<void>;

  // 内容操作
  updateChapterContent: (chapterId: string, content: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  currentChapterId: null,
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  error: null,
  isInitialized: false,
  autoSaveTimer: null,

  initializeDatabase: async () => {
    try {
      await api.initializeDatabase();
      set({ isInitialized: true });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      set({ error: (error as Error).message });
    }
  },

  enableAutoSave: () => {
    const { autoSaveTimer } = get();

    // 清除现有定时器
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
    }

    // 设置新定时器,每30秒自动保存
    const timer = setInterval(() => {
      const { currentProject, hasUnsavedChanges, saveProject } = get();

      if (currentProject && hasUnsavedChanges) {
        saveProject();
      }
    }, 30000); // 30秒

    set({ autoSaveTimer: timer });
  },

  disableAutoSave: () => {
    const { autoSaveTimer } = get();

    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      set({ autoSaveTimer: null });
    }
  },

  createProject: async (name: string, templateId: string) => {
    set({ isLoading: true, error: null });
    try {
      const projectId = uuidv4();
      const now = new Date();

      // 创建默认章节结构（标题不含编号，编号由系统自动生成）
      const chapters: Chapter[] = renumberChapters([
        {
          id: uuidv4(),
          projectId,
          parentId: null,
          title: '摘要',
          orderIndex: 0,
          level: 1,
          number: '',
          content: JSON.stringify({
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '摘要' }] }]
          }),
          children: [],
          isFixed: true,
        },
        {
          id: uuidv4(),
          projectId,
          parentId: null,
          title: 'Abstract',
          orderIndex: 1,
          level: 1,
          number: '',
          content: JSON.stringify({
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Abstract' }] }]
          }),
          children: [],
          isFixed: true,
        },
        {
          id: uuidv4(),
          projectId,
          parentId: null,
          title: '绪论',
          orderIndex: 2,
          level: 1,
          number: '1',
          content: JSON.stringify({
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '绪论' }] }]
          }),
          children: [],
          isFixed: false,
        },
        {
          id: uuidv4(),
          projectId,
          parentId: null,
          title: '结论',
          orderIndex: 3,
          level: 1,
          number: '',
          content: JSON.stringify({
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '结论' }] }]
          }),
          children: [],
          isFixed: true,
        },
        {
          id: uuidv4(),
          projectId,
          parentId: null,
          title: '参考文献',
          orderIndex: 4,
          level: 1,
          number: '',
          content: JSON.stringify({
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '参考文献' }] }]
          }),
          children: [],
          isFixed: true,
        },
        {
          id: uuidv4(),
          projectId,
          parentId: null,
          title: '致谢',
          orderIndex: 5,
          level: 1,
          number: '',
          content: JSON.stringify({
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '致谢' }] }]
          }),
          children: [],
          isFixed: true,
        },
      ]);

      // 加载模板配置
      let template = undefined;
      try {
        template = await api.getTemplate(templateId);
      } catch (e) {
        console.warn('Template not found, using default:', templateId);
      }

      const project: Project = {
        id: projectId,
        name,
        templateId,
        template,
        createdAt: now,
        updatedAt: now,
        filePath: '',
        chapters,
        references: [],
      };

      // 保存到数据库
      await api.createProject({
        id: project.id,
        name: project.name,
        templateId: project.templateId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        filePath: project.filePath,
      });

      // 保存所有章节
      for (const chapter of chapters) {
        await api.createChapter(chapter);
      }

      set({ currentProject: project, currentChapterId: chapters[0].id, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      console.error('Failed to create project:', error);
    }
  },

  setCurrentProject: (project: Project) => {
    set({
      currentProject: project,
      currentChapterId: project.chapters[0]?.id || null,
      hasUnsavedChanges: false
    });
  },

  loadProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      // 从数据库加载项目
      const projectData = await api.getProject(projectId);
      if (!projectData) {
        throw new Error('Project not found');
      }

      // 加载章节
      const chapters = await api.getChaptersByProject(projectId);

      // 加载参考文献
      const references = await api.getReferencesByProject(projectId);

      // 加载模板配置
      let template = undefined;
      if (projectData.templateId) {
        template = await api.getTemplate(projectData.templateId);
      }

      const project: Project = {
        ...projectData,
        chapters,
        references,
        template,
        createdAt: new Date(projectData.createdAt),
        updatedAt: new Date(projectData.updatedAt),
      };

      set({ currentProject: project, currentChapterId: chapters[0]?.id || null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      console.error('Failed to load project:', error);
    }
  },

  loadAllProjects: async () => {
    try {
      const projects = await api.getAllProjects();
      return projects.map(p => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));
    } catch (error) {
      console.error('Failed to load all projects:', error);
      return [];
    }
  },

  saveProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isSaving: true, error: null });
    try {
      // 更新项目基本信息
      await api.updateProject({
        id: currentProject.id,
        name: currentProject.name,
        templateId: currentProject.templateId,
        updatedAt: new Date(),
        filePath: currentProject.filePath,
      });

      // 更新所有章节
      for (const chapter of currentProject.chapters) {
        await api.updateChapter(chapter);
      }

      // 更新所有参考文献
      for (const reference of currentProject.references) {
        await api.updateReference(reference);
      }

      set({ isSaving: false, hasUnsavedChanges: false });
    } catch (error) {
      set({ error: (error as Error).message, isSaving: false });
      console.error('Failed to save project:', error);
    }
  },

  setCurrentChapter: (chapterId) => {
    set({ currentChapterId: chapterId });
  },

  addChapter: async (parentId, title, level = 1, insertAfterId?: string) => {
    const { currentProject } = get();
    if (!currentProject) return;

    // 计算新章节的位置
    let insertIndex = currentProject.chapters.length;
    if (insertAfterId) {
      const afterIndex = currentProject.chapters.findIndex(ch => ch.id === insertAfterId);
      if (afterIndex !== -1) {
        // 找到同级或更高级章节的结束位置
        const afterChapter = currentProject.chapters[afterIndex];
        insertIndex = afterIndex + 1;

        // 如果是插入子章节，需要找到父章节的范围
        if (level > afterChapter.level) {
          // 向后查找，直到遇到同级或更高级的章节
          while (insertIndex < currentProject.chapters.length) {
            const nextChapter = currentProject.chapters[insertIndex];
            if (nextChapter.level <= afterChapter.level) {
              break;
            }
            insertIndex++;
          }
        } else {
          // 同级或更高级，找到该级别的结束位置
          while (insertIndex < currentProject.chapters.length) {
            const nextChapter = currentProject.chapters[insertIndex];
            if (nextChapter.level < level) {
              break;
            }
            insertIndex++;
          }
        }
      }
    }

    const newChapter: Chapter = {
      id: uuidv4(),
      projectId: currentProject.id,
      parentId,
      title,
      orderIndex: insertIndex,
      level,
      number: '',
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'heading', attrs: { level }, content: [{ type: 'text', text: title }] }]
      }),
      children: [],
      isFixed: false,
    };

    // 更新其他章节的 orderIndex
    const updatedChapters = currentProject.chapters.map(ch => {
      if (ch.orderIndex >= insertIndex) {
        return { ...ch, orderIndex: ch.orderIndex + 1 };
      }
      return ch;
    });

    // 添加新章节并按 orderIndex 排序
    const chaptersWithNew = [...updatedChapters, newChapter].sort((a, b) => a.orderIndex - b.orderIndex);

    // 重新编号
    const renumberedChapters = renumberChapters(chaptersWithNew);

    // 保存到数据库
    await api.createChapter(newChapter);

    set({
      currentProject: {
        ...currentProject,
        chapters: renumberedChapters,
        updatedAt: new Date(),
      },
      currentChapterId: newChapter.id,
      hasUnsavedChanges: false,
    });
  },

  updateChapter: async (chapterId, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;

    // 更新章节
    const updatedChapters = currentProject.chapters.map((ch) =>
      ch.id === chapterId ? { ...ch, ...updates } : ch
    );

    // 如果更新了 level，需要重新编号所有章节
    const renumberedChapters = updates.level !== undefined
      ? renumberChapters(updatedChapters)
      : updatedChapters;

    // 保存到数据库
    const updatedChapter = renumberedChapters.find(ch => ch.id === chapterId);
    if (updatedChapter) {
      await api.updateChapter(updatedChapter);
    }

    // 如果有重新编号，保存所有受影响的章节
    if (updates.level !== undefined) {
      for (const ch of renumberedChapters) {
        if (ch.id !== chapterId) {
          await api.updateChapter(ch);
        }
      }
    }

    set({
      currentProject: {
        ...currentProject,
        chapters: renumberedChapters,
        updatedAt: new Date(),
      },
      hasUnsavedChanges: false,
    });
  },

  deleteChapter: async (chapterId) => {
    const { currentProject, currentChapterId } = get();
    if (!currentProject) return;

    // 从数据库删除
    await api.deleteChapter(chapterId);

    // 删除章节后重新编号
    const remainingChapters = currentProject.chapters.filter((ch) => ch.id !== chapterId);
    const renumberedChapters = renumberChapters(remainingChapters);

    set({
      currentProject: {
        ...currentProject,
        chapters: renumberedChapters,
        updatedAt: new Date(),
      },
      currentChapterId: currentChapterId === chapterId ? null : currentChapterId,
      hasUnsavedChanges: false,
    });
  },

  reorderChapters: async (chapters) => {
    const { currentProject } = get();
    if (!currentProject) return;

    // 更新 orderIndex 并重新编号
    const renumberedChapters = renumberChapters(
      chapters.map((ch, index) => ({
        ...ch,
        orderIndex: index,
      }))
    );

    // 保存到数据库
    for (const ch of renumberedChapters) {
      await api.updateChapter(ch);
    }

    set({
      currentProject: {
        ...currentProject,
        chapters: renumberedChapters,
        updatedAt: new Date(),
      },
      hasUnsavedChanges: false,
    });
  },

  addReference: async (reference) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const newReference: Reference = {
      ...reference,
      id: uuidv4(),
      projectId: currentProject.id,
    };

    // 保存到数据库
    await api.createReference(newReference);

    set({
      currentProject: {
        ...currentProject,
        references: [...currentProject.references, newReference],
        updatedAt: new Date(),
      },
      hasUnsavedChanges: false,
    });
  },

  updateReference: async (referenceId, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updatedReference = currentProject.references.find(ref => ref.id === referenceId);
    if (updatedReference) {
      const referenceToUpdate = { ...updatedReference, ...updates };
      await api.updateReference(referenceToUpdate);
    }

    set({
      currentProject: {
        ...currentProject,
        references: currentProject.references.map((ref) =>
          ref.id === referenceId ? { ...ref, ...updates } : ref
        ),
        updatedAt: new Date(),
      },
      hasUnsavedChanges: false,
    });
  },

  deleteReference: async (referenceId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    // 从数据库删除
    await api.deleteReference(referenceId);

    set({
      currentProject: {
        ...currentProject,
        references: currentProject.references.filter((ref) => ref.id !== referenceId),
        updatedAt: new Date(),
      },
      hasUnsavedChanges: false,
    });
  },

  updateChapterContent: (chapterId, content) => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({
      currentProject: {
        ...currentProject,
        chapters: currentProject.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, content } : ch
        ),
        updatedAt: new Date(),
      },
      hasUnsavedChanges: true,
    });
  },

  importProject: async (projectData) => {
    set({ isLoading: true, error: null });
    try {
      const projectId = uuidv4();
      const now = new Date();

      // 第一遍：生成新ID映射
      const idMap = new Map<string, string>();
      projectData.chapters.forEach((ch: any) => {
        idMap.set(ch.id, uuidv4());
      });

      // 重新生成参考文献ID映射
      const refIdMap = new Map<string, string>();
      (projectData.references || []).forEach((ref: any) => {
        refIdMap.set(ref.id, uuidv4());
      });

      // 第二遍：重新编号章节，更新ID和parentId
      const chapters = renumberChapters(projectData.chapters.map((ch: any) => {
        const newId = idMap.get(ch.id);
        // 更新 parentId 到新ID
        const newParentId = ch.parentId ? idMap.get(ch.parentId) || null : null;
        return {
          ...ch,
          id: newId,
          projectId,
          parentId: newParentId,
        };
      }));

      // 重新生成参考文献
      const references = (projectData.references || []).map((ref: any) => {
        const newId = refIdMap.get(ref.id);
        return {
          ...ref,
          id: newId,
          projectId,
        };
      });

      // 更新章节内容中的引用ID
      chapters.forEach((chapter: Chapter) => {
        if (chapter.content) {
          let content = chapter.content;
          // 更新文献引用ID
          refIdMap.forEach((newId, oldId) => {
            content = content.replace(new RegExp(oldId, 'g'), newId);
          });
          chapter.content = content;
        }
      });

      const templateId = projectData.templateId || 'shengda';

      // 加载模板配置
      let template = undefined;
      try {
        template = await api.getTemplate(templateId);
        if (!template) {
          console.warn('Template not found, will try to create default:', templateId);
          // 如果模板不存在，尝试创建默认模板
          const { api: templateApi } = await import('../services/api');
          const defaultTemplate = {
            id: 'shengda',
            name: '升达',
            school: '升达大学',
            isBuiltin: true,
            config: {
              page: {
                size: 'A4',
                margin: { top: 2.5, bottom: 2.5, left: 3, right: 2.5 },
                headerHeight: 1.5,
                footerHeight: 1.5,
              },
              fonts: {
                heading1: { family: '黑体', size: 16, bold: true },
                heading2: { family: '黑体', size: 15, bold: true },
                heading3: { family: '黑体', size: 14, bold: true },
                heading4: { family: '黑体', size: 12, bold: true },
                body: { family: '宋体', size: 12 },
                bodyEn: { family: 'Times New Roman', size: 12 },
                caption: { family: '宋体', size: 10.5 },
                captionEn: { family: 'Times New Roman', size: 10.5 },
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
              reference: {
                style: 'GB/T-7714',
                order: 'appearance',
                hangingIndent: true,
              },
              header: {
                content: '毕业论文',
                oddPage: '{chapter}',
                evenPage: '毕业论文',
              },
              footer: {
                showPageNumber: true,
                pageNumberFormat: '1',
                pageNumberPosition: 'center',
                startFrom: 1,
              },
            },
          };
          await templateApi.createTemplate(defaultTemplate);
          template = defaultTemplate;
        }
      } catch (e) {
        console.warn('Template not found and failed to create default:', templateId, e);
      }

      const project: Project = {
        id: projectId,
        name: projectData.name,
        templateId,
        template,
        createdAt: now,
        updatedAt: now,
        filePath: '',
        chapters,
        references,
      };

      // 保存到数据库
      await api.createProject({
        id: project.id,
        name: project.name,
        templateId: project.templateId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        filePath: project.filePath,
      });

      // 保存所有章节
      for (const chapter of chapters) {
        await api.createChapter(chapter);
      }

      // 保存所有参考文献
      for (const reference of references) {
        await api.createReference(reference);
      }

      set({ currentProject: project, currentChapterId: chapters[0]?.id || null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      console.error('Failed to import project:', error);
    }
  },
}));
