import React, { useState, useEffect, useRef } from 'react';
import { JSONContent } from '@tiptap/core';
import { useProjectStore } from '../../stores/projectStore';
import { FiPlus, FiChevronRight, FiChevronDown, FiTrash2, FiEdit3, FiChevronUp, FiFolder, FiFileText, FiArrowUp, FiArrowDown, FiMenu } from 'react-icons/fi';
import { api } from '../../services/api';
import './Sidebar.css';
import type { Chapter, Project } from '../../types/project';

interface SidebarProps {
  onNewChapter: () => void;
  onNewSubChapter: (parentId: string, level: 2 | 3, afterId: string) => void;
  onOpenProjectList: () => void;
}

// 从内容中提取二级三级标题
function extractSubHeadings(content: string): { level: number; text: string }[] {
  if (!content) return [];
  try {
    const json = JSON.parse(content) as JSONContent;
    const headings: { level: number; text: string }[] = [];
    let isFirst = true;

    const traverse = (node: JSONContent) => {
      if (node.type === 'heading' && node.attrs?.level && node.content?.[0]?.text) {
        // 跳过第一个标题（章节本身的标题）
        if (isFirst) {
          isFirst = false;
          return;
        }
        headings.push({
          level: node.attrs.level as number,
          text: node.content[0].text,
        });
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    return headings;
  } catch {
    return [];
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewChapter, onNewSubChapter, onOpenProjectList }) => {
  const {
    currentProject,
    currentChapterId,
    setCurrentChapter,
    deleteChapter,
    updateChapter,
    loadProject,
    reorderChapters
  } = useProjectStore();
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'name'>[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chapter: Chapter } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProjects = async () => {
    const allProjects = await useProjectStore.getState().loadAllProjects();
    setProjects(allProjects);
  };

  useEffect(() => {
    loadProjects();
  }, [currentProject?.id]);

  // 默认展开所有有子标题的章节
  useEffect(() => {
    if (currentProject) {
      const toExpand = new Set<string>();
      currentProject.chapters.forEach(ch => {
        const subHeadings = extractSubHeadings(ch.content);
        if (subHeadings.length > 0) {
          toExpand.add(ch.id);
        }
      });
      setExpandedChapters(toExpand);
    }
  }, [currentProject?.id]);

  const handleSwitchProject = async (projectId: string) => {
    await loadProject(projectId);
    setShowProjectDropdown(false);
  };

  const handleDeleteProject = async (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('确定要删除这个项目吗？')) {
      await api.deleteProject(projectId);
      await loadProjects();
      if (currentProject?.id === projectId) {
        useProjectStore.setState({ currentProject: null, currentChapterId: null });
      }
    }
  };

  const toggleExpand = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleDelete = (e: React.MouseEvent, chapterId: string) => {
    e.stopPropagation();
    if (confirm('确定删除这个章节吗？')) {
      deleteChapter(chapterId);
    }
  };

  const handleEdit = (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation();
    setEditingId(chapter.id);
    setEditingTitle(chapter.title);
  };

  const handleSaveEdit = (chapterId: string) => {
    if (editingTitle.trim()) {
      updateChapter(chapterId, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleMoveUp = (e: React.MouseEvent, chapterId: string) => {
    e.stopPropagation();
    if (!currentProject) return;
    const index = currentProject.chapters.findIndex(ch => ch.id === chapterId);
    if (index > 0) {
      const newChapters = [...currentProject.chapters];
      [newChapters[index - 1], newChapters[index]] = [newChapters[index], newChapters[index - 1]];
      reorderChapters(newChapters);
    }
  };

  const handleMoveDown = (e: React.MouseEvent, chapterId: string) => {
    e.stopPropagation();
    if (!currentProject) return;
    const index = currentProject.chapters.findIndex(ch => ch.id === chapterId);
    if (index < currentProject.chapters.length - 1) {
      const newChapters = [...currentProject.chapters];
      [newChapters[index], newChapters[index + 1]] = [newChapters[index + 1], newChapters[index]];
      reorderChapters(newChapters);
    }
  };

  // 拖拽
  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(chapterId);
  };

  const handleDragOver = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== chapterId) {
      // 检查是否可以拖拽到目标位置
      const draggedChapter = currentProject?.chapters.find(ch => ch.id === draggedId);
      const targetChapter = currentProject?.chapters.find(ch => ch.id === chapterId);

      if (draggedChapter && targetChapter) {
        // 一级标题只能在一级标题之间拖拽
        if (draggedChapter.level === 1 && targetChapter.level === 1) {
          e.dataTransfer.dropEffect = 'move';
          setDragOverId(chapterId);
        }
        // 二级标题只能在同一父章节下的二级标题之间拖拽
        else if (draggedChapter.level === 2 && targetChapter.level === 2 && draggedChapter.parentId === targetChapter.parentId) {
          e.dataTransfer.dropEffect = 'move';
          setDragOverId(chapterId);
        }
        // 三级标题只能在同一父章节下的三级标题之间拖拽
        else if (draggedChapter.level === 3 && targetChapter.level === 3 && draggedChapter.parentId === targetChapter.parentId) {
          e.dataTransfer.dropEffect = 'move';
          setDragOverId(chapterId);
        } else {
          e.dataTransfer.dropEffect = 'none';
        }
      }
    }
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId || !currentProject) return;

    const draggedChapter = currentProject.chapters.find(ch => ch.id === draggedId);
    const targetChapter = currentProject.chapters.find(ch => ch.id === targetId);

    if (!draggedChapter || !targetChapter) return;

    // 检查是否允许拖拽
    const canDrop =
      (draggedChapter.level === 1 && targetChapter.level === 1) ||
      (draggedChapter.level === 2 && targetChapter.level === 2 && draggedChapter.parentId === targetChapter.parentId) ||
      (draggedChapter.level === 3 && targetChapter.level === 3 && draggedChapter.parentId === targetChapter.parentId);

    if (!canDrop) {
      setDraggedId(null);
      return;
    }

    const chapters = [...currentProject.chapters];
    const draggedIndex = chapters.findIndex(ch => ch.id === draggedId);
    const targetIndex = chapters.findIndex(ch => ch.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [dragged] = chapters.splice(draggedIndex, 1);
    chapters.splice(targetIndex, 0, dragged);
    reorderChapters(chapters);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent, chapter: Chapter) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, chapter });
  };

  const handleAddSubChapter = () => {
    if (!contextMenu) return;
    const { chapter } = contextMenu;
    // 子标题级别 = 当前章节级别 + 1，最大为 3
    const childLevel = Math.min(chapter.level + 1, 3) as 2 | 3;
    onNewSubChapter(chapter.id, childLevel, chapter.id);
    setContextMenu(null);
  };

  // 判断是否可以添加子标题（三级标题不能添加子标题，固定章节也不能添加）
  const canAddSubChapter = contextMenu?.chapter.level && contextMenu.chapter.level < 3 && !contextMenu.chapter.isFixed;

  if (!currentProject) {
    return (
      <div className="sidebar empty">
        <div className="empty-state">
          <p>点击顶部「新建论文」开始写作</p>
        </div>
      </div>
    );
  }

  // 构建层级树：将平铺的章节列表按 level 分组为父子关系
  const buildTree = (chapters: Chapter[]): { chapter: Chapter; children: { chapter: Chapter; children: { chapter: Chapter }[] }[] }[] => {
    // 先按 orderIndex 排序
    const sortedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);

    const tree: { chapter: Chapter; children: { chapter: Chapter; children: { chapter: Chapter }[] }[] }[] = [];
    let currentL1: typeof tree[0] | null = null;
    let currentL2: typeof tree[0]['children'][0] | null = null;

    for (const ch of sortedChapters) {
      if (ch.level === 1) {
        currentL1 = { chapter: ch, children: [] };
        currentL2 = null;
        tree.push(currentL1);
      } else if (ch.level === 2) {
        const node = { chapter: ch, children: [] as { chapter: Chapter }[] };
        if (currentL1) {
          currentL1.children.push(node);
        } else {
          // orphan level-2, treat as top-level
          tree.push({ chapter: ch, children: [] });
        }
        currentL2 = node;
      } else if (ch.level === 3) {
        if (currentL2) {
          currentL2.children.push({ chapter: ch });
        } else if (currentL1) {
          // orphan level-3 under level-1
          currentL1.children.push({ chapter: ch, children: [] });
        } else {
          tree.push({ chapter: ch, children: [] });
        }
      }
    }
    return tree;
  };

  // 格式化章节标题显示
  const formatChapterTitle = (chapter: Chapter) => {
    if (!chapter.number) return chapter.title;
    return `${chapter.number} ${chapter.title}`;
  };

  // 渲染单个章节项
  const renderChapterItem = (chapter: Chapter, index: number, hasChildren: boolean) => {
    const isActive = chapter.id === currentChapterId;
    const isExpanded = expandedChapters.has(chapter.id);
    const isEditing = editingId === chapter.id;
    const isDragging = draggedId === chapter.id;
    const isDragOver = dragOverId === chapter.id;

    // 基于章节自身的 level 属性计算缩进
    // 章标题（level 1）缩进最少，级别越高缩进越多
    // 一级标题：8px，二级标题：24px，三级标题：40px
    const indent = 8 + (chapter.level - 1) * 16;

    // 对于level-1，提取编辑器内容中的子标题（仅当没有level-2子章节时显示）
    const subHeadings = chapter.level === 1 && !hasChildren ? extractSubHeadings(chapter.content) : [];
    const hasSubHeadings = subHeadings.length > 0;
    const canExpand = hasChildren || hasSubHeadings;

    // 非固定章节都可以拖拽
    const canDrag = !chapter.isFixed;

    return (
      <div
        key={chapter.id}
        className={`chapter-node ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
        draggable={canDrag}
        onDragStart={(e) => handleDragStart(e, chapter.id)}
        onDragOver={(e) => handleDragOver(e, chapter.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, chapter.id)}
        onDragEnd={handleDragEnd}
      >
        <div
          className={`chapter-item ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => {
            setCurrentChapter(chapter.id);
            // 点击时切换展开/收起
            if (canExpand) {
              toggleExpand(chapter.id);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, chapter)}
        >
          <span className="drag-handle" title="拖拽调整顺序">
            <FiMenu size={14} />
          </span>

          <span className="expand-area">
            {canExpand ? (
              <button
                className="expand-btn"
                onClick={(e) => { e.stopPropagation(); toggleExpand(chapter.id); }}
              >
                {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              </button>
            ) : <span style={{ width: 18, display: 'inline-block' }} />}
          </span>

          <span className={`chapter-level level-${chapter.level}`}>
            {chapter.level === 1 ? '章' : chapter.level === 2 ? '节' : '点'}
          </span>

          {isEditing ? (
            <input
              type="text"
              className="edit-input"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={() => handleSaveEdit(chapter.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit(chapter.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              autoFocus
            />
          ) : (
            <span className="chapter-title">
              {formatChapterTitle(chapter)}
            </span>
          )}

          <div className="chapter-actions">
            {index > 0 && !chapter.isFixed && (
              <button className="action-btn move-btn" onClick={(e) => handleMoveUp(e, chapter.id)} title="上移">
                <FiArrowUp size={12} />
              </button>
            )}
            {index < currentProject.chapters.length - 1 && !chapter.isFixed && (
              <button className="action-btn move-btn" onClick={(e) => handleMoveDown(e, chapter.id)} title="下移">
                <FiArrowDown size={12} />
              </button>
            )}
            <button className="action-btn" onClick={(e) => handleEdit(e, chapter)} title="重命名">
              <FiEdit3 size={12} />
            </button>
            {!chapter.isFixed && (
              <button className="action-btn delete" onClick={(e) => handleDelete(e, chapter.id)} title="删除">
                <FiTrash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* 从编辑器内容提取的子标题（仅level-1且无子章节时） */}
        {hasSubHeadings && isExpanded && (
          <div className="sub-headings">
            {subHeadings.map((heading, idx) => (
              <div
                key={idx}
                className={`sub-heading-item level-${heading.level} clickable`}
                onClick={() => {
                  if (currentChapterId !== chapter.id) {
                    setCurrentChapter(chapter.id);
                  }
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('scrollToHeading', {
                      detail: { text: heading.text, level: heading.level }
                    }));
                  }, 50);
                }}
                title="点击跳转"
              >
                <span className={`sub-heading-level level-${heading.level}`}>
                  {heading.level === 2 ? '节' : '点'}
                </span>
                <span className="sub-heading-text">{heading.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染整个树
  const renderTree = () => {
    const tree = buildTree(currentProject.chapters);
    const elements: React.ReactNode[] = [];

    tree.forEach((l1Node) => {
      const l1Chapter = l1Node.chapter;
      const flatIndex = currentProject.chapters.findIndex(ch => ch.id === l1Chapter.id);
      const hasL2Children = l1Node.children.length > 0;
      elements.push(renderChapterItem(l1Chapter, flatIndex, hasL2Children));

      // 展开时显示子章节
      if (hasL2Children && expandedChapters.has(l1Chapter.id)) {
        l1Node.children.forEach((l2Node) => {
          const l2Chapter = l2Node.chapter;
          const l2FlatIndex = currentProject.chapters.findIndex(ch => ch.id === l2Chapter.id);
          const hasL3Children = l2Node.children.length > 0;
          elements.push(renderChapterItem(l2Chapter, l2FlatIndex, hasL3Children));

          if (hasL3Children && expandedChapters.has(l2Chapter.id)) {
            l2Node.children.forEach((l3Node) => {
              const l3Chapter = l3Node.chapter;
              const l3FlatIndex = currentProject.chapters.findIndex(ch => ch.id === l3Chapter.id);
              elements.push(renderChapterItem(l3Chapter, l3FlatIndex, false));
            });
          }
        });
      }
    });

    return elements;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="project-selector" ref={dropdownRef}>
          <div className="project-name" onClick={() => { setShowProjectDropdown(!showProjectDropdown); loadProjects(); }}>
            <FiFolder size={14} />
            <span className="project-name-text">{currentProject.name}</span>
            <FiChevronUp size={12} className={showProjectDropdown ? '' : 'rotated'} />
          </div>

          {showProjectDropdown && (
            <div className="project-dropdown">
              <div className="dropdown-header">
                <span>我的项目</span>
                <button className="new-project-btn" onClick={() => { setShowProjectDropdown(false); onOpenProjectList(); }}>
                  <FiPlus size={12} /> 新建
                </button>
              </div>
              <div className="dropdown-list">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`dropdown-item ${project.id === currentProject.id ? 'active' : ''}`}
                    onClick={() => handleSwitchProject(project.id)}
                  >
                    <FiFileText size={14} />
                    <span className="dropdown-item-name">{project.name}</span>
                    {project.id !== currentProject.id && (
                      <button className="dropdown-delete-btn" onClick={(e) => handleDeleteProject(project.id, e)} title="删除项目">
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="add-chapter-btn" onClick={onNewChapter}>
          <FiPlus /> 添加章节
        </button>
      </div>

      <div className="chapter-tree">
        {renderTree()}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 1001 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {canAddSubChapter ? (
            <div className="context-menu-item" onClick={handleAddSubChapter}>
              添加子标题
            </div>
          ) : (
            <div className="context-menu-item disabled">
              无法添加子标题
            </div>
          )}
        </div>
      )}

      <div className="sidebar-tips">
        <p>💡 拖拽章节可调整顺序</p>
        <p>点击箭头可展开子标题</p>
      </div>
    </div>
  );
};
