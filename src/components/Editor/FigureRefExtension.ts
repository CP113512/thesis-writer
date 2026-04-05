import { Node, mergeAttributes } from '@tiptap/core';

// 图片引用扩展 - 在编辑器中显示"图X"
export const FigureRefExtension = Node.create({
  name: 'figureRef',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      figureAlt: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-figure-ref]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const figureAlt = node.attrs.figureAlt || '图';
    const shortAlt = figureAlt.length > 10 ? figureAlt.slice(0, 10) + '...' : figureAlt;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-figure-ref': figureAlt,
        class: 'figure-ref-placeholder',
        contenteditable: 'false',
        title: figureAlt,
      }),
      `图${shortAlt}`,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const container = document.createElement('span');
      container.className = 'figure-ref-placeholder-wrapper';
      container.style.display = 'inline';

      const span = document.createElement('span');
      span.className = 'figure-ref-placeholder';

      const figureAlt = node.attrs.figureAlt || '图';
      const shortAlt = figureAlt.length > 10 ? figureAlt.slice(0, 10) + '...' : figureAlt;
      span.textContent = `图${shortAlt}`;
      span.title = figureAlt;

      span.setAttribute('data-figure-ref', figureAlt);
      container.appendChild(span);
      return {
        dom: container,
        contentDOM: null,
      };
    };
  },
});
