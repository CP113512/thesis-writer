import Image from '@tiptap/extension-image';

// 扩展图片以支持 title 属性（用于悬停提示）
export const ImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
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
