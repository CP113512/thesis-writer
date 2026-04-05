import { Node, mergeAttributes } from '@tiptap/core';

// 图名扩展 - 存储图名
export const FigureCaptionExtension = Node.create({
  name: 'figureCaption',

  group: 'block',
  atom: true,

  addAttributes() {
    return {
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-figure-caption') || element.textContent || '',
        renderHTML: (attrs) => ({
          'data-figure-caption': attrs.caption,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-figure-caption]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const caption = (node.attrs as any).caption || '图名';
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'figure-caption',
        'data-figure-caption': caption,
      }),
      caption,
    ];
  },
});
