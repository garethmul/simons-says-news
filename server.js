import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORTS } from './ports.config.js';
import fs from 'fs';

// Project Eden services
import db from './src/services/database.js';
import newsAggregator from './src/services/newsAggregator.js';
import contentGenerator from './src/services/contentGenerator.js';
import aiService from './src/services/aiService.js';
import imageService from './src/services/imageService.js';
import PromptManager from './src/services/promptManager.js';
import jobManager from './src/services/jobManager.js';
import jobWorker from './src/services/jobWorker.js';

// Multi-tenant imports
import organizationRoutes from './src/routes/organizationRoutes.js';
import promptRoutes from './src/routes/promptRoutes.js';
import userManagementRoutes from './src/routes/userManagementRoutes.js';
import { accountContext, optionalAccountContext } from './src/middleware/accountContext.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || PORTS.BACKEND;

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.FRONTEND_URL || 'https://simons-says-news.herokuapp.com',
        'https://simons-says-news.herokuapp.com'
      ]
    : [`http://localhost:${PORTS.FRONTEND}`, `http://127.0.0.1:${PORTS.FRONTEND}`],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Project Eden database
let isSystemReady = false;
let initializationError = null;

// Initialize services after database is ready
let promptManager = null;

async function initializeSystem() {
  try {
    console.log('🚀 Initializing Project Eden system...');
    
    // Initialize database with timeout
    const initPromise = db.initialize();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database initialization timeout')), 30000)
    );
    
    await Promise.race([initPromise, timeoutPromise]);
    
    // Initialize prompt manager after database is ready
    promptManager = new PromptManager();
    
    // Initialize AI service prompt manager
    aiService.initializePromptManager();
    
    // Start job worker
    console.log('🔄 Starting background job worker...');
    jobWorker.start();
    
    isSystemReady = true;
    initializationError = null;
    console.log('✅ Project Eden system ready!');
  } catch (error) {
    console.error('❌ System initialization failed:', error.message);
    console.error('Full error:', error);
    isSystemReady = false;
    initializationError = error.message;
    
    // Don't exit the process, just log the error
    // This allows the health check endpoint to still work
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: isSystemReady ? 'OK' : 'INITIALIZING', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    systemReady: isSystemReady,
    initializationError: initializationError,
    services: {
      database: isSystemReady,
      ai: !!process.env.OPENAI_API_KEY && !!process.env.GEMINI_API_KEY,
      images: !!process.env.PEXELS_API_KEY && !!process.env.SIRV_CLIENT_ID,
      ideogram: !!process.env.IDEOGRAM_API_KEY,
      newsAggregation: true
    }
  });
});

// Mount organization routes
app.use('/api', organizationRoutes);

// Mount prompt routes
app.use('/api', promptRoutes);

// Mount user management routes
app.use('/api/user-management', userManagementRoutes);

// Project Eden API endpoints

// News aggregation endpoints
app.post('/api/eden/news/aggregate', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    console.log('📰 Manual news aggregation triggered');
    const totalArticles = await newsAggregator.aggregateAllSources();
    
    res.json({
      success: true,
      message: `Aggregated ${totalArticles} articles`,
      totalArticles
    });
  } catch (error) {
    console.error('❌ News aggregation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Manual AI analysis trigger endpoint
app.post('/api/eden/news/analyze/trigger', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { limit = 50 } = req.body; // Allow custom limit
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🧠 Creating AI analysis job for account ${accountId} (limit: ${limit})`);
    
    // Create dedicated AI analysis job
    const jobId = await jobManager.createJob(
      'ai_analysis',
      { limit },
      3, // medium priority
      'user',
      accountId
    );
    
    res.json({
      success: true,
      message: `AI analysis job created (ID: ${jobId}) for account ${accountId}`,
      jobId,
      status: 'queued',
      limit
    });
  } catch (error) {
    console.error('❌ AI analysis trigger failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/eden/news/analyze', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { limit = 20 } = req.body; // Allow custom limit, default to 20
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🧠 Manual news analysis triggered for account ${accountId} (limit: ${limit})`);
    const analyzed = await newsAggregator.analyzeScrapedArticles(limit, accountId);
    
    res.json({
      success: true,
      message: `Analyzed ${analyzed} articles for account ${accountId}`,
      analyzed,
      accountId,
      limit
    });
  } catch (error) {
    console.error('❌ News analysis failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/eden/news/top-stories', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const minScore = parseFloat(req.query.minScore) || 0.6;
    const accountId = req.accountContext.accountId;
    
    const topStories = await newsAggregator.getTopStories(limit, minScore, accountId);
    
    res.json({
      success: true,
      stories: topStories,
      count: topStories.length
    });
  } catch (error) {
    console.error('❌ Error fetching top stories:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all articles endpoint (includes unanalyzed articles) - OPTIMIZED
app.get('/api/eden/news/all-articles', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 100, 500); // Cap at 500 to prevent overload
    const offset = parseInt(req.query.offset) || 0;
    const accountId = req.accountContext.accountId;
    
    console.log(`📰 Fetching articles for account ${accountId} (limit: ${limit}, offset: ${offset})`);
    
    // Get articles with optimized query and pagination
    const allArticles = await db.query(`
      SELECT 
        a.article_id,
        a.title,
        a.url,
        a.publication_date,
        a.relevance_score,
        a.summary_ai,
        a.keywords_ai,
        a.status,
        a.scraped_at,
        s.name as source_name,
        s.url as source_website
      FROM ssnews_scraped_articles a
      LEFT JOIN ssnews_news_sources s ON a.source_id = s.source_id
      WHERE a.account_id = ?
      ORDER BY a.scraped_at DESC, a.article_id DESC
      LIMIT ? OFFSET ?
    `, [accountId, limit, offset]);
    
    // Get total count for pagination (cached for 30 seconds)
    const totalCountResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM ssnews_scraped_articles 
      WHERE account_id = ?
    `, [accountId]);
    
    const totalCount = totalCountResult[0]?.total || 0;
    
    // Quick status summary without additional queries
    const statusSummary = {
      scraped: allArticles.filter(a => a.status === 'scraped').length,
      analyzed: allArticles.filter(a => a.status === 'analyzed').length,
      processed: allArticles.filter(a => a.status === 'processed').length,
      total: totalCount,
      showing: allArticles.length,
      hasMore: offset + limit < totalCount
    };
    
    res.json({
      success: true,
      articles: allArticles,
      count: allArticles.length,
      totalCount,
      statusSummary,
      pagination: {
        limit,
        offset,
        hasMore: statusSummary.hasMore,
        nextOffset: statusSummary.hasMore ? offset + limit : null
      },
      accountId
    });
  } catch (error) {
    console.error('❌ Error fetching all articles:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/eden/news/sources/status', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const accountId = req.accountContext.accountId;
    const cacheKey = getCacheKey('sources', accountId);
    
    // Try to get from cache first
    let cachedSources = getFromCache(cacheKey);
    if (cachedSources) {
      console.log(`📋 Returning cached sources for account ${accountId}`);
      return res.json({
        success: true,
        sources: cachedSources,
        cached: true
      });
    }
    
    console.log(`📋 Fetching fresh sources status for account ${accountId}`);
    const status = await newsAggregator.getSourceStatus(accountId);
    
    // Cache the result
    setCache(cacheKey, status, CACHE_TTL.SOURCES);
    
    res.json({
      success: true,
      sources: status,
      cached: false
    });
  } catch (error) {
    console.error('❌ Error getting source status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Remove a bookmark
app.delete('/api/eden/bookmarks', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { userId, articleId } = req.query;
    const accountId = req.accountContext.accountId;
    
    if (!userId || !articleId) {
      return res.status(400).json({ error: 'User ID and Article ID are required' });
    }

    // Verify article belongs to current account before removing bookmark
    const article = await db.findOne(
      'ssnews_scraped_articles',
      'article_id = ? AND account_id = ?',
      [articleId, accountId]
    );

    if (!article) {
      return res.status(404).json({ error: 'Article not found in current account' });
    }

    const result = await db.query(
      'DELETE FROM ssnews_user_bookmarks WHERE user_id = ? AND article_id = ?',
      [userId, articleId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    console.log(`⭐ User ${userId} removed bookmark for article ${articleId} in account ${accountId}`);

    res.json({
      success: true,
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    console.error('❌ Error removing bookmark:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get bookmarked article IDs only (for quick checking)
app.get('/api/eden/bookmarks/ids', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const userId = req.query.userId;
    const accountId = req.accountContext.accountId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Only get bookmarks for articles in the current account
    const bookmarks = await db.query(`
      SELECT b.article_id 
      FROM ssnews_user_bookmarks b
      JOIN ssnews_scraped_articles a ON b.article_id = a.article_id
      WHERE b.user_id = ? AND a.account_id = ?
    `, [userId, accountId]);

    const articleIds = bookmarks.map(b => b.article_id);

    res.json({
      success: true,
      articleIds
    });
  } catch (error) {
    console.error('❌ Error fetching bookmark IDs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Progress tracking for automation cycles
let automationProgress = {
  isRunning: false,
  currentStep: '',
  progress: 0,
  totalSteps: 3,
  stepDetails: '',
  startTime: null,
  results: {}
};

// Log streaming system - now using database
let logClients = new Set();

// Capture console logs and store in database
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function logToDatabase(level, message, metadata = null, jobId = null, accountId = null) {
  // Only log to database if system is ready and database is available
  if (isSystemReady && db && db.pool) {
    db.insertLog(level, message, 'server', metadata, accountId, jobId).catch(() => {
      // Silently fail to avoid infinite loops
    });
  }
  
  // Broadcast to connected clients immediately
  const logEntry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message),
    source: 'server',
    metadata,
    job_id: jobId,
    account_id: accountId
  };
  
  broadcastLogEntry(logEntry);
}

function broadcastLogEntry(logEntry) {
  const data = JSON.stringify(logEntry);
  logClients.forEach(client => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (error) {
      // Remove disconnected clients
      logClients.delete(client);
    }
  });
}

// Override console methods to capture logs
// COMMENTED OUT TO PREVENT INFINITE RECURSION
/*
console.log = (...args) => {
  const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  originalConsoleLog(...args);
  logToDatabase('info', message);
};

console.error = (...args) => {
  const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  originalConsoleError(...args);
  logToDatabase('error', message);
};

console.warn = (...args) => {
  const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  originalConsoleWarn(...args);
  logToDatabase('warn', message);
};
*/

// Utility function to create job-specific logger
function createJobLogger(jobId, accountId = null) {
  return {
    info: (message, metadata = null) => {
      originalConsoleLog(`[Job ${jobId}] ${message}`);
      // logToDatabase('info', message, metadata, jobId, accountId);
    },
    warn: (message, metadata = null) => {
      originalConsoleWarn(`[Job ${jobId}] ${message}`);
      // logToDatabase('warn', message, metadata, jobId, accountId);
    },
    error: (message, metadata = null) => {
      originalConsoleError(`[Job ${jobId}] ${message}`);
      // logToDatabase('error', message, metadata, jobId, accountId);
    },
    debug: (message, metadata = null) => {
      originalConsoleLog(`[Job ${jobId}] DEBUG: ${message}`);
      logToDatabase('debug', message, metadata, jobId, accountId);
    }
  };
}

// Export createJobLogger for use in other modules
global.createJobLogger = createJobLogger;

// Server-Sent Events endpoint for real-time logs
app.get('/api/eden/logs/stream', accountContext, async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId) {
      res.write(`data: ${JSON.stringify({ error: 'Authentication required' })}\n\n`);
      return;
    }

    // Send recent logs immediately from database - FILTERED BY ACCOUNT
    if (isSystemReady && db) {
      const recentLogs = await db.getLogs(50, null, null, accountId); // Add account filtering
      recentLogs.forEach(log => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
      });
    }
  } catch (error) {
    console.error('Error fetching recent logs:', error);
  }

  // Add client to the set
  logClients.add(res);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
      logClients.delete(res);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    logClients.delete(res);
  });

  req.on('error', () => {
    clearInterval(heartbeat);
    logClients.delete(res);
  });
});

// Get log history endpoint
app.get('/api/eden/logs/history', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = parseInt(req.query.limit) || 100;
    const level = req.query.level; // optional filter by level
    const source = req.query.source; // optional filter by source
    
    // FILTER LOGS BY ACCOUNT
    const logs = await db.getLogs(limit, level, source, accountId);
    
    res.json({
      success: true,
      logs,
      total: logs.length,
      accountId
    });
  } catch (error) {
    console.error('Error fetching log history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear logs endpoint
app.delete('/api/eden/logs', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const olderThanDays = req.query.olderThanDays ? parseInt(req.query.olderThanDays) : null;
    
    // CLEAR ONLY LOGS FOR THIS ACCOUNT
    const deletedCount = await db.clearLogs(olderThanDays, accountId);
    
    res.json({ 
      success: true, 
      message: `Cleared ${deletedCount} log entries for account ${accountId}`,
      deletedCount,
      accountId
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get log statistics endpoint
app.get('/api/eden/logs/stats', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // GET STATS ONLY FOR THIS ACCOUNT
    const stats = await db.getLogStats(accountId);
    
    res.json({
      success: true,
      stats,
      accountId
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Server-Sent Events endpoint for progress updates
app.get('/api/eden/automate/progress', accountContext, (req, res) => {
  const { currentUserId } = req;
  const { accountId } = req.accountContext;
  
  if (!currentUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send current progress immediately - SCOPED TO ACCOUNT
  const accountProgress = { ...automationProgress, accountId };
  res.write(`data: ${JSON.stringify(accountProgress)}\n\n`);

  // Keep connection alive
  const heartbeat = setInterval(() => {
    const accountProgress = { ...automationProgress, accountId };
    res.write(`data: ${JSON.stringify(accountProgress)}\n\n`);
  }, 5000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Reset automation progress endpoint
app.post('/api/eden/automate/reset', accountContext, async (req, res) => {
  try {
    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    automationProgress = {
      isRunning: false,
      currentStep: '',
      progress: 0,
      totalSteps: 3,
      stepDetails: '',
      startTime: null,
      results: {}
    };
    
    res.json({ 
      success: true, 
      message: `Automation progress reset for account ${accountId}`,
      accountId 
    });
  } catch (error) {
    console.error('❌ Error resetting automation progress:', error);
    res.status(500).json({ error: 'Failed to reset automation progress' });
  }
});

// Helper function to update progress
function updateProgress(step, progress, details = '', results = {}) {
  automationProgress = {
    ...automationProgress,
    currentStep: step,
    progress,
    stepDetails: details,
    results: { ...automationProgress.results, ...results }
  };
  console.log(`📊 Progress: ${step} (${progress}%) - ${details}`);
}

// Full automation endpoint (news aggregation + analysis + content generation)
app.post('/api/eden/automate/full-cycle', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const accountId = req.accountContext.accountId;
    console.log(`🤖 Creating full automation cycle job for account ${accountId}`);
    
    // Create job instead of using old progress tracking
    const jobId = await jobManager.createJob(
      'full_cycle',
      {}, // no specific parameters needed
      5, // high priority
      'user',
      accountId // pass account ID
    );
    
    res.json({
      success: true,
      message: `Full automation cycle job created (ID: ${jobId})`,
      jobId,
      status: 'queued'
    });
  } catch (error) {
    console.error('❌ Full automation cycle job creation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== END PROMPT MANAGEMENT API ENDPOINTS =====

// ===== JOB MANAGEMENT API ENDPOINTS =====

// Get job queue status and statistics
app.get('/api/eden/jobs/queue/stats', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const accountId = req.accountContext.accountId;
    const stats = await jobManager.getQueueStats(accountId);
    const workerStatus = jobWorker.getStatus();
    
    res.json({
      success: true,
      stats,
      worker: workerStatus
    });
  } catch (error) {
    console.error('❌ Error getting queue stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get recent jobs
app.get('/api/eden/jobs/recent', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const accountId = req.accountContext.accountId;
    const jobs = await jobManager.getRecentJobs(limit, accountId);
    
    res.json({
      success: true,
      jobs,
      count: jobs.length
    });
  } catch (error) {
    console.error('❌ Error getting recent jobs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get jobs by status
app.get('/api/eden/jobs/status/:status', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { status } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const accountId = req.accountContext.accountId;
    
    if (!['queued', 'processing', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const jobs = await jobManager.getJobsByStatus(status, limit, accountId);
    
    res.json({
      success: true,
      jobs,
      count: jobs.length,
      status
    });
  } catch (error) {
    console.error('❌ Error getting jobs by status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get specific job details
app.get('/api/eden/jobs/:jobId', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { jobId } = req.params;
    const accountId = req.accountContext.accountId;
    const job = await jobManager.getJob(parseInt(jobId), accountId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error('❌ Error getting job:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get logs for a specific job
app.get('/api/eden/jobs/:jobId/logs', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { jobId } = req.params;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify job belongs to this account
    const job = await jobManager.getJob(parseInt(jobId), accountId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found in this account' });
    }
    
    const logs = await db.getJobLogs(parseInt(jobId), accountId);
    
    res.json({
      success: true,
      logs,
      total: logs.length,
      jobId: parseInt(jobId),
      accountId
    });
  } catch (error) {
    console.error('❌ Error fetching job logs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a job
app.post('/api/eden/jobs/:jobId/cancel', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { jobId } = req.params;
    const accountId = req.accountContext.accountId;
    await jobManager.cancelJob(parseInt(jobId), accountId);
    
    res.json({
      success: true,
      message: `Job ${jobId} cancelled`
    });
  } catch (error) {
    console.error('❌ Error cancelling job:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Retry a failed job
app.post('/api/eden/jobs/:jobId/retry', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { jobId } = req.params;
    const accountId = req.accountContext.accountId;
    await jobManager.retryJob(parseInt(jobId), accountId);
    
    res.json({
      success: true,
      message: `Job ${jobId} queued for retry`
    });
  } catch (error) {
    console.error('❌ Error retrying job:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Server-Sent Events endpoint for real-time job updates
app.get('/api/eden/jobs/stream', accountContext, async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    const accountId = req.accountContext.accountId;
    // Send current queue stats immediately
    const stats = await jobManager.getQueueStats(accountId);
    const recentJobs = await jobManager.getRecentJobs(5, accountId);
    const workerStatus = jobWorker.getStatus();
    
    res.write(`data: ${JSON.stringify({
      type: 'queue_update',
      stats,
      recentJobs,
      worker: workerStatus,
      timestamp: new Date().toISOString()
    })}\n\n`);
  } catch (error) {
    console.error('Error fetching initial job data:', error);
  }

  // Send updates every 10 seconds (less aggressive than 5 seconds)
  const updateInterval = setInterval(async () => {
    try {
      const accountId = req.accountContext.accountId;
      const stats = await jobManager.getQueueStats(accountId);
      const workerStatus = jobWorker.getStatus();
      
      res.write(`data: ${JSON.stringify({
        type: 'queue_update',
        stats,
        worker: workerStatus,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      clearInterval(updateInterval);
    }
  }, 10000);

  req.on('close', () => {
    clearInterval(updateInterval);
  });

  req.on('error', () => {
    clearInterval(updateInterval);
  });
});

// Worker control endpoints (these don't need account filtering as they're system-level)
app.post('/api/eden/jobs/worker/start', async (req, res) => {
  try {
    jobWorker.start();
    res.json({ success: true, message: 'Job worker started' });
  } catch (error) {
    console.error('❌ Error starting worker:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/eden/jobs/worker/stop', async (req, res) => {
  try {
    jobWorker.stop();
    res.json({ success: true, message: 'Job worker stopped' });
  } catch (error) {
    console.error('❌ Error stopping worker:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/eden/jobs/worker/status', async (req, res) => {
  try {
    const status = jobWorker.getStatus();
    res.json({ success: true, worker: status });
  } catch (error) {
    console.error('❌ Error getting worker status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup old jobs endpoint
app.delete('/api/eden/jobs/cleanup', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const daysOld = parseInt(req.query.daysOld) || 7;
    const accountId = req.accountContext.accountId;
    const deletedCount = await jobManager.cleanupOldJobs(daysOld, accountId);
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old jobs`,
      deletedCount
    });
  } catch (error) {
    console.error('❌ Error cleaning up jobs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Temporary debug endpoint to apply schema changes
app.post('/api/debug/update-schema', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    console.log('🔧 Applying manual schema updates...');
    
    const results = [];
    
    // Helper function to check if column exists
    const columnExists = async (table, column) => {
      try {
        const result = await db.query(
          'SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = ? AND column_name = ? AND table_schema = DATABASE()',
          [table, column]
        );
        return result[0].count > 0;
      } catch (error) {
        return false;
      }
    };

    // Helper function to check if index exists
    const indexExists = async (table, index) => {
      try {
        const result = await db.query(
          'SELECT COUNT(*) as count FROM information_schema.statistics WHERE table_name = ? AND index_name = ? AND table_schema = DATABASE()',
          [table, index]
        );
        return result[0].count > 0;
      } catch (error) {
        return false;
      }
    };

    // Add job_id column to system_logs if it doesn't exist
    if (!(await columnExists('ssnews_system_logs', 'job_id'))) {
      try {
        await db.query('ALTER TABLE ssnews_system_logs ADD COLUMN job_id INT NULL');
        results.push({ action: 'Add job_id column', status: 'success' });
        console.log('✅ Added job_id column to ssnews_system_logs');
      } catch (error) {
        results.push({ action: 'Add job_id column', status: 'error', error: error.message });
        console.log('❌ Failed to add job_id column:', error.message);
      }
    } else {
      results.push({ action: 'Add job_id column', status: 'skipped', reason: 'Column already exists' });
    }

    // Add account_id column to system_logs if it doesn't exist
    if (!(await columnExists('ssnews_system_logs', 'account_id'))) {
      try {
        await db.query('ALTER TABLE ssnews_system_logs ADD COLUMN account_id VARCHAR(64) NULL');
        results.push({ action: 'Add account_id column', status: 'success' });
        console.log('✅ Added account_id column to ssnews_system_logs');
      } catch (error) {
        results.push({ action: 'Add account_id column', status: 'error', error: error.message });
        console.log('❌ Failed to add account_id column:', error.message);
      }
    } else {
      results.push({ action: 'Add account_id column', status: 'skipped', reason: 'Column already exists' });
    }

    // Add indexes
    if (!(await indexExists('ssnews_system_logs', 'idx_job_id'))) {
      try {
        await db.query('CREATE INDEX idx_job_id ON ssnews_system_logs(job_id)');
        results.push({ action: 'Create job_id index', status: 'success' });
        console.log('✅ Created idx_job_id index');
      } catch (error) {
        results.push({ action: 'Create job_id index', status: 'error', error: error.message });
        console.log('❌ Failed to create job_id index:', error.message);
      }
    } else {
      results.push({ action: 'Create job_id index', status: 'skipped', reason: 'Index already exists' });
    }

    if (!(await indexExists('ssnews_system_logs', 'idx_account_id'))) {
      try {
        await db.query('CREATE INDEX idx_account_id ON ssnews_system_logs(account_id)');
        results.push({ action: 'Create account_id index', status: 'success' });
        console.log('✅ Created idx_account_id index');
      } catch (error) {
        results.push({ action: 'Create account_id index', status: 'error', error: error.message });
        console.log('❌ Failed to create account_id index:', error.message);
      }
    } else {
      results.push({ action: 'Create account_id index', status: 'skipped', reason: 'Index already exists' });
    }

    // Update job_type ENUM to include url_analysis
    try {
      await db.query(`
        ALTER TABLE ssnews_jobs 
        MODIFY COLUMN job_type ENUM('content_generation', 'full_cycle', 'news_aggregation', 'ai_analysis', 'url_analysis') NOT NULL
      `);
      results.push({ action: 'Update job_type ENUM', status: 'success' });
      console.log('✅ Updated job_type ENUM to include url_analysis');
    } catch (error) {
      if (error.message.includes('url_analysis')) {
        results.push({ action: 'Update job_type ENUM', status: 'skipped', reason: 'ENUM already includes url_analysis' });
      } else {
        results.push({ action: 'Update job_type ENUM', status: 'error', error: error.message });
        console.log('❌ Failed to update job_type ENUM:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Schema updates applied',
      results
    });
  } catch (error) {
    console.error('❌ Schema update failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup stale jobs endpoint
app.post('/api/eden/jobs/cleanup-stale', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { olderThanMinutes = 30, dryRun = false } = req.body; // Default: jobs processing for more than 30 minutes
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🧹 ${dryRun ? 'Checking' : 'Cleaning up'} stale jobs for account ${accountId} (older than ${olderThanMinutes} minutes)`);

    // Find jobs that have been "processing" for too long
    const staleJobs = await db.query(`
      SELECT 
        job_id, 
        job_type, 
        status, 
        started_at, 
        progress_percentage,
        worker_id,
        TIMESTAMPDIFF(MINUTE, started_at, NOW()) as minutes_processing
      FROM ssnews_jobs 
      WHERE status = 'processing' 
        AND account_id = ?
        AND started_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
      ORDER BY started_at ASC
    `, [accountId, olderThanMinutes]);

    if (staleJobs.length === 0) {
      return res.json({
        success: true,
        message: `No stale jobs found (older than ${olderThanMinutes} minutes)`,
        staleJobs: [],
        cleaned: 0
      });
    }

    let cleanedCount = 0;
    const results = [];

    for (const job of staleJobs) {
      const jobInfo = {
        job_id: job.job_id,
        job_type: job.job_type,
        started_at: job.started_at,
        minutes_processing: job.minutes_processing,
        worker_id: job.worker_id,
        progress: job.progress_percentage
      };

      if (!dryRun) {
        // Mark job as failed with appropriate error message
        await db.query(`
          UPDATE ssnews_jobs 
          SET 
            status = 'failed',
            completed_at = NOW(),
            error_message = CONCAT('Job timeout: Processing for ', ?, ' minutes without completion. Likely due to server restart.'),
            updated_at = NOW()
          WHERE job_id = ? AND account_id = ?
        `, [job.minutes_processing, job.job_id, accountId]);

        // Log the cleanup action
        logToDatabase('warn', `Cleaned up stale job #${job.job_id} (${job.job_type}) - was processing for ${job.minutes_processing} minutes`, 
          { jobId: job.job_id, jobType: job.job_type, minutesProcessing: job.minutes_processing }, 
          job.job_id, accountId);

        cleanedCount++;
        jobInfo.action = 'marked_as_failed';
      } else {
        jobInfo.action = 'would_mark_as_failed';
      }

      results.push(jobInfo);
    }

    const message = dryRun 
      ? `Found ${staleJobs.length} stale jobs that would be cleaned up`
      : `Cleaned up ${cleanedCount} stale jobs`;

    console.log(`🧹 ${message} for account ${accountId}`);

    res.json({
      success: true,
      message,
      staleJobs: results,
      cleaned: cleanedCount,
      dryRun,
      accountId
    });
  } catch (error) {
    console.error('❌ Error cleaning up stale jobs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== END JOB MANAGEMENT API ENDPOINTS =====

// Test URL submission without middleware
app.post('/api/test/submit-urls', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Test endpoint working',
      body: req.body
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit URLs for analysis endpoint - WORKING VERSION
app.post('/api/eden/sources/submit-urls', accountContext, async (req, res) => {
  try {
    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { urls } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }

    console.log(`📎 Processing ${urls.length} submitted URLs for account ${accountId}`);

    // Get or create "User Submitted" source
    let userSource;
    try {
      userSource = await db.findOne(
        'ssnews_news_sources',
        'name = ? AND account_id = ?',
        ['User Submitted', accountId]
      );

      if (!userSource) {
        console.log('📝 Creating User Submitted source...');
        const sourceResult = await db.insert('ssnews_news_sources', {
          account_id: accountId,
          name: 'User Submitted',
          url: 'https://user-submitted.local',
          rss_feed_url: null,
          description: 'URLs manually submitted by users for analysis',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        userSource = {
          source_id: sourceResult,
          account_id: accountId,
          name: 'User Submitted'
        };
        console.log(`✅ Created User Submitted source with ID: ${sourceResult}`);
      } else {
        console.log(`✅ Found existing User Submitted source with ID: ${userSource.source_id}`);
      }
    } catch (sourceError) {
      console.error('❌ Error with User Submitted source setup:', sourceError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to setup User Submitted source'
      });
    }

    const processedUrls = [];
    const duplicateUrls = [];
    const invalidUrls = [];
    const jobResults = [];

    for (const url of urls) {
      try {
        // Normalize URL
        let normalizedUrl = url.trim();
        if (!normalizedUrl.match(/^https?:\/\//)) {
          normalizedUrl = `https://${normalizedUrl}`;
        }

        // Validate URL format
        try {
          const urlObj = new URL(normalizedUrl);
          if (!urlObj.hostname || !urlObj.hostname.includes('.')) {
            invalidUrls.push(url);
            continue;
          }
        } catch (urlParseError) {
          invalidUrls.push(url);
          continue;
        }

        // Check for existing article
        try {
          const existingArticle = await db.findOne(
            'ssnews_scraped_articles',
            'url = ? AND account_id = ?',
            [normalizedUrl, accountId]
          );

          if (existingArticle) {
            duplicateUrls.push(url);
            continue;
          }
        } catch (duplicateCheckError) {
          // Continue anyway
        }

        // Create article record
        try {
          const articleData = {
            account_id: accountId,
            source_id: userSource.source_id,
            title: 'Processing submitted URL...',
            url: normalizedUrl,
            publication_date: new Date(),
            full_text: '',
            status: 'scraped'
          };

          const articleResult = await db.insert('ssnews_scraped_articles', articleData);
          
          // Try to create job (but don't fail if this fails)
          try {
            const jobId = await jobManager.createJob(
              'url_analysis',
              {
                articleId: articleResult,
                url: normalizedUrl,
                sourceId: userSource.source_id
              },
              2, // high priority for user-submitted URLs
              'user',
              accountId
            );

            jobResults.push({
              jobId,
              url: normalizedUrl,
              articleId: articleResult,
              status: 'queued'
            });
          } catch (jobError) {
            console.error(`❌ Error creating job for ${url}:`, jobError.message);
            // Continue anyway - the article is saved
          }

          processedUrls.push(normalizedUrl);

        } catch (insertError) {
          console.error(`❌ Error inserting article for ${url}:`, insertError.message);
          invalidUrls.push(url);
        }

      } catch (urlError) {
        console.error(`❌ Error processing URL ${url}:`, urlError.message);
        invalidUrls.push(url);
      }
    }

    const response = {
      success: true,
      message: `Successfully submitted ${processedUrls.length} URLs for analysis`,
      data: {
        submittedUrls: processedUrls.length,
        duplicatesSkipped: duplicateUrls.length,
        invalidUrls: invalidUrls.length,
        queuedJobs: jobResults,
        estimatedProcessingTime: '2-5 minutes'
      }
    };

    // Include details about issues if any
    if (duplicateUrls.length > 0 || invalidUrls.length > 0) {
      response.data.details = {
        duplicateUrls,
        invalidUrls
      };
    }

    console.log(`✅ URL submission processed: ${processedUrls.length} queued, ${duplicateUrls.length} duplicates, ${invalidUrls.length} invalid`);

    res.json(response);

  } catch (error) {
    console.error('❌ URL submission failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process URL submission'
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
} else {
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Specific route for user guide
  app.get('/user-guide.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-guide.html'));
  });
  
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Project Eden API Server',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      systemReady: isSystemReady,
      frontend: `http://localhost:${PORTS.FRONTEND}`,
      api: `http://localhost:${PORT}/api`,
      endpoints: {
        health: '/api/health',
        newsAggregation: '/api/eden/news/*',
        contentGeneration: '/api/eden/content/*',
        images: '/api/eden/images/*',
        stats: '/api/eden/stats/*',
        automation: '/api/eden/automate/*'
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Initialize system and start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Project Eden server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 System Status: ${isSystemReady ? 'Ready' : 'Initializing...'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 Frontend: http://localhost:${PORTS.FRONTEND}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`📋 API Documentation: http://localhost:${PORT}/`);
  }
});

// Initialize system in background after server starts
initializeSystem().catch(error => {
  console.error('❌ System initialization failed:', error.message);
  // Don't exit the process, just log the error
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

// Database optimization endpoint - Create indexes for better performance
app.post('/api/debug/optimize-database', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    console.log('🔧 Optimizing database indexes for performance...');
    
    const results = [];
    
    // Helper function to check if index exists
    const indexExists = async (table, indexName) => {
      try {
        const result = await db.query(
          'SELECT COUNT(*) as count FROM information_schema.statistics WHERE table_name = ? AND index_name = ? AND table_schema = DATABASE()',
          [table, indexName]
        );
        return result[0].count > 0;
      } catch (error) {
        return false;
      }
    };

    const optimizations = [
      // Scraped articles optimizations
      {
        name: 'idx_scraped_articles_account_scraped',
        table: 'ssnews_scraped_articles',
        sql: 'CREATE INDEX idx_scraped_articles_account_scraped ON ssnews_scraped_articles(account_id, scraped_at DESC, article_id DESC)',
        description: 'Optimize article listing by account and date'
      },
      {
        name: 'idx_scraped_articles_account_status',
        table: 'ssnews_scraped_articles', 
        sql: 'CREATE INDEX idx_scraped_articles_account_status ON ssnews_scraped_articles(account_id, status)',
        description: 'Optimize article filtering by status'
      },
      {
        name: 'idx_scraped_articles_url_account',
        table: 'ssnews_scraped_articles',
        sql: 'CREATE INDEX idx_scraped_articles_url_account ON ssnews_scraped_articles(url, account_id)',
        description: 'Optimize duplicate URL checking'
      },
      
      // Generated articles optimizations
      {
        name: 'idx_generated_articles_account_status',
        table: 'ssnews_generated_articles',
        sql: 'CREATE INDEX idx_generated_articles_account_status ON ssnews_generated_articles(account_id, status, created_at DESC)',
        description: 'Optimize content review queries'
      },
      {
        name: 'idx_generated_articles_account_created',
        table: 'ssnews_generated_articles',
        sql: 'CREATE INDEX idx_generated_articles_account_created ON ssnews_generated_articles(account_id, created_at DESC)',
        description: 'Optimize recent content queries'
      },
      
      // News sources optimizations
      {
        name: 'idx_news_sources_account_active',
        table: 'ssnews_news_sources',
        sql: 'CREATE INDEX idx_news_sources_account_active ON ssnews_news_sources(account_id, is_active)',
        description: 'Optimize active sources listing'
      },
      
      // Jobs optimizations
      {
        name: 'idx_jobs_account_status',
        table: 'ssnews_jobs',
        sql: 'CREATE INDEX idx_jobs_account_status ON ssnews_jobs(account_id, status, created_at DESC)',
        description: 'Optimize job queue queries'
      },
      {
        name: 'idx_jobs_account_created',
        table: 'ssnews_jobs',
        sql: 'CREATE INDEX idx_jobs_account_created ON ssnews_jobs(account_id, created_at DESC)',
        description: 'Optimize recent jobs queries'
      },
      
      // Bookmarks optimizations
      {
        name: 'idx_bookmarks_user_article',
        table: 'ssnews_user_bookmarks',
        sql: 'CREATE INDEX idx_bookmarks_user_article ON ssnews_user_bookmarks(user_id, article_id)',
        description: 'Optimize bookmark lookups'
      },
      
      // System logs optimizations (already added in previous migration)
      {
        name: 'idx_system_logs_account_timestamp',
        table: 'ssnews_system_logs',
        sql: 'CREATE INDEX idx_system_logs_account_timestamp ON ssnews_system_logs(account_id, timestamp DESC)',
        description: 'Optimize log queries by account'
      }
    ];

    for (const optimization of optimizations) {
      try {
        const exists = await indexExists(optimization.table, optimization.name);
        
        if (!exists) {
          await db.query(optimization.sql);
          results.push({ 
            index: optimization.name, 
            status: 'created', 
            description: optimization.description 
          });
          console.log(`✅ Created index: ${optimization.name}`);
        } else {
          results.push({ 
            index: optimization.name, 
            status: 'exists', 
            description: optimization.description 
          });
        }
      } catch (error) {
        results.push({ 
          index: optimization.name, 
          status: 'error', 
          error: error.message,
          description: optimization.description 
        });
        console.log(`❌ Failed to create index ${optimization.name}:`, error.message);
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'exists').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`🔧 Database optimization complete: ${created} created, ${existing} existing, ${errors} errors`);

    res.json({
      success: true,
      message: `Database optimization complete: ${created} indexes created, ${existing} existing, ${errors} errors`,
      results,
      summary: {
        created,
        existing,
        errors,
        total: optimizations.length
      }
    });
  } catch (error) {
    console.error('❌ Database optimization failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Simple in-memory cache for frequently accessed data
const dataCache = new Map();
const CACHE_TTL = {
  STATS: 30 * 1000,        // 30 seconds
  SOURCES: 60 * 1000,      // 1 minute  
  JOB_STATS: 10 * 1000,    // 10 seconds
  CONTENT_COUNTS: 60 * 1000 // 1 minute
};

function getCacheKey(type, accountId, extra = '') {
  return `${type}:${accountId}:${extra}`;
}

function getFromCache(key) {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  dataCache.delete(key);
  return null;
}

function setCache(key, data, ttl) {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

// Clean cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of dataCache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      dataCache.delete(key);
    }
  }
}, 60000); // Clean every minute