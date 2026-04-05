import { Heading as TiptapHeading } from '@tiptap/extension-heading';

// 自定义 Heading 扩展，支持 data-number 属性
export const HeadingExtension = TiptapHeading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-number': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-number'),
        renderHTML: (attributes) => {
          if (!attributes['data-number']) {
            return {};
          }
          return {
            'data-number': attributes['data-number'],
          };
        },
      },
    };
  },
});
