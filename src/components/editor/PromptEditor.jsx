import React, { forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import VariablePlaceholder from './VariablePlaceholder';

const PromptEditor = forwardRef(({ 
  content, 
  onChange, 
  placeholder = "Enter content...", 
  className = "",
  availablePlaceholders = []
}, ref) => {
  
  // Helper function to convert editor content to plain text with placeholders
  const getPlainTextContent = (editor) => {
    if (!editor) return '';
    
    // Get the editor's JSON representation
    const doc = editor.getJSON();
    
    // Convert to plain text, replacing placeholder nodes with their text representation
    const convertToPlainText = (node) => {
      if (node.type === 'variablePlaceholder') {
        return `{${node.attrs.name}}`;
      }
      
      if (node.type === 'text') {
        return node.text || '';
      }
      
      if (node.content) {
        return node.content.map(convertToPlainText).join('');
      }
      
      if (node.type === 'paragraph') {
        const text = node.content ? node.content.map(convertToPlainText).join('') : '';
        return text + '\n';
      }
      
      if (node.type === 'hardBreak') {
        return '\n';
      }
      
      return '';
    };
    
    let plainText = '';
    if (doc.content) {
      plainText = doc.content.map(convertToPlainText).join('');
    }
    
    // Clean up extra newlines and trim
    return plainText.replace(/\n+$/, '').trim();
  };

  // Helper function to convert plain text with placeholders to editor content
  const setPlainTextContent = (editor, plainText) => {
    if (!editor || !plainText) {
      editor?.commands.setContent('');
      return;
    }
    
    // Parse placeholders and convert to editor nodes
    const placeholderRegex = /\{([a-zA-Z][a-zA-Z0-9_.]*)\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = placeholderRegex.exec(plainText)) !== null) {
      // Add text before placeholder
      if (match.index > lastIndex) {
        const textBefore = plainText.slice(lastIndex, match.index);
        if (textBefore) {
          parts.push({
            type: 'text',
            text: textBefore
          });
        }
      }
      
      // Add placeholder node
      const placeholderName = match[1];
      const placeholder = availablePlaceholders.find(p => p.name === placeholderName);
      
      parts.push({
        type: 'variablePlaceholder',
        attrs: {
          name: placeholderName,
          type: placeholder?.type || 'core',
          displayName: placeholder?.displayName || placeholderName,
        }
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < plainText.length) {
      const remainingText = plainText.slice(lastIndex);
      if (remainingText) {
        parts.push({
          type: 'text',
          text: remainingText
        });
      }
    }
    
    // Set content as a single paragraph with the parts
    if (parts.length > 0) {
      editor.commands.setContent({
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: parts
        }]
      });
    } else {
      editor.commands.setContent('');
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      VariablePlaceholder,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (onChange) {
        const plainText = getPlainTextContent(editor);
        onChange(plainText);
      }
    },
    editorProps: {
      attributes: {
        class: `font-mono text-sm leading-relaxed focus:outline-none min-h-[120px] p-3 border rounded-md bg-gray-50 ${className}`,
        placeholder: placeholder,
      },
    },
  });

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    insertPlaceholder: (placeholder) => {
      if (editor && placeholder) {
        editor.chain().focus().insertContent([
          {
            type: 'variablePlaceholder',
            attrs: {
              name: placeholder.name,
              type: placeholder.type || 'core',
              displayName: placeholder.displayName || placeholder.name,
            },
          },
          {
            type: 'text',
            text: ' ',
          },
        ]).run();
      }
    },
    getEditor: () => editor,
    focus: () => editor?.commands.focus(),
    setContent: (plainText) => setPlainTextContent(editor, plainText),
    getContent: () => getPlainTextContent(editor),
  }), [editor, availablePlaceholders]);

  // Update editor content when prop changes
  React.useEffect(() => {
    if (editor && content !== undefined) {
      const currentPlainText = getPlainTextContent(editor);
      if (content !== currentPlainText) {
        setPlainTextContent(editor, content);
      }
    }
  }, [content, editor, availablePlaceholders]);

  if (!editor) {
    return null;
  }

  return (
    <div className="prompt-editor relative">
      <EditorContent editor={editor} />
      {placeholder && !content && (
        <div className="absolute top-3 left-3 text-gray-400 pointer-events-none font-mono text-sm">
          {placeholder}
        </div>
      )}
    </div>
  );
});

PromptEditor.displayName = 'PromptEditor';

export default PromptEditor; 