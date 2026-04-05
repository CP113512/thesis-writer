import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useProjectStore } from '../../stores/projectStore';
import { Toolbar } from './Toolbar';
import { ReferencePanel } from '../Reference/ReferencePanel';
import { CitationExtension } from './CitationExtension';
import { FigureCaptionExtension } from './FigureCaptionExtension';
import { FigureRefExtension } from './FigureRefExtension';
import { TableRefExtension } from './TableRefExtension';
import { TableCaptionExtension } from './TableCaptionExtension';
import { HeadingExtension } from './HeadingExtension';
import { ImageExtension } from './ImageExtension';
import { TableExtension } from './TableExtension';
import './Editor.css';

export const Editor: React.FC = () => {
  const { currentProject, currentChapterId, updateChapterContent, updateChapter, setCurrentChapter } = useProjectStore();
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastChapterIdRef = useRef<string | null>(null);
  const lastProjectIdRef = useRef<string | null>(null);
  const isUserEditingRef = useRef(false);
  const isRestoringContentRef = useRef(false); // 防止恢复内容时触发更新循环

  // 按 orderIndex 排序的章节列表
  const sortedChapters = useMemo(() =>
    currentProject?.chapters
      ? [...currentProject.chapters].sort((a, b) => a.orderIndex - b.orderIndex)
      : [],
    [currentProject?.chapters]
  );

  // 将所有章节内容合并为一个文档，并添加自动序号
  const mergeChapterContents = useCallback(() => {
    if (!sortedChapters.length) return { type: 'doc', content: [] } as JSONContent;

    const mergedContent: JSONContent[] = [];

    sortedChapters.forEach((chapter) => {
      try {
        const chapterJson = JSON.parse(chapter.content || '{"type":"doc","content":[]}') as JSONContent;
        if (chapterJson.content && Array.isArray(chapterJson.content)) {
          // 添加章节分隔
          if (mergedContent.length > 0) {
            mergedContent.push({ type: 'paragraph', content: [] });
          }

          // 为标题添加序号属性
          let isFirstHeading = true;
          const processedContent = chapterJson.content.map(node => {
            if (node.type === 'heading' && isFirstHeading) {
              isFirstHeading = false;
              // 第一个标题是章节标题，添加序号
              if (chapter.number) {
                return {
                  ...node,
                  attrs: {
                    ...(node.attrs || {}),
                    'data-number': chapter.number,
                  },
                };
              }
            }
            return node;
          });

          mergedContent.push(...processedContent);
        }
      } catch {
        // 如果解析失败，添加一个带序号的标题
        const headingNode: JSONContent = {
          type: 'heading',
          attrs: {
            level: chapter.level || 1,
            'data-number': chapter.number || undefined,
          },
          content: [{ type: 'text', text: chapter.title }],
        };
        mergedContent.push(headingNode, { type: 'paragraph', content: [] });
      }
    });

    return { type: 'doc', content: mergedContent } as JSONContent;
  }, [sortedChapters]);

  // 从合并的内容中提取各章节内容
  const splitContentToChapters = useCallback((docContent: JSONContent) => {
    if (!docContent?.content) return [];

    const chapters: { chapterIndex: number; content: JSONContent }[] = [];
    let currentChapterContent: JSONContent[] = [];
    let chapterIndex = 0;
    let isFirstNode = true;

    for (const node of docContent.content) {
      if (node.type === 'heading' && [1, 2, 3].includes(node.attrs?.level)) {
        // 遇到任何标题，保存上一个章节（如果有内容）
        if (!isFirstNode && currentChapterContent.length > 0) {
          chapters.push({
            chapterIndex,
            content: { type: 'doc', content: currentChapterContent }
          });
          chapterIndex++;
          currentChapterContent = [];
        }
        isFirstNode = false;
      }

      // 跳过开头的空段落
      if (node.type === 'paragraph' && (!node.content || node.content.length === 0) && currentChapterContent.length === 0) {
        continue;
      }

      currentChapterContent.push(node);
    }

    // 保存最后一个章节
    if (currentChapterContent.length > 0) {
      chapters.push({
        chapterIndex,
        content: { type: 'doc', content: currentChapterContent }
      });
    }

    return chapters;
  }, [sortedChapters]);

  // 提取标题信息
  const extractTitleInfo = (content: JSONContent) => {
    if (!content?.content) return null;

    for (const node of content.content) {
      if (node.type === 'heading' && node.content?.[0]?.text && node.attrs?.level) {
        let text = node.content[0].text;
        // 移除可能存在的序号前缀（如 "1 绪论" -> "绪论"，"1.1 背景" -> "背景"）
        text = text.replace(/^\d+(\.\d+)*\s*/, '');
        return { title: text, level: node.attrs.level };
      }
    }
    return null;
  };

  // 用于清理 setTimeout 的 ref
  const editTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // 禁用默认的 heading，使用自定义的
      }),
      HeadingExtension.configure({
        levels: [1, 2, 3],
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      TableExtension.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      CitationExtension,
      FigureCaptionExtension,
      FigureRefExtension,
      TableRefExtension,
      TableCaptionExtension,
    ],
    content: mergeChapterContents(),
    onUpdate: ({ editor }) => {
      // 如果正在恢复内容，跳过更新
      if (isRestoringContentRef.current) {
        return;
      }

      // 标记用户正在编辑
      isUserEditingRef.current = true;

      const docContent = editor.getJSON();
      const contentStr = JSON.stringify(docContent);

      // 防止频繁保存
      if (contentStr === lastSavedContentRef.current) {
        isUserEditingRef.current = false;
        return;
      }

      // 检查是否删除了章节标题（标题数量减少）
      const currentHeadingCount = docContent.content?.filter((n: any) => n.type === 'heading').length || 0;
      const expectedHeadingCount = sortedChapters.length;

      if (currentHeadingCount < expectedHeadingCount) {
        // 章节标题被删除，恢复内容
        isRestoringContentRef.current = true;
        const mergedContent = mergeChapterContents();
        lastSavedContentRef.current = JSON.stringify(mergedContent);
        editor.commands.setContent(mergedContent, false);
        // 恢复后重新聚焦编辑器
        editor.commands.focus();
        // 延迟重置恢复标记和显示提示，确保编辑器状态稳定
        setTimeout(() => {
          isRestoringContentRef.current = false;
          alert('章节标题不能删除，请通过侧边栏管理章节');
        }, 50);
        isUserEditingRef.current = false;
        return;
      }

      lastSavedContentRef.current = contentStr;

      // 分割内容并更新各章节
      const chapterContents = splitContentToChapters(docContent);

      chapterContents.forEach(({ chapterIndex, content }) => {
        const chapter = sortedChapters[chapterIndex];
        if (!chapter) return;

        const contentStr = JSON.stringify(content);
        updateChapterContent(chapter.id, contentStr);

        const titleInfo = extractTitleInfo(content);
        if (titleInfo && (titleInfo.title !== chapter.title || titleInfo.level !== chapter.level)) {
          // 计算新的 parentId
          let newParentId: string | null = null;
          if (titleInfo.level > 1) {
            const currentIndex = sortedChapters.findIndex(ch => ch.id === chapter.id);
            for (let i = currentIndex - 1; i >= 0; i--) {
              if (sortedChapters[i].level === titleInfo.level - 1) {
                newParentId = sortedChapters[i].id;
                break;
              }
            }
          }
          updateChapter(chapter.id, { title: titleInfo.title, level: titleInfo.level, parentId: newParentId });
        }
      });

      // 清理之前的 timeout
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
      }
      // 延迟重置编辑标记，确保状态更新完成
      editTimeoutRef.current = setTimeout(() => {
        isUserEditingRef.current = false;
        editTimeoutRef.current = null;
      }, 100);
    },
  });

  // 组件卸载时清理 timeout
  useEffect(() => {
    return () => {
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
      }
    };
  }, []);

  // 当项目切换时更新内容（只在项目ID变化时，而非内容变化时）
  useEffect(() => {
    // 如果是用户正在编辑，不要重置内容
    if (isUserEditingRef.current) return;

    // 只在项目ID真正变化时才重置内容
    if (editor && currentProject && currentProject.id !== lastProjectIdRef.current) {
      lastProjectIdRef.current = currentProject.id;
      const mergedContent = mergeChapterContents();
      editor.commands.setContent(mergedContent);
      lastSavedContentRef.current = JSON.stringify(mergedContent);
    }
  }, [currentProject?.id, editor, mergeChapterContents]);

  // 当章节数量变化时刷新编辑器（新增/删除章节）
  useEffect(() => {
    if (isUserEditingRef.current) return;
    if (!editor || !currentProject) return;

    // 检查章节数量是否变化
    const mergedContent = mergeChapterContents();
    const currentContent = editor.getJSON();
    const currentChapterCount = currentContent.content?.filter(n => n.type === 'heading').length || 0;
    const newChapterCount = mergedContent.content?.filter(n => n.type === 'heading').length || 0;

    if (currentChapterCount !== newChapterCount) {
      editor.commands.setContent(mergedContent);
      lastSavedContentRef.current = JSON.stringify(mergedContent);
    }
  }, [sortedChapters.length, editor, mergeChapterContents, currentProject]);

  // 当章节编号变化时更新编辑器中的序号
  useEffect(() => {
    if (isUserEditingRef.current) return;
    if (!editor || !currentProject) return;

    // 获取当前编辑器中的标题序号
    const currentContent = editor.getJSON();
    const headings = currentContent.content?.filter(n => n.type === 'heading') || [];

    // 检查序号是否有变化
    let needsUpdate = false;
    headings.forEach((heading, index) => {
      const chapter = sortedChapters[index];
      if (chapter) {
        const currentNumber = heading.attrs?.['data-number'] || '';
        const expectedNumber = chapter.number || '';
        if (currentNumber !== expectedNumber) {
          needsUpdate = true;
        }
      }
    });

    // 如果序号有变化，更新编辑器
    if (needsUpdate) {
      const mergedContent = mergeChapterContents();
      editor.commands.setContent(mergedContent);
      lastSavedContentRef.current = JSON.stringify(mergedContent);
    }
  }, [sortedChapters.map(ch => ch.number).join(','), editor, mergeChapterContents, currentProject]);

  // 滚动到当前章节 - 只在章节变化时滚动
  useEffect(() => {
    if (currentChapterId && containerRef.current && editor && currentChapterId !== lastChapterIdRef.current) {
      lastChapterIdRef.current = currentChapterId;

      const chapter = sortedChapters.find(ch => ch.id === currentChapterId);
      if (!chapter) return;

      // 延迟执行，确保 DOM 已渲染
      requestAnimationFrame(() => {
        // 查找包含该章节标题的 heading 元素
        const headings = containerRef.current?.querySelectorAll('h1, h2, h3');
        if (!headings) return;

        for (const heading of headings) {
          const headingText = heading.textContent || '';
          // 匹配章节标题（可能带有编号前缀）
          if (headingText.includes(chapter.title) || chapter.title.includes(headingText.replace(/^\d+(\.\d+)*\s*/, ''))) {
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            break;
          }
        }
      });
    }
  }, [currentChapterId, sortedChapters]);

  // 监听滚动到指定标题的事件（从侧边栏子标题点击触发）
  useEffect(() => {
    const handleScrollToHeading = (e: CustomEvent<{ text: string; level: number }>) => {
      const { text, level } = e.detail;
      if (!containerRef.current) return;

      requestAnimationFrame(() => {
        const headings = containerRef.current?.querySelectorAll(`h${level}`);
        if (!headings) return;

        for (const heading of headings) {
          const headingText = heading.textContent || '';
          // 匹配标题文本
          if (headingText.includes(text) || text.includes(headingText.replace(/^\d+(\.\d+)*\s*/, ''))) {
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            break;
          }
        }
      });
    };

    window.addEventListener('scrollToHeading', handleScrollToHeading as EventListener);
    return () => {
      window.removeEventListener('scrollToHeading', handleScrollToHeading as EventListener);
    };
  }, []);

  // 更新图片和表格的名称显示
  useEffect(() => {
    if (!editor || !containerRef.current) return;

    const updateCaptionDisplays = () => {
      const doc = editor.getJSON();

      // 收集所有图片和表格的信息
      const figures: { alt: string; index: number }[] = [];
      const tables: { caption: string; index: number }[] = [];

      let figIndex = 0;
      let tblIndex = 0;

      const collectInfo = (nodes: any[]) => {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (node.type === 'image') {
            figures.push({ alt: node.attrs?.alt || '未命名图片', index: figIndex++ });
          }
          if (node.type === 'table') {
            // 查找关联的 tableCaption
            const nextNode = nodes[i + 1];
            const prevNode = nodes[i - 1];
            let caption = '';
            if (nextNode?.type === 'tableCaption') {
              caption = nextNode.attrs?.caption || '';
            } else if (prevNode?.type === 'tableCaption') {
              caption = prevNode.attrs?.caption || '';
            }
            tables.push({ caption: caption || node.attrs?.title?.replace('表名: ', '') || '未命名表格', index: tblIndex++ });
          }
          if (node.content) {
            collectInfo(node.content);
          }
        }
      };

      if (doc.content) {
        collectInfo(doc.content);
      }

      // 更新图片显示
      const imgElements = containerRef.current?.querySelectorAll('img');
      imgElements?.forEach((img, idx) => {
        const info = figures[idx];
        if (!info) return;

        // 找到或创建图名显示区域
        let wrapper = img.parentElement;
        if (!wrapper?.classList.contains('figure-wrapper')) {
          // 包装图片
          wrapper = document.createElement('div');
          wrapper.className = 'figure-wrapper';
          wrapper.style.cssText = 'text-align: center; margin: 1em 0;';
          img.parentNode?.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        }

        let captionEl = wrapper.querySelector('.figure-caption-display') as HTMLElement;
        if (!captionEl) {
          captionEl = document.createElement('div');
          captionEl.className = 'figure-caption-display';
          captionEl.contentEditable = 'true';
          captionEl.style.cssText = `
            display: inline-block;
            font-size: 13px;
            color: #495057;
            padding: 4px 12px;
            background: #fffbeb;
            border-radius: 4px;
            margin-top: 8px;
            cursor: text;
            outline: none;
            border: 1px solid #fcd34d;
            min-width: 100px;
          `;
          wrapper.appendChild(captionEl);

          captionEl.addEventListener('blur', () => {
            const newCaption = captionEl.textContent?.trim() || '';
            if (editor) {
              editor.chain().focus().updateAttributes('image', { alt: newCaption }).run();
            }
          });
        }
        if (captionEl.textContent !== info.alt) {
          captionEl.textContent = info.alt;
        }
      });

      // 更新表格显示
      const tableWrappers = containerRef.current?.querySelectorAll('.tableWrapper');
      tableWrappers?.forEach((wrapper, idx) => {
        const info = tables[idx];
        if (!info) return;

        let captionEl = wrapper.querySelector('.table-caption-display') as HTMLElement;
        if (!captionEl) {
          captionEl = document.createElement('div');
          captionEl.className = 'table-caption-display';
          captionEl.contentEditable = 'true';
          captionEl.style.cssText = `
            text-align: center;
            font-size: 13px;
            color: #495057;
            padding: 4px 8px;
            background: #f8f9fa;
            border-radius: 4px 4px 0 0;
            margin-bottom: 4px;
            cursor: text;
            outline: none;
            border: 1px solid #e9ecef;
          `;
          wrapper.insertBefore(captionEl, wrapper.firstChild);

          captionEl.addEventListener('blur', () => {
            const newCaption = captionEl.textContent?.trim() || '';
            if (editor) {
              editor.chain().focus().updateAttributes('table', { title: `表名: ${newCaption}` }).run();
            }
          });
        }
        if (captionEl.textContent !== info.caption) {
          captionEl.textContent = info.caption;
        }
      });
    };

    // 初始更新
    setTimeout(updateCaptionDisplays, 100);

    // 监听编辑器更新
    editor.on('update', updateCaptionDisplays);

    // MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(updateCaptionDisplays);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      editor.off('update', updateCaptionDisplays);
    };
  }, [editor]);

  // 处理引用选择
  const handleSelectReference = useCallback((ref: { id: string }) => {
    if (editor) {
      editor.chain().focus().insertContent({
        type: 'citation',
        attrs: {
          referenceId: ref.id,
        },
      }).run();
    }
    setShowReferencePanel(false);
  }, [editor]);

  if (!currentProject || sortedChapters.length === 0) {
    return (
      <div className="editor empty">
        <div className="empty-editor">
          <h2>选择一个章节开始写作</h2>
          <p>从左侧点击章节，或点击「添加章节」创建新章节</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor continuous-editor">
      <Toolbar editor={editor} onInsertReference={() => setShowReferencePanel(true)} />
      <div className="editor-scroll-container" ref={containerRef}>
        <div className="editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>

      {showReferencePanel && (
        <ReferencePanel
          onSelect={handleSelectReference}
          onClose={() => setShowReferencePanel(false)}
        />
      )}
    </div>
  );
};
