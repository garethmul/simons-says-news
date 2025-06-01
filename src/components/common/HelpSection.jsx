import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Collapsible Help Section Component
 * 
 * @param {Object} props
 * @param {string} props.title - The help section title
 * @param {React.ReactNode} props.children - The help content
 * @param {string} props.bgColor - Background color class (default: 'bg-blue-50')
 * @param {string} props.borderColor - Border color class (default: 'border-blue-200') 
 * @param {string} props.textColor - Text color class (default: 'text-blue-800')
 * @param {string} props.headingColor - Heading color class (default: 'text-blue-900')
 * @param {boolean} props.defaultExpanded - Whether to start expanded (default: false)
 */
export const HelpSection = ({
  title = "Help",
  children,
  bgColor = 'bg-blue-50',
  borderColor = 'border-blue-200',
  textColor = 'text-blue-800',
  headingColor = 'text-blue-900',
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`mt-4 rounded-lg border ${bgColor} ${borderColor}`}>
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full justify-between p-4 h-auto font-medium ${headingColor} hover:bg-transparent`}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          <span>{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>
      
      {isExpanded && (
        <div className={`px-4 pb-4 ${textColor}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default HelpSection; 