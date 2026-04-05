import { Node, mergeAttributes } from '@tiptap/core';
import { useProjectStore } from '../../stores/projectStore';

// 引用占位符扩展 - 在编辑器中显示文献标题
export const CitationExtension = Node.create({
  name: 'citation',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      referenceId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // 获取文献信息
    const reference = getReferenceById(node.attrs.referenceId);
    const displayText = reference ? `[${reference.title.slice(0, 20)}${reference.title.length > 20 ? '...' : ''}]` : '[引用]';

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-citation': node.attrs.referenceId,
        class: 'citation-placeholder',
        contenteditable: 'false',
        title: reference?.title || '', // 鼠标悬停显示完整标题
      }),
      displayText,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const container = document.createElement('span');
      container.className = 'citation-placeholder-wrapper';
      container.style.display = 'inline';

      const span = document.createElement('span');
      span.className = 'citation-placeholder';

      // 获取文献信息
      const reference = getReferenceById(node.attrs.referenceId);
      if (reference) {
        const shortTitle = reference.title.length > 20
          ? reference.title.slice(0, 20) + '...'
          : reference.title;
        span.textContent = `[${shortTitle}]`;
        span.title = reference.title; // 鼠标悬停显示完整标题
      } else {
        span.textContent = '[引用]';
      }

      span.setAttribute('data-citation', node.attrs.referenceId);
      container.appendChild(span);
      return {
        dom: container,
        contentDOM: null,
      };
    };
  },
});

// 辅助函数：根据ID获取文献信息
function getReferenceById(referenceId: string) {
  const state = useProjectStore.getState();
  return state.currentProject?.references.find(ref => ref.id === referenceId);
}

// 解析文本中的引用占位符
export function parseCitationPlaceholders(content: string): any {
  try {
    const json = JSON.parse(content);
    traverseAndConvert(json);
    return json;
  } catch {
    return content;
  }
}

function traverseAndConvert(node: any): void {
  if (node.type === 'text' && node.text) {
    // 检查是否包含引用占位符
    const citationRegex = /\{\{ref:([^}]+)\}\}/g;
    const matches = [...node.text.matchAll(citationRegex)];

    if (matches.length > 0) {
      // 将节点转换为包含引用标记的格式
      const parts: any[] = [];
      let lastIndex = 0;
      let text = node.text;

      for (const match of matches) {
        const beforeText = text.slice(lastIndex, match.index);
        if (beforeText) {
          parts.push({ type: 'text', text: beforeText });
        }
        parts.push({
          type: 'citation',
          attrs: { referenceId: match[1] },
        });
        lastIndex = match.index! + match[0].length;
      }

      const afterText = text.slice(lastIndex);
      if (afterText) {
        parts.push({ type: 'text', text: afterText });
      }

      // 替换原节点
      if (parts.length > 0) {
        Object.assign(node, { type: 'doc', content: parts });
      }
    }
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      traverseAndConvert(child);
    }
  }
}
