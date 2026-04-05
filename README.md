# 无格式论文写作器

让本科生专注于内容，无需关心格式的毕业论文写作工具。

## 功能特性

### ✅ 已实现
- ✅ **数据持久化** - SQLite数据库,项目自动保存
- ✅ 论文结构管理 - 树形章节结构，拖拽排序
- ✅ 富文本编辑 - 基于 TipTap 的 WYSIWYG 编辑器
- ✅ 模板系统 - 内置默认模板和北京大学模板
- ✅ 项目管理 - 创建、保存、加载、删除项目

### 🚧 开发中
- 🔄 图表自动编号 - 插入图片/表格自动编号
- 🔄 参考文献管理 - 文献库管理，一键引用
- 🔄 实时预览 - 边写边看最终效果
- 🔄 导出 Word - 一键导出符合学校要求的文档

## 技术栈

- **Electron 28** - 跨平台桌面应用
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **TipTap** - 富文本编辑器
- **Zustand** - 状态管理
- **sql.js** - SQLite 数据库
- **docx** - Word 文档生成
- **Vite** - 构建工具

## 项目结构

```
thesis-writer/
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   └── services/         # 主进程服务
├── src/                  # 渲染进程
│   ├── components/       # UI 组件
│   │   ├── Editor/      # 富文本编辑器
│   │   ├── Layout/      # 布局组件
│   │   ├── Preview/     # 实时预览
│   │   └── Reference/   # 参考文献管理
│   ├── stores/          # 状态管理
│   ├── types/           # TypeScript 类型
│   └── App.tsx          # 根组件
├── templates/            # 论文模板
│   └── default.json     # 默认模板
└── package.json
```

## 开发指南

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 一键启动 (推荐)
npm run dev

# 或分别启动
npm run electron:dev
```

### 构建

```bash
# 构建应用
npm run build
npm run build:electron

# 打包安装程序
npm run electron:build
```

### 数据库测试

```bash
# 测试数据库内容
node test-db.js
```

## 数据存储

### 数据库文件
- **macOS**: `~/Library/Application Support/无格式论文写作器/thesis-writer.db`
- **Windows**: `%APPDATA%/无格式论文写作器/thesis-writer.db`
- **Linux**: `~/.config/无格式论文写作器/thesis-writer.db`

### 数据表
- `projects` - 项目信息
- `chapters` - 章节内容
- `references` - 参考文献
- `templates` - 格式模板
- `settings` - 用户设置

## 使用方法

1. **创建项目** - 点击"新建项目"，输入项目名称
2. **选择模板** - 选择学校对应的论文模板
3. **规划结构** - 在左侧大纲中创建章节
4. **分章节写作** - 选择章节后在编辑器中写内容
5. **插入图表** - 点击工具栏插入图片/表格，自动编号
6. **管理引用** - 在参考文献面板添加文献，一键插入引用
7. **导出论文** - 点击"导出"生成符合学校要求的 Word 文档

## 许可证

MIT
