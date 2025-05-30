// Project Eden Constants and Configuration

export const STATUS_VARIANTS = {
  draft: 'secondary',
  review_pending: 'warning', 
  approved: 'success',
  published: 'default',
  rejected: 'destructive'
};

export const JOB_STATUS_VARIANTS = {
  queued: 'warning',
  processing: 'default', 
  completed: 'success',
  failed: 'destructive',
  cancelled: 'secondary'
};

export const RELEVANCE_SCORE_THRESHOLDS = {
  HIGH: 0.6,
  MODERATE: 0.3,
  LOW: 0.0
};

export const PAGINATION_CONFIG = {
  STORIES_PER_PAGE: 10,
  ARTICLES_PER_PAGE: 10,
  JOBS_PER_PAGE: 20
};

export const CONTENT_TYPES = {
  ARTICLE: 'article',
  SOCIAL_POST: 'social_post', 
  VIDEO_SCRIPT: 'video_script',
  PRAYER_POINTS: 'prayer_points'
};

export const TAB_ROUTES = {
  DASHBOARD: 'dashboard',
  REVIEW: 'review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  STORIES: 'stories',
  QUEUED: 'queued',
  JOBS: 'jobs',
  SOURCES: 'sources',
  PROMPTS: 'prompts'
};

export const API_ENDPOINTS = {
  // Content
  CONTENT_REVIEW: '/api/eden/content/review',
  CONTENT_APPROVE: '/api/eden/content/{type}/{id}/status',
  CONTENT_GENERATE: '/api/eden/content/generate',
  CONTENT_TYPES: '/api/eden/content/types',
  
  // Stories
  TOP_STORIES: '/api/eden/news/top-stories',
  ANALYZE_ARTICLES: '/api/eden/news/analyze',
  
  // Jobs
  JOBS_RECENT: '/api/eden/jobs/recent',
  JOBS_STATS: '/api/eden/jobs/queue/stats',
  JOB_CANCEL: '/api/eden/jobs/{id}/cancel',
  JOB_RETRY: '/api/eden/jobs/{id}/retry',
  WORKER_START: '/api/eden/jobs/worker/start',
  
  // Sources
  SOURCES_STATUS: '/api/eden/news/sources/status',
  SOURCE_TOGGLE: '/api/eden/news/sources/{id}/status',
  
  // Automation
  FULL_CYCLE: '/api/eden/automate/full-cycle',
  AUTOMATION_RESET: '/api/eden/automate/reset',
  
  // Bookmarks
  BOOKMARKS: '/api/eden/bookmarks',
  BOOKMARK_IDS: '/api/eden/bookmarks/ids',
  
  // Stats
  GENERATION_STATS: '/api/eden/stats/generation'
};

export const REFRESH_INTERVALS = {
  DATA: 30000, // 30 seconds
  JOBS: 5000,  // 5 seconds
  LOGS: 2000   // 2 seconds
};

export const ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch data',
  APPROVAL_FAILED: 'Failed to approve content',
  REJECTION_FAILED: 'Failed to reject content',
  GENERATION_FAILED: 'Failed to generate content',
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  SERVER_ERROR: 'Server error occurred',
  TIMEOUT: 'Request timed out',
  SOURCE_UPDATE_FAILED: 'Failed to update source status',
  JOB_CANCEL_FAILED: 'Failed to cancel job',
  JOB_RETRY_FAILED: 'Failed to retry job',
  WORKER_START_FAILED: 'Failed to start worker'
};

export const SUCCESS_MESSAGES = {
  CONTENT_APPROVED: 'Content approved successfully',
  CONTENT_REJECTED: 'Content rejected successfully',
  CONTENT_GENERATED: 'Content generation started',
  SOURCE_UPDATED: 'Source status updated successfully',
  JOB_CANCELLED: 'Job cancelled successfully',
  JOB_RETRIED: 'Job retried successfully',
  WORKER_STARTED: 'Job worker started successfully'
};

export const FILTER_OPTIONS = {
  SORT: {
    RELEVANCE: 'relevance',
    DATE: 'date',
    SOURCE: 'source',
    TITLE: 'title'
  },
  STATUS: {
    ALL: 'all',
    ENABLED: 'enabled',
    DISABLED: 'disabled'
  }
};

export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  FETCH_TIMEOUT: 10000, // 10 seconds
  RETRY_DELAY: 1000 // 1 second
}; 