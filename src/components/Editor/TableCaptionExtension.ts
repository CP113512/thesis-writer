import { Node, mergeAttributes } from '@tiptap/core';

// 表格名称节点 - 存储表名，在编辑器中隐藏
export const TableCaptionExtension = Node.create({
  name: 'tableCaption',

  group: 'block',
  atom: true,

  addAttributes() {
    return {
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-table-caption') || element.textContent || '',
        renderHTML: (attrs) => ({
          'data-table-caption': attrs.caption,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-table-caption]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const caption = (node.attrs as any).caption || '';
    // 不渲染任何可见内容
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'table-caption-hidden',
        'data-table-caption': caption,
        style: 'display: none; height: 0; overflow: hidden;',
      }),
    ];
  },
});
