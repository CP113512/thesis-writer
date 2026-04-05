import { Node, mergeAttributes } from '@tiptap/core';

// 表格引用扩展 - 在编辑器中显示"表X"
export const TableRefExtension = Node.create({
  name: 'tableRef',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      tableAlt: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-table-ref]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tableAlt = node.attrs.tableAlt || '表';
    const shortAlt = tableAlt.length > 10 ? tableAlt.slice(0, 10) + '...' : tableAlt;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-table-ref': tableAlt,
        class: 'table-ref-placeholder',
        contenteditable: 'false',
        title: tableAlt,
      }),
      `表${shortAlt}`,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const container = document.createElement('span');
      container.className = 'table-ref-placeholder-wrapper';
      container.style.display = 'inline';

      const span = document.createElement('span');
      span.className = 'table-ref-placeholder';

      const tableAlt = node.attrs.tableAlt || '表';
      const shortAlt = tableAlt.length > 10 ? tableAlt.slice(0, 10) + '...' : tableAlt;
      span.textContent = `表${shortAlt}`;
      span.title = tableAlt;

      span.setAttribute('data-table-ref', tableAlt);
      container.appendChild(span);
      return {
        dom: container,
        contentDOM: null,
      };
    };
  },
});
