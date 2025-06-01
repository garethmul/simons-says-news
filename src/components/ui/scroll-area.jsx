import React from 'react';

/**
 * ScrollArea Component
 * A simple scrollable container with basic styling
 */
const ScrollArea = ({ 
  children, 
  className = '', 
  style = {},
  ...props 
}) => {
  return (
    <div 
      className={`overflow-auto border border-gray-200 rounded-md ${className}`}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 #f1f5f9',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export { ScrollArea }; 