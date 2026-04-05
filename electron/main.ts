import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { setupDatabaseIPC } from './ipc/database';
import { setupExportIPC } from './ipc/export';

// 日志工具
const logFile = path.join(app.getPath('userData'), 'app.log');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function logToFile(...args: unknown[]): void {
  try {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${args.map(a => {
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a, null, 2);
        } catch {
          return '[Object]';
        }
      }
      return String(a);
    }).join(' ')}\n`;

    // 使用异步写入避免阻塞
    fs.promises.appendFile(logFile, message).catch(() => {});
  } catch {
    // 忽略错误
  }
}

// 日志函数：开发环境写控制台+文件，生产环境只写文件
function log(...args: unknown[]): void {
  logToFile(...args);
  // 生产环境不使用 console.log，避免 EPIPE 错误
}

log('App started, log file:', logFile, 'isDev:', isDev);

// 单例锁 - 确保只能同时运行一个应用实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果获取锁失败,说明已有实例在运行,退出当前实例
  log('Another instance is already running, quitting...');
  app.quit();
} else {
  // 当第二个实例启动时,聚焦到已有的窗口
  app.on('second-instance', () => {
    log('Second instance started, focusing main window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  });

  // 开发环境加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 设置数据库 IPC 处理程序
  setupDatabaseIPC();

  // 设置导出 IPC 处理程序
  setupExportIPC();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
