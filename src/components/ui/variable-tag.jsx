import React from 'react';
import { Badge } from './badge';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * VARIABLE TAG COMPONENT
 * 
 * Visual tag that represents a variable in the template editor.
 * Cannot be partially deleted - acts as a single unit.
 */
export const VariableTag = ({ 
  variable, 
  onRemove, 
  size = 'default',
  variant = 'secondary',
  className,
  readOnly = false,
  ...props 
}) => {
  const handleKeyDown = (e) => {
    // Prevent partial deletion - delete the entire tag or nothing
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (!readOnly && onRemove) {
        onRemove(variable);
      }
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Article': 'bg-blue-100 text-blue-800 border-blue-200',
      'Blog': 'bg-green-100 text-green-800 border-green-200',
      'Account': 'bg-purple-100 text-purple-800 border-purple-200',
      'Step Output': 'bg-orange-100 text-orange-800 border-orange-200',
      'Custom': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category] || colors['Custom'];
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'input':
        return '📥';
      case 'step_output':
        return '🔗';
      case 'custom':
        return '⚙️';
      default:
        return '📝';
    }
  };

  return (
    <Badge
      variant={variant}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 cursor-pointer select-none',
        'border border-solid rounded-md',
        'transition-all duration-200',
        'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        !readOnly && 'hover:bg-opacity-80',
        getCategoryColor(variable.category),
        className
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      contentEditable={false}
      {...props}
    >
      <span className="text-xs">{getTypeIcon(variable.type)}</span>
      <span className="font-medium text-xs">
        {variable.displayName || variable.name}
      </span>
      {!readOnly && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(variable);
          }}
          className="ml-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      )}
    </Badge>
  );
};

/**
 * VARIABLE TAG INPUT
 * 
 * Specialized input component that renders variables as visual tags
 * within the text, preventing partial deletion.
 */
export const VariableTagInput = ({
  value = '',
  onChange,
  placeholder = 'Type your prompt here...',
  availableVariables = [],
  onInsertVariable,
  className,
  rows = 6,
  readOnly = false,
  ...props
}) => {
  const [caretPosition, setCaretPosition] = React.useState(0);
  const [showVariablePicker, setShowVariablePicker] = React.useState(false);
  const textareaRef = React.useRef(null);
  const containerRef = React.useRef(null);

  // Parse text to identify variables and render them as tags
  const parseContent = (text) => {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = variablePattern.exec(text)) !== null) {
      // Add text before variable
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Add variable tag
      const variableName = match[1].trim();
      const variable = availableVariables.find(v => v.name === variableName) || {
        name: variableName,
        displayName: variableName,
        type: 'custom',
        category: 'Custom'
      };

      parts.push({
        type: 'variable',
        content: match[0],
        variable: variable
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  const handleTextareaChange = (e) => {
    setCaretPosition(e.target.selectionStart);
    onChange?.(e.target.value);
  };

  const insertVariable = (variable) => {
    if (readOnly) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variableText = `{{${variable.name}}}`;
    
    const newValue = value.slice(0, start) + variableText + value.slice(end);
    onChange?.(newValue);
    
    // Move cursor after inserted variable
    setTimeout(() => {
      const newPosition = start + variableText.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);

    setShowVariablePicker(false);
    onInsertVariable?.(variable);
  };

  const removeVariable = (variableToRemove) => {
    if (readOnly) return;

    const pattern = new RegExp(`\\{\\{\\s*${variableToRemove.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
    const newValue = value.replace(pattern, '');
    onChange?.(newValue);
  };

  const parts = parseContent(value);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Visual representation with variable tags */}
      <div className="relative">
        <div className={cn(
          'min-h-[120px] p-3 border border-input rounded-md',
          'bg-background text-sm leading-relaxed',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          readOnly && 'bg-muted cursor-not-allowed'
        )}>
          {parts.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            parts.map((part, index) => (
              <span key={index}>
                {part.type === 'text' ? (
                  <span>{part.content}</span>
                ) : (
                  <VariableTag
                    variable={part.variable}
                    onRemove={removeVariable}
                    readOnly={readOnly}
                    className="mx-1"
                  />
                )}
              </span>
            ))
          )}
        </div>

        {/* Hidden textarea for text input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          rows={rows}
          readOnly={readOnly}
          className={cn(
            'absolute inset-0 w-full h-full p-3 resize-none',
            'bg-transparent text-transparent caret-black',
            'border-0 outline-none focus:ring-0',
            'selection:bg-blue-200 selection:text-transparent',
            readOnly && 'cursor-not-allowed'
          )}
          onKeyDown={(e) => {
            // Show variable picker on @ or {{
            if (e.key === '@' || (e.key === '{' && e.shiftKey)) {
              setShowVariablePicker(true);
            }
            // Hide on escape
            if (e.key === 'Escape') {
              setShowVariablePicker(false);
            }
          }}
          {...props}
        />
      </div>

      {/* Variable picker dropdown */}
      {showVariablePicker && availableVariables.length > 0 && !readOnly && (
        <div className="absolute z-50 mt-1 w-full max-w-sm bg-background border border-border rounded-md shadow-lg">
          <div className="p-2 border-b border-border">
            <h4 className="text-sm font-medium">Insert Variable</h4>
            <p className="text-xs text-muted-foreground">Click to insert</p>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {availableVariables.map((variable, index) => (
              <button
                key={`${variable.name}-${index}`}
                type="button"
                onClick={() => insertVariable(variable)}
                className={cn(
                  'w-full p-2 text-left hover:bg-accent hover:text-accent-foreground',
                  'flex items-center gap-2 transition-colors'
                )}
              >
                <VariableTag 
                  variable={variable} 
                  readOnly 
                  size="sm" 
                  className="pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground truncate">
                    {variable.category}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowVariablePicker(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Press Escape to close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 