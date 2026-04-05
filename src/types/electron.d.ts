declare global {
  interface Window {
    electronAPI: {
      createProject: (data: any) => Promise<any>;
      openProject: (filePath: string) => Promise<any>;
      saveProject: (data: any) => Promise<void>;
      showOpenDialog: () => Promise<string | null>;
      showSaveDialog: () => Promise<string | null>;
      exportToWord: (projectId: string) => Promise<void>;
      dbQuery: (sql: string, params?: any[]) => Promise<any[]>;
      dbRun: (sql: string, params?: any[]) => Promise<void>;
      scanExampleDocuments: () => Promise<{ success: boolean; data?: { name: string; path: string; size: number; modified: string }[]; error?: string }>;
      readExampleDocument: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    };
  }
}

export {};
