import React from 'react';
import { Badge } from './badge';
import { STATUS_VARIANTS, JOB_STATUS_VARIANTS } from '../../utils/constants';

/**
 * Reusable StatusBadge component for content and job statuses
 */
export const StatusBadge = ({ status, type = 'content', className = '' }) => {
  if (!status) return null;

  const variants = type === 'job' ? JOB_STATUS_VARIANTS : STATUS_VARIANTS;
  const variant = variants[status] || 'secondary';
  const displayText = status.replace('_', ' ');

  return (
    <Badge variant={variant} className={className}>
      {displayText}
    </Badge>
  );
};

export default StatusBadge; 