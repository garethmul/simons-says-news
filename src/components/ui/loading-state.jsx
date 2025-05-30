import React from 'react';
import { Card, CardContent, CardHeader } from './card';
import { Loader2 } from 'lucide-react';

/**
 * Loading skeleton card component
 */
const LoadingCard = ({ lines = 3 }) => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </CardHeader>
    <CardContent>
      {[...Array(lines)].map((_, i) => (
        <div 
          key={i} 
          className="h-4 bg-gray-200 rounded mb-2" 
          style={{ width: `${80 + Math.random() * 20}%` }}
        />
      ))}
    </CardContent>
  </Card>
);

/**
 * Professional loading state with spinner and skeleton cards
 */
export const LoadingState = ({ 
  message = "Loading content...", 
  count = 3,
  showSpinner = true,
  className = ""
}) => (
  <div className={`space-y-4 ${className}`}>
    {showSpinner && (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-gray-600 font-medium">{message}</span>
        </div>
      </div>
    )}
    {[...Array(count)].map((_, i) => (
      <LoadingCard key={i} lines={3 + (i % 2)} />
    ))}
  </div>
);

export default LoadingState; 