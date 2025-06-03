// Project Eden Helper Functions

import { STATUS_VARIANTS, RELEVANCE_SCORE_THRESHOLDS } from './constants.js';

/**
 * Format date to locale string with time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
};

/**
 * Format date to locale string without time
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString();
};

/**
 * Calculate days ago from date string
 */
export const getDaysAgo = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
  return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
};

/**
 * Get relevance score category
 */
export const getRelevanceCategory = (score) => {
  if (score >= RELEVANCE_SCORE_THRESHOLDS.HIGH) return 'high';
  if (score >= RELEVANCE_SCORE_THRESHOLDS.MODERATE) return 'moderate';
  return 'low';
};

/**
 * Get relevance score display
 */
export const getRelevanceDisplay = (score) => {
  return `${(score * 100).toFixed(0)}%`;
};

/**
 * Get badge variant for relevance score
 */
export const getRelevanceBadgeVariant = (score) => {
  if (score >= RELEVANCE_SCORE_THRESHOLDS.HIGH) return 'default';
  if (score >= RELEVANCE_SCORE_THRESHOLDS.MODERATE) return 'secondary';
  return 'outline';
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, maxLength = 300) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

/**
 * Parse keywords string into array
 */
export const parseKeywords = (keywordsString) => {
  if (!keywordsString) return [];
  return keywordsString.split(',').map(k => k.trim()).filter(Boolean);
};

/**
 * Get source type display text
 */
export const getSourceType = (source) => {
  return source.source_type || (source.rss_feed_url ? 'RSS' : 'Web Scraping');
};

/**
 * Get success rate color class
 */
export const getSuccessRateColor = (successRate) => {
  if (!successRate) return 'text-gray-500';
  if (successRate > 0.7) return 'text-green-600';
  if (successRate > 0.3) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Get estimated wait time for job queue position
 */
export const getEstimatedWaitTime = (queuePosition) => {
  if (queuePosition === 0) return 'Processing next';
  return `~${queuePosition * 2} minutes`;
};

/**
 * Get content type icon name
 */
export const getContentTypeIcon = (contentType) => {
  switch (contentType) {
    case 'article': return 'FileText';
    case 'social_post': return 'Share2';
    case 'video_script': return 'Video';
    case 'prayer_points': return 'Heart';
    default: return 'FileText';
  }
};

/**
 * Build URL with query parameters
 */
export const buildApiUrl = (baseUrl, endpoint, params = {}) => {
  const url = new URL(endpoint, baseUrl || window.location.origin);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

/**
 * Get tab URL for routing
 */
export const getTabUrl = (tabValue) => {
  return `${window.location.origin}${window.location.pathname}#${tabValue}`;
};

/**
 * Get content modal URL for routing
 */
export const getContentModalUrl = (tabValue, contentId) => {
  return `${window.location.origin}${window.location.pathname}#${tabValue}/${contentId}`;
};

/**
 * Parse URL hash to get tab and content ID
 */
export const parseUrlHash = () => {
  const hash = window.location.hash.substring(1); // Remove the #
  const parts = hash.split('/');
  
  return {
    tab: parts[0] || '',
    contentId: parts[1] ? parseInt(parts[1]) : null,
    hasModal: parts.length > 1 && !isNaN(parseInt(parts[1]))
  };
};

/**
 * Get current tab from URL hash
 */
export const getTabFromHash = (validTabs, defaultTab = 'dashboard') => {
  const { tab } = parseUrlHash();
  return validTabs.includes(tab) ? tab : defaultTab;
};

/**
 * Get current content ID from URL hash
 */
export const getContentIdFromHash = () => {
  const { contentId } = parseUrlHash();
  return contentId;
};

/**
 * Update URL hash for tab navigation
 */
export const updateUrlForTab = (tabValue) => {
  const newUrl = `#${tabValue}`;
  if (window.location.hash !== newUrl) {
    window.history.pushState(null, null, newUrl);
  }
};

/**
 * Update URL hash for modal navigation
 */
export const updateUrlForModal = (tabValue, contentId) => {
  const newUrl = `#${tabValue}/${contentId}`;
  if (window.location.hash !== newUrl) {
    window.history.pushState(null, null, newUrl);
  }
};

/**
 * Close modal and update URL back to tab
 */
export const closeModalAndUpdateUrl = (tabValue) => {
  const newUrl = `#${tabValue}`;
  if (window.location.hash !== newUrl) {
    window.history.pushState(null, null, newUrl);
  }
};

/**
 * Check if URL indicates a modal should be open
 */
export const shouldOpenModalFromUrl = () => {
  const { hasModal } = parseUrlHash();
  return hasModal;
};

/**
 * Filter array by search text across multiple fields
 */
export const filterBySearch = (items, searchText, fields) => {
  if (!searchText) return items;
  
  const searchLower = searchText.toLowerCase();
  return items.filter(item => {
    return fields.some(field => {
      // Use getNestedValue for nested paths (e.g., 'sourceArticle.source_name')
      const value = field.includes('.') ? getNestedValue(item, field) : item[field];
      return value && value.toString().toLowerCase().includes(searchLower);
    });
  });
};

/**
 * Get nested object value by dot notation
 */
export const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Debounce function for search inputs
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Error handling wrapper for async functions
 */
export const withErrorHandling = async (asyncFn, errorMessage = 'An error occurred') => {
  try {
    return await asyncFn();
  } catch (error) {
    console.error(errorMessage, error);
    throw new Error(`${errorMessage}: ${error.message}`);
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate unique ID
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}; 