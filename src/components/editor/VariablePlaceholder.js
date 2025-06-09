import { Node, mergeAttributes } from '@tiptap/core';

const VariablePlaceholder = Node.create({
  name: 'variablePlaceholder',

  group: 'inline',
  inline: true,
  atom: true, // Makes the placeholder non-editable and atomic

  addAttributes() {
    return {
      name: {
        default: null,
      },
      type: {
        default: 'core', // 'core' or 'workflow'
      },
      displayName: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-placeholder]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const isCore = HTMLAttributes.type === 'core';
    const bgClass = isCore ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-placeholder': HTMLAttributes.name,
        'data-type': HTMLAttributes.type,
        'contenteditable': 'false',
        'class': `inline-block ${bgClass} text-xs font-medium px-2 py-1 rounded-full mx-1 border select-none cursor-default`,
        'title': HTMLAttributes.displayName || HTMLAttributes.name,
      }),
      `{${HTMLAttributes.name}}`,
    ];
  },

  renderText({ node }) {
    return `{${node.attrs.name}}`;
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('span');
      const isCore = node.attrs.type === 'core';
      const bgClass = isCore ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-green-100 text-green-800 border-green-200';
      
      dom.className = `inline-block ${bgClass} text-xs font-medium px-2 py-1 rounded-full mx-1 border select-none cursor-default`;
      dom.setAttribute('contenteditable', 'false');
      dom.setAttribute('data-placeholder', node.attrs.name);
      dom.setAttribute('data-type', node.attrs.type);
      dom.setAttribute('title', node.attrs.displayName || node.attrs.name);
      dom.textContent = `{${node.attrs.name}}`;
      
      return {
        dom,
      };
    };
  },
});

export default VariablePlaceholder; 