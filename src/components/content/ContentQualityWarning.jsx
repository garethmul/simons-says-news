import React from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, Clock, Eye, X } from 'lucide-react';

const ContentQualityWarning = ({ article, accountSettings, className = "" }) => {
  if (!article) return null;

  const getContentLength = () => {
    return article.body_final?.length || article.body_draft?.length || 0;
  };

  const getQualityAssessment = () => {
    const contentLength = getContentLength();
    const titleLength = article.title?.length || 0;
    const contentIssues = article.content_issues || [];
    const qualityScore = article.content_quality_score;

    // Use account settings for thresholds
    const thresholds = accountSettings?.contentQuality?.thresholds || {
      min_content_length: 500,
      good_content_length: 1000,
      title_only_threshold: 150
    };

    let qualityStatus = null;
    let warningLevel = 'info';
    let message = '';
    let recommendations = [];

    // Check for specific content issues
    if (contentIssues.includes('no_content') || contentLength === 0) {
      qualityStatus = 'no-content';
      warningLevel = 'error';
      message = 'No content extracted from source article';
      recommendations = [
        'Content extraction failed',
        'Check source URL manually',
        'Consider skipping this article'
      ];
    } else if (contentIssues.includes('title_only')) {
      qualityStatus = 'title-only';
      warningLevel = 'error';
      message = 'Source contains only title - insufficient for generation';
      recommendations = [
        'Article appears to be title-only',
        'Source extraction may have failed',
        'Content generation not recommended'
      ];
    } else if (contentLength < thresholds.min_content_length) {
      qualityStatus = 'insufficient';
      warningLevel = 'warning';
      message = `Source content is very short (${contentLength} chars) - may produce poor results`;
      recommendations = [
        `Minimum ${thresholds.min_content_length} characters required`,
        'Consider finding a longer source article',
        'Generated content may lack depth'
      ];
    } else if (qualityScore !== null && qualityScore < 0.5) {
      qualityStatus = 'poor-quality';
      warningLevel = 'warning';
      message = `Low quality score (${(qualityScore * 100).toFixed(0)}%) - generation may produce poor results`;
      recommendations = [
        'Source content quality is below recommended threshold',
        'Manual review recommended before generation',
        'Consider improving source selection'
      ];
    } else if (contentLength < thresholds.good_content_length) {
      qualityStatus = 'adequate';
      warningLevel = 'info';
      message = `Source content is adequate (${contentLength} chars) - generation possible`;
      recommendations = [
        'Content length is adequate for generation',
        `Consider sources with ${thresholds.good_content_length}+ characters for better results`
      ];
    }

    return { qualityStatus, warningLevel, message, recommendations };
  };

  const { qualityStatus, warningLevel, message, recommendations } = getQualityAssessment();

  // Don't show warning if there are no issues
  if (!qualityStatus) return null;

  const getWarningColor = () => {
    switch (warningLevel) {
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = () => {
    switch (warningLevel) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getWarningIcon = () => {
    switch (warningLevel) {
      case 'error': return X;
      case 'warning': return AlertTriangle;
      case 'info': return Eye;
      default: return Clock;
    }
  };

  const WarningIcon = getWarningIcon();

  return (
    <div className={`${className} p-3 rounded-lg border ${getWarningColor()}`}>
      <div className="flex items-start gap-2">
        <WarningIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getIconColor()}`} />
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">
            Content Quality: {message}
          </div>
          {recommendations.length > 0 && (
            <ul className="text-xs space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentQualityWarning; 