# 数据库持久化功能说明

## 功能概述

无格式论文写作器现已支持SQLite数据库持久化,所有项目数据、章节内容、参考文献和模板都会自动保存到本地数据库中。

## 技术实现

### 数据库
- 使用 **sql.js** (纯JavaScript实现的SQLite)
- 数据库文件位置: `~/Library/Application Support/thesis-writer/thesis-writer.db` (macOS)
- 支持跨平台 (Windows/Linux/macOS)

### 数据表结构

#### 1. projects (项目表)
```sql
- id: 项目ID
- name: 项目名称
- template_id: 模板ID
- created_at: 创建时间
- updated_at: 更新时间
- file_path: 文件路径
```

#### 2. chapters (章节表)
```sql
- id: 章节ID
- project_id: 所属项目ID
- parent_id: 父章节ID
- title: 章节标题
- order_index: 排序索引
- level: 章节层级 (1/2/3)
- number: 章节编号
- content: 章节内容 (JSON格式)
- is_fixed: 是否固定章节
```

#### 3. references (参考文献表)
```sql
- id: 文献ID
- project_id: 所属项目ID
- type: 文献类型 (journal/conference/book/thesis/web)
- key: 引用标识
- authors: 作者列表 (JSON)
- title: 标题
- journal: 期刊名
- year: 年份
- volume: 卷号
- issue: 期号
- pages: 页码
- publisher: 出版社
- doi: DOI号
- url: 网址
- bibtex: BibTeX格式
```

#### 4. templates (模板表)
```sql
- id: 模板ID
- name: 模板名称
- school: 学校名称
- is_builtin: 是否内置模板
- config: 模板配置 (JSON)
- created_at: 创建时间
```

#### 5. settings (设置表)
```sql
- key: 设置键
- value: 设置值
```

## 使用方法

### 创建新项目
1. 点击"新建论文"按钮
2. 输入论文标题
3. 系统自动创建默认章节结构并保存到数据库

### 打开已有项目
1. 点击"打开项目"按钮
2. 从项目列表中选择要打开的项目
3. 系统自动加载所有章节和参考文献

### 自动保存
- 所有章节内容的修改都会实时标记为未保存状态
- 点击"保存"按钮会持久化到数据库
- 未来版本将支持自动保存功能

## API说明

### 数据库初始化
```typescript
import { api } from './services/api';

// 初始化数据库
await api.initializeDatabase();
```

### 项目操作
```typescript
// 创建项目
await api.createProject(project);

// 获取项目
const project = await api.getProject(projectId);

// 获取所有项目
const projects = await api.getAllProjects();

// 更新项目
await api.updateProject(project);

// 删除项目
await api.deleteProject(projectId);
```

### 章节操作
```typescript
// 创建章节
await api.createChapter(chapter);

// 获取项目的所有章节
const chapters = await api.getChaptersByProject(projectId);

// 更新章节
await api.updateChapter(chapter);

// 删除章节
await api.deleteChapter(chapterId);
```

### 参考文献操作
```typescript
// 创建参考文献
await api.createReference(reference);

// 获取项目的所有参考文献
const references = await api.getReferencesByProject(projectId);

// 更新参考文献
await api.updateReference(reference);

// 删除参考文献
await api.deleteReference(referenceId);
```

## 内置模板

系统默认包含两个内置模板:
1. **默认模板** - 通用毕业论文格式
2. **北京大学** - 北京大学本科毕业论文格式

## 注意事项

1. 数据库文件存储在用户数据目录,卸载应用不会删除数据库
2. 建议定期备份 `thesis-writer.db` 文件
3. 数据库操作都是异步的,使用async/await处理
4. 所有数据库操作都有错误处理,失败时会返回错误信息

## 未来规划

- [ ] 自动保存功能
- [ ] 数据库备份和恢复
- [ ] 云端同步
- [ ] 多设备同步
- [ ] 版本历史记录
