import React from 'react';
import { Button } from '../ui/button';
import { RotateCcw, X } from 'lucide-react';

const RegenerateButton = ({ 
  articleId, 
  onRegenerate, 
  disabled = false, 
  reason = null, 
  accountSettings,
  loading = false 
}) => {
  const handleClick = () => {
    if (!disabled && onRegenerate) {
      onRegenerate(articleId);
    }
  };

  const buttonText = disabled ? 'Cannot Regenerate' : 'Regenerate';
  const buttonIcon = disabled ? X : RotateCcw;
  const IconComponent = buttonIcon;

  return (
    <Button 
      size="sm" 
      variant={disabled ? "outline" : "secondary"}
      onClick={handleClick}
      disabled={disabled || loading}
      className={disabled ? 
        "text-red-600 border-red-300 hover:bg-red-50 cursor-not-allowed" : 
        "text-gray-700 hover:text-gray-900"
      }
      title={reason || (disabled ? "Regeneration not available" : "Regenerate content from source article")}
    >
      <IconComponent className="w-4 h-4 mr-2" />
      {loading ? 'Regenerating...' : buttonText}
    </Button>
  );
};

export default RegenerateButton; 