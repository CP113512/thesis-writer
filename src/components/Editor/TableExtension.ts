import { Table } from '@tiptap/extension-table';

// 扩展表格以支持 title 属性（用于悬停提示）
export const TableExtension = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute('title') || element.closest('.tableWrapper')?.getAttribute('title');
        },
        renderHTML: (attrs) => {
          if (!attrs.title) {
            return {};
          }
          return {
            title: attrs.title,
          };
        },
      },
    };
  },
});
