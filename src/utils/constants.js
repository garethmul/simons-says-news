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
  VIDEO_SCRIPT: 'video_script'
};

export const TAB_ROUTES = {
  DASHBOARD: 'dashboard',
  REVIEW: 'review',
  APPROVED: 'approved', 
  STORIES: 'stories',
  QUEUED: 'queued',
  JOBS: 'jobs',
  SOURCES: 'sources',
  PROMPTS: 'prompts'
};

export const FILTER_OPTIONS = {
  SOURCES: {
    ALL: 'all',
    ENABLED: 'enabled',
    DISABLED: 'disabled'
  },
  SORT: {
    RELEVANCE: 'relevance',
    DATE: 'date',
    SOURCE: 'source', 
    TITLE: 'title',
    NAME: 'name',
    STATUS: 'status',
    TYPE: 'type',
    ARTICLES: 'articles',
    SUCCESS_RATE: 'success_rate',
    TOTAL_ARTICLES: 'total_articles',
    LAST_CHECK: 'last_check'
  }
};

export const REFRESH_INTERVALS = {
  DATA_REFRESH: 30000, // 30 seconds
  JOBS_REFRESH: 5000,  // 5 seconds for jobs
  PROGRESS_CHECK: 2000 // 2 seconds for progress
};

export const ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch data. Please try again.',
  NETWORK_ERROR: 'Network error. Check your connection.',
  APPROVAL_FAILED: 'Failed to approve content.',
  REJECTION_FAILED: 'Failed to reject content.',
  JOB_CREATION_FAILED: 'Failed to create job.',
  WORKER_START_FAILED: 'Failed to start worker.',
  SOURCE_UPDATE_FAILED: 'Failed to update source status.'
};

export const SUCCESS_MESSAGES = {
  CONTENT_APPROVED: 'Content approved successfully',
  CONTENT_REJECTED: 'Content rejected successfully',
  JOB_CREATED: 'Job created successfully',
  WORKER_STARTED: 'Worker started successfully',
  SOURCE_UPDATED: 'Source status updated successfully'
};

export const API_ENDPOINTS = {
  CONTENT_REVIEW: '/api/eden/content/review',
  NEWS_STORIES: '/api/eden/news/top-stories',
  GENERATION_STATS: '/api/eden/stats/generation',
  JOB_STATS: '/api/eden/jobs/queue/stats',
  BOOKMARKS: '/api/eden/bookmarks',
  SOURCES_STATUS: '/api/eden/news/sources/status',
  CONTENT_GENERATE: '/api/eden/content/generate',
  JOBS_RECENT: '/api/eden/jobs/recent',
  FULL_CYCLE: '/api/eden/automate/full-cycle',
  NEWS_ANALYZE: '/api/eden/news/analyze',
  WORKER_START: '/api/eden/jobs/worker/start'
}; 