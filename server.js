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
import accountSettingsRoutes from './src/routes/accountSettings.js';
import { accountContext, optionalAccountContext } from './src/middleware/accountContext.js';

// Load environment variables
dotenv.config();

// Add comprehensive error handling for development
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit in development, just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development, just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle SIGTERM and SIGINT more gracefully
process.on('SIGTERM', async () => {
  console.log('📡 SIGTERM received, shutting down gracefully');
  try {
    if (db && db.close) {
      await db.close();
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 SIGINT received, shutting down gracefully');
  try {
    if (db && db.close) {
      await db.close();
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
  process.exit(0);
});

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

// Add this migration function near other database setup functions, before the initializeSystem function

async function migratePromptTemplatesCategoryColumn() {
  try {
    console.log('🔄 Checking prompt templates category column...');
    
    // Check if migration is needed
    const columnInfo = await db.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'ssnews_prompt_templates' 
        AND COLUMN_NAME = 'category'
    `);
    
    if (columnInfo.length > 0 && columnInfo[0].COLUMN_TYPE.includes('enum')) {
      console.log('🔧 Migrating category column from ENUM to VARCHAR...');
      
      // Change the column type to VARCHAR to allow custom categories
      await db.query(`
        ALTER TABLE ssnews_prompt_templates 
        MODIFY COLUMN category VARCHAR(100) NOT NULL
      `);
      
      console.log('✅ Successfully migrated category column to VARCHAR(100)');
    } else {
      console.log('✅ Category column already migrated or doesn\'t exist');
    }
  } catch (error) {
    console.error('❌ Error migrating category column:', error.message);
    // Don't throw - this shouldn't prevent system startup
  }
}

async function initializeSystem() {
  try {
    console.log('🚀 Initializing Project Eden system...');
    
    // Initialize database with timeout and retry logic
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
    const initPromise = db.initialize();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database initialization timeout')), 30000)
    );
    
    await Promise.race([initPromise, timeoutPromise]);
        console.log('✅ Database connected successfully');
        break; // Success, exit retry loop
        
      } catch (dbError) {
        retries++;
        console.error(`❌ Database initialization attempt ${retries} failed:`, dbError.message);
        
        if (retries >= maxRetries) {
          throw new Error(`Database initialization failed after ${maxRetries} attempts: ${dbError.message}`);
        }
        
        console.log(`⏳ Retrying database connection in 5 seconds... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Run database migrations
    try {
      await migratePromptTemplatesCategoryColumn();
    } catch (error) {
      console.warn('⚠️ Database migration failed:', error.message);
    }

    // Initialize additional database tables with error handling
    try {
      await ensureImageGenerationTable();
      console.log('✅ Image generation tracking table ready');
    } catch (error) {
      console.warn('⚠️ Image generation table setup failed:', error.message);
    }
    
    try {
      await ensureAccountImageSettingsTable();
      console.log('✅ Account image settings table ready');
    } catch (error) {
      console.warn('⚠️ Account image settings table setup failed:', error.message);
    }
    
    // Initialize prompt manager after database is ready
    try {
    promptManager = new PromptManager();
      console.log('✅ Prompt manager initialized');
    } catch (error) {
      console.warn('⚠️ Prompt manager initialization failed:', error.message);
    }
    
    // Initialize AI service prompt manager
    try {
    aiService.initializePromptManager();
      console.log('✅ AI Service prompt manager initialized');
    } catch (error) {
      console.warn('⚠️ AI service prompt manager initialization failed:', error.message);
    }
    
    // Start job worker
    try {
    console.log('🔄 Starting background job worker...');
    jobWorker.start();
      console.log('🚀 Job worker started');
      console.log('🧹 Checking for stale jobs from previous sessions...');
    } catch (error) {
      console.warn('⚠️ Job worker failed to start:', error.message);
    }
    
    isSystemReady = true;
    initializationError = null;
    console.log('✅ Project Eden system ready!');
    
  } catch (error) {
    console.error('❌ System initialization failed:', error.message);
    console.error('Full error:', error);
    isSystemReady = false;
    initializationError = error.message;
    
    // Don't exit the process in development - allow the server to continue
    // This allows the health check endpoint to still work
    if (process.env.NODE_ENV === 'production') {
      console.error('💀 Exiting due to initialization failure in production');
      process.exit(1);
    } else {
      console.log('🔄 Continuing in development mode with partial functionality');
      console.log('🩺 Health check endpoint will remain available at /api/health');
    }
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
      ai: {
        openai: !!process.env.OPENAI_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY
      },
      images: !!process.env.SIRV_CLIENT_ID && !!process.env.IDEOGRAM_API_KEY,
      email: !!process.env.MAILGUN_API_KEY
    }
  });
});

// Mount organization routes
app.use('/api', organizationRoutes);

// Mount prompt routes
app.use('/api', promptRoutes);

// Mount user management routes
app.use('/api/user-management', userManagementRoutes);

// Mount account settings routes
app.use('/api/account-settings', accountSettingsRoutes);

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
      LIMIT ${limit} OFFSET ${offset}
    `, [accountId]);
    
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

// Add new news source
app.post('/api/eden/news/sources', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { name, url, rss_feed_url, description } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Source name is required' });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Source URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate RSS URL format if provided
    if (rss_feed_url && rss_feed_url.trim()) {
      try {
        new URL(rss_feed_url);
      } catch (rssUrlError) {
        return res.status(400).json({ error: 'Invalid RSS feed URL format' });
      }
    }

    // Create new source
    const sourceData = {
      account_id: accountId,
      name: name.trim(),
      url: url.trim(),
      rss_feed_url: rss_feed_url && rss_feed_url.trim() ? rss_feed_url.trim() : null,
      description: description && description.trim() ? description.trim() : null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.insert('ssnews_news_sources', sourceData);

    console.log(`✅ New source created: ${name} (ID: ${result.insertId}) for account ${accountId}`);

    // Return the created source with ID
    const createdSource = {
      source_id: result.insertId,
      account_id: accountId,
      name: sourceData.name,
      url: sourceData.url,
      rss_feed_url: sourceData.rss_feed_url,
      description: sourceData.description,
      is_active: sourceData.is_active,
      created_at: sourceData.created_at,
      updated_at: sourceData.updated_at,
      articles_last_24h: 0,
      total_articles: 0,
      source_type: rss_feed_url ? 'RSS' : 'Web Scraping',
      last_checked: null
    };

    res.status(201).json({
      success: true,
      message: `Source "${name}" added successfully`,
      source: createdSource,
      accountId
    });
  } catch (error) {
    console.error('❌ Error adding new source:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Content generation endpoints
app.post('/api/eden/content/generate', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const limit = parseInt(req.body.limit) || 5;
    const specificStoryId = req.body.specificStoryId;
    const accountId = req.accountContext.accountId;
    
    console.log(`🎨 Creating content generation job (limit: ${limit}${specificStoryId ? `, specific story: ${specificStoryId}` : ''}) for account ${accountId}`);
    
    // Create job instead of processing synchronously
    const jobPayload = { limit };
    if (specificStoryId) {
      jobPayload.specificStoryId = specificStoryId;
    }
    
    const jobId = await jobManager.createJob(
      'content_generation',
      jobPayload,
      1, // priority
      'user',
      accountId // pass account ID
    );
    
    res.json({
      success: true,
      message: `Content generation job created (ID: ${jobId})`,
      jobId,
      status: 'queued'
    });
  } catch (error) {
    console.error('❌ Content generation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/eden/content/generate-evergreen', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { category, count = 1 } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    console.log(`🌲 Evergreen content generation triggered (category: ${category}) for account ${accountId}`);
    const generatedContent = await contentGenerator.generateEvergreenContent(category, count, accountId);
    
    res.json({
      success: true,
      message: `Generated ${generatedContent.length} evergreen content pieces for account ${accountId}`,
      content: generatedContent,
      accountId
    });
  } catch (error) {
    console.error('❌ Evergreen content generation failed:', error.message);
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
      logToDatabase('info', message, metadata, jobId, accountId);
    },
    warn: (message, metadata = null) => {
      originalConsoleWarn(`[Job ${jobId}] ${message}`);
      logToDatabase('warn', message, metadata, jobId, accountId);
    },
    error: (message, metadata = null) => {
      originalConsoleError(`[Job ${jobId}] ${message}`);
      logToDatabase('error', message, metadata, jobId, accountId);
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

  // Send updates every 5 seconds for real-time feedback
  const updateInterval = setInterval(async () => {
    try {
      const accountId = req.accountContext.accountId;
      const stats = await jobManager.getQueueStats(accountId);
      const recentJobs = await jobManager.getRecentJobs(20, accountId); // Get more jobs for better tracking
      const workerStatus = jobWorker.getStatus();
      
      res.write(`data: ${JSON.stringify({
        type: 'queue_update',
        stats,
        recentJobs,
        worker: workerStatus,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      clearInterval(updateInterval);
    }
  }, 5000); // Faster updates for better real-time experience

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

// ===== CONTENT GENERATION API ENDPOINTS =====

// Content types endpoint - Dynamic discovery from prompt templates (EXTENSIBLE ARCHITECTURE)
app.get('/api/eden/content/types', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;

    // Get prompt templates from database - NO HARDCODED MAPPINGS!
    // Query both account-specific and global templates for maximum flexibility
    const templates = await db.query(`
      SELECT 
        name,
        category,
        media_type,
        parsing_method,
        ui_config,
        execution_order,
        is_active
      FROM ssnews_prompt_templates 
      WHERE (account_id = ? OR account_id = 'global') AND is_active = 1
      ORDER BY execution_order ASC, category ASC
    `, [accountId]);
    
    console.log(`🔍 Found ${templates.length} active templates for account ${accountId}`);

    if (templates.length === 0) {
      console.log('⚠️ No templates found, falling back to generated content discovery');
      
      // Fallback: discover content types from actual generated content
      const generatedCategories = await db.query(`
        SELECT DISTINCT prompt_category as category, COUNT(*) as count
        FROM ssnews_generated_content 
        WHERE account_id = ?
        GROUP BY prompt_category
        ORDER BY prompt_category
      `, [accountId]);
      
      // Create minimal templates for discovered categories
      const fallbackTypes = generatedCategories.map((cat, index) => ({
        id: cat.category,
        name: cat.category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon: getFallbackIcon(cat.category),
        category: cat.category,
        description: `Generated ${cat.category.replace('_', ' ')} content`,
        template: `${cat.category} Generator`,
        order: index + 1,
        displayType: cat.category === 'image_generation' ? 'images' : 'text',
        emptyMessage: `No ${cat.category.replace('_', ' ')} content generated`,
        countInTab: true,
        mediaType: getFallbackMediaType(cat.category),
        parsingMethod: getFallbackParsingMethod(cat.category)
      }));
      
      console.log(`📋 Discovered ${fallbackTypes.length} content types from generated content: ${fallbackTypes.map(t => t.category).join(', ')}`);
      
      return res.json({
        success: true,
        contentTypes: fallbackTypes,
        accountId,
        source: 'generated_content_discovery'
      });
    }

    // Transform templates using EXTENSIBLE ui_config - NO HARDCODING!
    const contentTypes = templates.map(template => {
      let uiConfig = {};
      
      // Parse ui_config JSON
      if (template.ui_config) {
        try {
          uiConfig = JSON.parse(template.ui_config);
        } catch (e) {
          console.warn(`⚠️ Invalid ui_config for template ${template.name}: ${e.message}`);
        }
      }
      
      return {
        id: template.category,
        name: uiConfig.displayName || template.name,
        icon: uiConfig.icon || 'FileText',
        category: template.category,
        description: template.description || `Generated ${template.category.replace('_', ' ')} content`,
        template: template.name,
        order: template.execution_order || 999,
        displayType: template.media_type === 'image' ? 'images' : 'text',
        emptyMessage: `No ${(uiConfig.displayName || template.category).toLowerCase()} generated`,
        countInTab: true,
        mediaType: template.media_type,
        parsingMethod: template.parsing_method,
        color: uiConfig.color || '#6B7280'
      };
    });

    // Sort by execution order
    contentTypes.sort((a, b) => a.order - b.order);

    // Add the main article type (always present) 
    const articleType = {
      id: 'article',
      name: 'Main Content',
      icon: 'FileText',
      category: 'blog',
      description: 'Main blog article content',
      template: 'Blog Post Generator',
      order: 0,
      displayType: 'article',
      emptyMessage: 'No article content',
      countInTab: false
    };

    const allContentTypes = [articleType, ...contentTypes];

    console.log(`✅ Discovered ${contentTypes.length} extensible content types from templates`);
    console.log(`📋 Content types: ${allContentTypes.map(t => t.name).join(', ')}`);

    res.json({
      success: true,
      contentTypes: allContentTypes,
      accountId,
      source: 'prompt_templates'
    });
  } catch (error) {
    console.error('❌ Error fetching content types:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for fallback content type discovery
function getFallbackIcon(category) {
  const iconMap = {
    'analysis': 'BarChart3',
    'blog_post': 'FileText', 
    'social_media': 'MessageSquare',
    'video_script': 'Film',
    'image_generation': 'Image',
    'prayer': 'Heart',
    'email': 'Mail',
    'letter': 'FileText'
  };
  return iconMap[category] || 'FileText';
}

function getFallbackMediaType(category) {
  if (category === 'video_script') return 'video';
  if (category === 'image_generation') return 'image';
  return 'text';
}

function getFallbackParsingMethod(category) {
  const methodMap = {
    'social_media': 'social_media',
    'video_script': 'video_script', 
    'prayer': 'prayer_points'
  };
  return methodMap[category] || 'generic';
}

// Generation stats endpoint
app.get('/api/eden/stats/generation', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const accountId = req.accountContext.accountId;
    const cacheKey = getCacheKey('GENERATION_STATS', accountId);
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ success: true, stats: cached });
    }

    // Get content generation stats for this account
    const stats = await db.query(`
      SELECT 
        COUNT(CASE WHEN content_type = 'article' THEN 1 END) as totalBlogs,
        COUNT(CASE WHEN content_type = 'social' THEN 1 END) as totalSocialPosts,
        COUNT(CASE WHEN content_type = 'video' THEN 1 END) as totalVideoScripts,
        COUNT(*) as totalGenerated
      FROM ssnews_generated_articles 
      WHERE account_id = ?
    `, [accountId]);

    const generationStats = stats[0] || {
      totalBlogs: 0,
      totalSocialPosts: 0,
      totalVideoScripts: 0,
      totalGenerated: 0
    };

    // Cache the results
    setCache(cacheKey, generationStats, CACHE_TTL.STATS);

    res.json({
      success: true,
      stats: generationStats
    });
  } catch (error) {
    console.error('❌ Error getting generation stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Content review endpoint with enhanced count support
app.get('/api/eden/content/review', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const statusParam = req.query.status || 'draft';
    const limit = parseInt(req.query.limit) || 20;
    const accountId = req.accountContext.accountId;
    
    // Handle multiple statuses separated by commas
    const statuses = statusParam.split(',').map(s => s.trim());
    
    // Check for explicit count-only request (not just limit=1)
    const justCount = req.query.countOnly === 'true' && limit === 1;
    
    if (justCount) {
      // Fast count query for tab display
      const cacheKey = getCacheKey('CONTENT_COUNT', accountId, statusParam);
      const cached = getFromCache(cacheKey);
      if (cached) {
        return res.json({ success: true, content: [], count: cached.count, totalCount: cached.count });
      }

      let totalCount = 0;
      for (const status of statuses) {
        const countResult = await db.query(`
          SELECT COUNT(*) as count 
          FROM ssnews_generated_articles 
          WHERE account_id = ? AND status = ?
        `, [accountId, status]);
        totalCount += countResult[0]?.count || 0;
      }

      // Cache the count
      setCache(cacheKey, { count: totalCount }, CACHE_TTL.CONTENT_COUNTS);

      return res.json({
        success: true,
        content: [],
        count: totalCount,
        totalCount: totalCount
      });
    }

    // Full content fetch for actual display
    let content = [];
    let totalCount = 0;
    
    for (const status of statuses) {
      // Use the database service method that properly fetches associated content
      const statusContent = await db.getContentForReview(status, limit, accountId);
      content = content.concat(statusContent);
      
      // Get total count for this status
      const countResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM ssnews_generated_articles 
        WHERE account_id = ? AND status = ?
      `, [accountId, status]);
      totalCount += countResult[0]?.count || 0;
    }
    
    // Remove duplicates and limit results
    const uniqueContent = content.filter((item, index, self) => 
      index === self.findIndex(t => t.gen_article_id === item.gen_article_id)
    ).slice(0, limit);
    
    res.json({
      success: true,
      content: uniqueContent,
      count: uniqueContent.length,
      totalCount: totalCount
    });
  } catch (error) {
    console.error('❌ Error fetching content for review:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all dynamic content for a story - for dynamic detail modal
app.get('/api/eden/content/story/:storyId/all', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { storyId } = req.params;
    const accountId = req.accountContext.accountId;
    
    console.log(`🎯 Fetching all dynamic content for story ${storyId} in account ${accountId}`);

    // First try to get content from the generic content system
    let dynamicContent = [];
    try {
      dynamicContent = await db.query(`
      SELECT 
        content_id,
        prompt_category,
        content_data,
        metadata,
        status,
        created_at,
        updated_at
      FROM ssnews_generated_content 
      WHERE account_id = ? AND based_on_gen_article_id = ?
      ORDER BY prompt_category ASC, created_at DESC
    `, [accountId, storyId]);
    } catch (error) {
      console.log('📋 Generic content table not available, using legacy format');
    }

    // Get the main content to extract legacy content structure
    const mainContent = await db.query(`
      SELECT 
        gen_article_id,
        title,
        body_draft,
        status,
        created_at,
        updated_at
      FROM ssnews_generated_articles 
      WHERE account_id = ? AND gen_article_id = ?
    `, [accountId, storyId]);

    if (mainContent.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Get legacy content from existing structure
    let allContent = [...dynamicContent];

    try {
      // Get social posts
      const socialPosts = await db.query(`
        SELECT 
          gen_social_id as content_id,
          'social_media' as prompt_category,
        JSON_OBJECT('platform', platform, 'text', text_draft) as content_data,
        JSON_OBJECT('platform', platform) as metadata,
        status,
        created_at,
        updated_at
      FROM ssnews_generated_social_posts 
      WHERE account_id = ? AND based_on_gen_article_id = ?
        ORDER BY created_at ASC
      `, [accountId, storyId]);
      
      allContent = [...allContent, ...socialPosts];
    } catch (error) {
      console.log('📋 Social posts table query failed, skipping');
    }
      
    try {
      // Get video scripts
      const videoScripts = await db.query(`
      SELECT 
          gen_video_script_id as content_id,
          'video_script' as prompt_category,
        JSON_OBJECT('title', title, 'script', script_draft, 'duration_target_seconds', duration_target_seconds) as content_data,
          JSON_OBJECT('duration', duration_target_seconds, 'title', title) as metadata,
        status,
        created_at,
        updated_at
      FROM ssnews_generated_video_scripts 
      WHERE account_id = ? AND based_on_gen_article_id = ?
        ORDER BY duration_target_seconds ASC
      `, [accountId, storyId]);
      
      allContent = [...allContent, ...videoScripts];
    } catch (error) {
      console.log('📋 Video scripts table query failed, skipping');
    }

    try {
      // Get prayer points - check if table exists first
      const tableExists = await db.query(`
        SHOW TABLES LIKE 'ssnews_generated_prayer_points'
      `);
      
      if (tableExists.length > 0) {
        const prayerPoints = await db.query(`
      SELECT 
        prayer_point_id as content_id,
            'prayer' as prompt_category,
            JSON_OBJECT('order_number', order_number, 'prayer_text', prayer_text, 'theme', theme) as content_data,
            JSON_OBJECT('order', order_number, 'theme', theme) as metadata,
        status,
        created_at,
        updated_at
      FROM ssnews_generated_prayer_points 
      WHERE account_id = ? AND based_on_gen_article_id = ?
          ORDER BY order_number ASC
        `, [accountId, storyId]);
        
        allContent = [...allContent, ...prayerPoints];
      }
    } catch (error) {
      console.log('📋 Prayer points table query failed, extracting from legacy format');
      
      // Fallback: try to get prayer points from the main content API response format
      // This is a temporary workaround for the current data structure
      try {
        const contentWithDetails = await db.query(`
          SELECT 
            ga.gen_article_id,
            ga.title,
            ga.body_draft,
            ga.status,
            ga.created_at,
            ga.updated_at,
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', CONCAT(gen_social_id, '_', platform),
                  'order', gen_social_id,
                  'content', text_draft,
                  'theme', platform
                )
              )
              FROM ssnews_generated_social_posts sp 
              WHERE sp.account_id = ga.account_id 
              AND sp.based_on_gen_article_id = ga.gen_article_id
            ) as social_posts_json,
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', gen_video_script_id,
                  'order', gen_video_script_id,
                  'content', script_draft,
                  'theme', title
                )
              )
              FROM ssnews_generated_video_scripts vs 
              WHERE vs.account_id = ga.account_id 
              AND vs.based_on_gen_article_id = ga.gen_article_id
            ) as video_scripts_json
          FROM ssnews_generated_articles ga
          WHERE ga.account_id = ? AND ga.gen_article_id = ?
        `, [accountId, storyId]);

        if (contentWithDetails.length > 0) {
          const content = contentWithDetails[0];
          
          // Add social posts as prayer points format for testing
          if (content.social_posts_json) {
            const socialData = JSON.parse(content.social_posts_json || '[]');
            socialData.forEach((item, index) => {
              allContent.push({
                content_id: `prayer_${item.id}`,
                prompt_category: 'prayer',
                content_data: {
                  order_number: index + 1,
                  prayer_text: `Prayer based on social post: ${item.content}`,
                  theme: 'social'
                },
                metadata: { order: index + 1, theme: 'social' },
                status: 'draft',
                created_at: content.created_at,
                updated_at: content.updated_at
              });
            });
          }
        }
      } catch (fallbackError) {
        console.log('📋 Fallback prayer points extraction failed:', fallbackError.message);
      }
    }

    // Parse JSON fields that might be strings
    const parsedContent = allContent.map(item => ({
      ...item,
      content_data: typeof item.content_data === 'string' 
        ? JSON.parse(item.content_data) 
        : item.content_data,
      metadata: typeof item.metadata === 'string'
        ? JSON.parse(item.metadata)
        : item.metadata
    }));

    // Get all configured prompt templates to ensure we have tabs for all categories
    let allCategories = [];
    try {
      const templates = await db.query(`
        SELECT DISTINCT category 
        FROM ssnews_prompt_templates 
        WHERE account_id = ? AND is_active = 1
      `, [accountId]);
      
      allCategories = templates.map(t => t.category);
      console.log(`🏷️ All configured categories: ${allCategories.join(', ')}`);
    } catch (error) {
      console.log('📋 Could not fetch template categories, using content-based categories');
      allCategories = [...new Set(parsedContent.map(c => c.prompt_category))];
    }

    // Ensure we have at least the categories that have actual content
    const contentCategories = [...new Set(parsedContent.map(c => c.prompt_category))];
    
    // Normalize category names and remove duplicates
    const categoryMapping = {
      'prayer_points': 'prayer',
      'video_scripts': 'video_script'
    };
    
    const normalizedContentCategories = contentCategories.map(cat => categoryMapping[cat] || cat);
    const finalCategories = [...new Set([...allCategories, ...normalizedContentCategories])];
    
    console.log(`✅ Found ${parsedContent.length} content items across ${contentCategories.length} categories with content`);
    console.log(`📋 Total categories available: ${finalCategories.join(', ')}`);

      res.json({
        success: true,
      content: parsedContent,
      storyId: parseInt(storyId),
      accountId,
      categories: finalCategories,
      totalItems: parsedContent.length
    });

  } catch (error) {
    console.error('❌ Error fetching dynamic content:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update content status endpoint - for approving/rejecting/regenerating content
app.put('/api/eden/content/:contentType/:contentId/status', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { contentType, contentId } = req.params;
    const { status, finalContent } = req.body;
    const accountId = req.accountContext.accountId;
    
    // Map frontend content types to backend content types
    const contentTypeMapping = {
      'blog': 'article',
      'article': 'article',
      'social': 'social',
      'video': 'video'
    };
    
    const mappedContentType = contentTypeMapping[contentType];
    
    if (!mappedContentType) {
      return res.status(400).json({ 
        error: `Invalid content type: ${contentType}. Valid types are: blog, article, social, video` 
      });
    }

    await contentGenerator.updateContentStatus(
      parseInt(contentId), 
      mappedContentType, 
      status, 
      finalContent,
      accountId
    );
    
    console.log(`📝 Updated ${contentType} ${contentId} status to ${status} for account ${accountId}`);
    
    res.json({
      success: true,
      message: `${contentType} ${contentId} status updated to ${status}`
    });
  } catch (error) {
    console.error('❌ Error updating content status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Refresh articles from a single source
app.post('/api/eden/news/sources/:sourceId/refresh', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { sourceId } = req.params;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify source exists and belongs to this account
    const source = await db.findOne(
      'ssnews_news_sources', 
      'source_id = ? AND account_id = ?', 
      [sourceId, accountId]
    );

    if (!source) {
      return res.status(404).json({ error: 'Source not found in this account' });
    }

    console.log(`🔄 Creating source refresh job for "${source.name}" (ID: ${sourceId}) for account ${accountId}`);
    
    // Create dedicated source refresh job using existing news_aggregation type
    const jobId = await jobManager.createJob(
      'news_aggregation',
      { 
        sourceId: parseInt(sourceId), 
        sourceName: source.name,
        singleSource: true // Flag to indicate this is a single source refresh
      },
      4, // high priority for individual source refresh
      'user',
      accountId
    );

    res.json({
      success: true,
      message: `Refresh job created for source "${source.name}" (ID: ${jobId})`,
      jobId,
      status: 'queued',
      sourceId: parseInt(sourceId),
      sourceName: source.name,
      accountId
    });
  } catch (error) {
    console.error('❌ Source refresh job creation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Submit URLs for analysis endpoint
app.post('/api/eden/sources/submit-urls', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { urls } = req.body;
    const { accountId } = req.accountContext;

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

// ===== IMAGE GENERATION API ENDPOINTS (STUBS) =====

// Get images for content
app.get('/api/eden/content/:contentId/images', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { contentId } = req.params;
    const { archived = 'false' } = req.query;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🖼️ Fetching images for content ${contentId}, include archived: ${archived}`);

    // Build the query based on whether to include archived images
    let query = `
      SELECT 
        image_id as id,
        sirv_cdn_url,
        alt_text_suggestion_ai,
        source_api,
        source_image_id_external,
        status,
        generation_metadata,
        created_at
      FROM ssnews_image_assets 
      WHERE associated_content_id = ? 
        AND associated_content_type = 'gen_article'
        AND account_id = ?
    `;
    
    const queryParams = [contentId, accountId];

    // Only include active images unless specifically requesting archived ones
    if (archived === 'false') {
      query += ` AND (status IS NULL OR status != 'archived')`;
    }
    
    query += ` ORDER BY created_at DESC`;

    const imageRows = await db.query(query, queryParams);

    // Format images for frontend
    const images = imageRows.map(row => {
      let generationMetadata = null;
      try {
        if (row.generation_metadata) {
          generationMetadata = typeof row.generation_metadata === 'string' 
            ? JSON.parse(row.generation_metadata)
            : row.generation_metadata;
        }
      } catch (error) {
        console.warn('Failed to parse generation_metadata for image', row.id, error.message);
      }

      return {
        id: row.id,
        sirvUrl: row.sirv_cdn_url,
        altText: row.alt_text_suggestion_ai || 'Generated Image',
        source: row.source_api || 'unknown',
        query: generationMetadata?.prompt?.substring(0, 50) || 'AI Generated',
        status: row.status || 'active',
        created: row.created_at,
        metadata: generationMetadata,
        // Additional fields for compatibility
        ideogramId: row.source_image_id_external,
        prompt: generationMetadata?.prompt,
        resolution: generationMetadata?.resolution,
        styleType: generationMetadata?.styleType,
        seed: generationMetadata?.seed,
        modelVersion: generationMetadata?.modelVersion
      };
    });

    console.log(`✅ Found ${images.length} images for content ${contentId}`);

    res.json({
      success: true,
      images: images,
      count: images.length,
      contentId: contentId,
      includeArchived: archived === 'true'
    });

  } catch (error) {
    console.error('❌ Error fetching images for content:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch images',
      details: 'Check server logs for more information'
    });
  }
});

// Get Ideogram options based on model version
app.get('/api/eden/images/ideogram/options', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { modelVersion = 'v2' } = req.query;
    
    console.log(`🎨 Getting Ideogram options for model version: ${modelVersion}`);

    // Get real options from imageService
    const styles = imageService.getIdeogramStyles(modelVersion);
    const aspectRatios = imageService.getAspectRatios(modelVersion);
    const resolutions = imageService.getResolutions();

    const options = {
      styles: styles,
      aspectRatios: aspectRatios,
      resolutions: resolutions,
        renderingSpeeds: [
        { value: 'TURBO', label: 'Turbo (Fastest)' },
          { value: 'DEFAULT', label: 'Default' },
        { value: 'QUALITY', label: 'Quality (Slowest, Best)' }
        ],
        magicPromptOptions: [
          { value: 'AUTO', label: 'Auto' },
          { value: 'ON', label: 'On' },
          { value: 'OFF', label: 'Off' }
        ],
      numImagesOptions: [1, 2, 3, 4, 5, 6, 7, 8],
      modelVersion: modelVersion
    };

    console.log(`✅ Returning ${styles.length} styles, ${aspectRatios.length} aspect ratios for ${modelVersion}`);

    res.json({
      success: true,
      options: options,
      modelVersion: modelVersion
    });
  } catch (error) {
    console.error('❌ Error getting Ideogram options:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to load Ideogram options'
    });
  }
});

// Generate images for content using Ideogram.ai
app.post('/api/eden/images/generate-for-content/:contentId', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { contentId } = req.params;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🎨 Generating image for content ${contentId} using Ideogram.ai...`);

    // Extract generation parameters from request body
    const {
      prompt,
      aspectRatio = '16:9',
      styleType = 'GENERAL',
      renderingSpeed = 'DEFAULT',
      magicPrompt = 'AUTO',
      negativePrompt = '',
      seed,
      resolution,
      numImages = 1,
      modelVersion = 'v2',
      styleCodes,
      useAccountColors = false,
      selectedColorTemplate = null
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Prepare options for imageService
    const imageOptions = {
      prompt: prompt.trim(),
      aspectRatio,
      styleType,
      renderingSpeed,
      magicPrompt,
      numImages: parseInt(numImages),
      modelVersion
    };

    // Add optional parameters
    if (negativePrompt && negativePrompt.trim()) {
      imageOptions.negativePrompt = negativePrompt.trim();
    }
    
    if (seed) {
      imageOptions.seed = parseInt(seed);
    }
    
    if (resolution) {
      imageOptions.resolution = resolution;
    }
    
    if (styleCodes && Array.isArray(styleCodes)) {
      imageOptions.styleCodes = styleCodes;
    }

    // Handle account color templates
    if (useAccountColors && selectedColorTemplate) {
      imageOptions.colorPalette = selectedColorTemplate;
    }

    console.log(`🎯 Generation options:`, imageOptions);

    // Generate image using the imageService
    const generationResult = await imageService.generateIdeogramImage(imageOptions);
    
    if (!generationResult || !generationResult.images || generationResult.images.length === 0) {
      return res.status(500).json({ error: 'Failed to generate image - no images returned' });
    }

    console.log(`✅ Generated ${generationResult.images.length} image(s)`);

    // Process and store the first/primary image
    const primaryImage = generationResult.images[0];
    const processedImage = await imageService.processIdeogramImageForContent(primaryImage, contentId, accountId);

    // Prepare response with generation metadata
    const response = {
      success: true,
      image: processedImage,
      generation: {
        finalPrompt: primaryImage.prompt || prompt,
        parameters: {
          aspectRatio: imageOptions.aspectRatio,
          styleType: imageOptions.styleType,
          renderingSpeed: imageOptions.renderingSpeed,
          magicPrompt: imageOptions.magicPrompt,
          modelVersion: imageOptions.modelVersion,
          numImages: imageOptions.numImages
        },
        metadata: {
          resolution: primaryImage.resolution,
          seed: primaryImage.seed,
          isImageSafe: primaryImage.isImageSafe,
          generationTimeSeconds: 2.5, // Estimate
          estimatedCostUSD: 0.08 * imageOptions.numImages // Estimate
        }
      }
    };

    // If multiple images were generated, process them sequentially to avoid conflicts
    if (generationResult.images.length > 1) {
      const allProcessedImages = [];
      for (let i = 0; i < generationResult.images.length; i++) {
        const img = generationResult.images[i];
        // Add a small delay between processing to ensure unique timestamps
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        const processedImg = await imageService.processIdeogramImageForContent(img, contentId, accountId);
        allProcessedImages.push(processedImg);
      }
      response.images = allProcessedImages;
    }

    console.log(`🎨 Image generation complete for content ${contentId}`);
    res.json(response);

  } catch (error) {
    console.error('❌ Error generating image:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate image',
      details: 'Check server logs for more information'
    });
  }
});

// Update image status (archive, unarchive, etc.)
app.put('/api/eden/images/:imageId/status', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { imageId } = req.params;
    const { status } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!status || !['active', 'archived', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required: active, archived, approved, rejected' });
    }

    console.log(`🔄 Updating image ${imageId} status to: ${status}`);

    // Update the image status in database
    const updateResult = await db.query(`
      UPDATE ssnews_image_assets 
      SET status = ?, updated_at = NOW() 
      WHERE id = ? AND account_id = ?
    `, [status, imageId, accountId]);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Image not found or access denied' });
    }

    // Get the updated image data
    const imageData = await db.query(`
      SELECT * FROM ssnews_image_assets 
      WHERE id = ? AND account_id = ?
    `, [imageId, accountId]);

    if (imageData.length === 0) {
      return res.status(404).json({ error: 'Image not found after update' });
    }

    console.log(`✅ Updated image ${imageId} status to ${status}`);

    res.json({
      success: true,
      image: imageData[0],
      message: `Image status updated to ${status}`
    });

  } catch (error) {
    console.error('❌ Error updating image status:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update image status',
      details: 'Check server logs for more information'
    });
  }
});

// ===== ACCOUNT IMAGE SETTINGS API ENDPOINTS =====

// Get account image generation settings
app.get('/api/eden/settings/image-generation', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`⚙️ Fetching image generation settings for account ${accountId}`);

    // Try to get settings with preferred_style_codes, but handle if column doesn't exist
    let settingsData;
    try {
      settingsData = await db.query(`
        SELECT 
          prompt_prefix,
          prompt_suffix,
          brand_colors,
          preferred_style_codes,
          default_settings,
          created_at,
          updated_at
        FROM ssnews_account_image_settings 
        WHERE account_id = ?
      `, [accountId]);
    } catch (error) {
      if (error.message.includes('preferred_style_codes')) {
        // Column doesn't exist yet, query without it
        console.log('⚠️ preferred_style_codes column not found, querying without it');
        settingsData = await db.query(`
          SELECT 
            prompt_prefix,
            prompt_suffix,
            brand_colors,
            default_settings,
            created_at,
            updated_at
          FROM ssnews_account_image_settings 
          WHERE account_id = ?
        `, [accountId]);
      } else {
        throw error;
      }
    }

    let settings = {
      promptPrefix: '',
      promptSuffix: '',
      brandColors: [],
      preferredStyleCodes: [],
      defaults: {
        modelVersion: 'v2', // Add model version to defaults
        aspectRatio: '16:9',
        resolution: '', // Add resolution to defaults
        styleType: 'GENERAL',
        renderingSpeed: 'DEFAULT',
        magicPrompt: 'AUTO',
        negativePrompt: '',
        numImages: 1
      }
    };

    if (settingsData.length > 0) {
      const dbSettings = settingsData[0];
      
      // Parse JSON fields with error handling
      let parsedBrandColors = [];
      let parsedPreferredStyleCodes = [];
      let parsedDefaultSettings = settings.defaults;
      
      if (dbSettings.brand_colors) {
        try {
          // Handle case where data might already be parsed as objects
          if (typeof dbSettings.brand_colors === 'string') {
            parsedBrandColors = JSON.parse(dbSettings.brand_colors);
          } else if (Array.isArray(dbSettings.brand_colors)) {
            // Data is already parsed as objects - use directly
            parsedBrandColors = dbSettings.brand_colors;
          } else {
            console.warn('⚠️ Unexpected brand_colors format:', typeof dbSettings.brand_colors);
            parsedBrandColors = [];
          }
        } catch (error) {
          console.warn('⚠️ Invalid JSON in brand_colors field:', error.message);
          console.warn('⚠️ Raw brand_colors data:', dbSettings.brand_colors);
          console.warn('⚠️ Data type:', typeof dbSettings.brand_colors);
          parsedBrandColors = [];
        }
      }
      
      if (dbSettings.preferred_style_codes) {
        try {
          // Handle case where data might already be parsed as objects
          if (typeof dbSettings.preferred_style_codes === 'string') {
            parsedPreferredStyleCodes = JSON.parse(dbSettings.preferred_style_codes);
          } else if (Array.isArray(dbSettings.preferred_style_codes)) {
            // Data is already parsed as objects - use directly
            parsedPreferredStyleCodes = dbSettings.preferred_style_codes;
          } else {
            console.warn('⚠️ Unexpected preferred_style_codes format:', typeof dbSettings.preferred_style_codes);
            parsedPreferredStyleCodes = [];
          }
        } catch (error) {
          console.warn('⚠️ Invalid JSON in preferred_style_codes field:', error.message);
          console.warn('⚠️ Raw preferred_style_codes data:', dbSettings.preferred_style_codes);
          console.warn('⚠️ Data type:', typeof dbSettings.preferred_style_codes);
          parsedPreferredStyleCodes = [];
        }
      }
      
      if (dbSettings.default_settings) {
        try {
          // Handle case where data might already be parsed as objects
          if (typeof dbSettings.default_settings === 'string') {
            parsedDefaultSettings = JSON.parse(dbSettings.default_settings);
          } else if (typeof dbSettings.default_settings === 'object' && dbSettings.default_settings !== null) {
            // Data is already parsed as objects - use directly
            parsedDefaultSettings = dbSettings.default_settings;
          } else {
            console.warn('⚠️ Unexpected default_settings format:', typeof dbSettings.default_settings);
            parsedDefaultSettings = settings.defaults;
          }
        } catch (error) {
          console.warn('⚠️ Invalid JSON in default_settings field:', error.message);
          console.warn('⚠️ Raw default_settings data:', dbSettings.default_settings);
          console.warn('⚠️ Data type:', typeof dbSettings.default_settings);
          parsedDefaultSettings = settings.defaults;
        }
      }
      
      settings = {
        promptPrefix: dbSettings.prompt_prefix || '',
        promptSuffix: dbSettings.prompt_suffix || '',
        brandColors: parsedBrandColors,
        preferredStyleCodes: parsedPreferredStyleCodes,
        defaults: parsedDefaultSettings,
        createdAt: dbSettings.created_at,
        updatedAt: dbSettings.updated_at
      };
    }

    res.json({
      success: true,
      settings,
      accountId
    });
  } catch (error) {
    console.error('❌ Error fetching account image settings:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Update account image generation settings
app.put('/api/eden/settings/image-generation', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { 
      promptPrefix = '',
      promptSuffix = '',
      brandColors = [],
      defaults = {},
      preferredStyleCodes = []
    } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`⚙️ Updating image generation settings for account ${accountId}`);

    // Validate brand colors format
    if (brandColors && Array.isArray(brandColors)) {
      for (const colorSet of brandColors) {
        if (!colorSet.name || !Array.isArray(colorSet.colors)) {
          return res.status(400).json({ error: 'Invalid brand colors format. Expected: [{name, colors: []}]' });
        }
        
        // Validate color format (hex colors)
        for (const color of colorSet.colors) {
          if (!/^#?[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({ error: `Invalid color format: ${color}. Expected hex format (e.g., #FF0000)` });
          }
        }
      }
    }

    // Prepare data for database with JSON serialization error handling
    let brandColorsJson, preferredStyleCodesJson, defaultSettingsJson;
    
    try {
      brandColorsJson = JSON.stringify(brandColors);
    } catch (error) {
      console.error('❌ Failed to serialize brand colors:', error.message);
      console.error('Data that failed to serialize:', brandColors);
      console.error('Data type:', typeof brandColors);
      console.error('Is Array:', Array.isArray(brandColors));
      console.error('Length:', brandColors?.length);
      console.error('First item:', brandColors?.[0]);
      return res.status(500).json({ error: 'Failed to serialize brand colors data' });
    }
    
    try {
      preferredStyleCodesJson = JSON.stringify(preferredStyleCodes);
    } catch (error) {
      console.error('❌ Failed to serialize preferred style codes:', error.message);
      return res.status(500).json({ error: 'Failed to serialize preferred style codes data' });
    }
    
    try {
      defaultSettingsJson = JSON.stringify({
        modelVersion: defaults.modelVersion || 'v2', // Add model version
        aspectRatio: defaults.aspectRatio || '16:9',
        resolution: defaults.resolution || '', // Add resolution
        styleType: defaults.styleType || 'GENERAL',
        renderingSpeed: defaults.renderingSpeed || 'DEFAULT',
        magicPrompt: defaults.magicPrompt || 'AUTO',
        negativePrompt: defaults.negativePrompt || '',
        numImages: parseInt(defaults.numImages) || 1
      });
    } catch (error) {
      console.error('❌ Failed to serialize default settings:', error.message);
      return res.status(500).json({ error: 'Failed to serialize default settings data' });
    }
    
    const settingsData = {
      account_id: accountId,
      prompt_prefix: promptPrefix.trim() || null,
      prompt_suffix: promptSuffix.trim() || null,
      brand_colors: brandColorsJson,
      preferred_style_codes: preferredStyleCodesJson,
      default_settings: defaultSettingsJson
    };

    // Check if settings exist for this account
    const existingSettings = await db.query(`
      SELECT settings_id FROM ssnews_account_image_settings 
      WHERE account_id = ?
    `, [accountId]);

    if (existingSettings.length > 0) {
      // Update existing settings - handle if preferred_style_codes column doesn't exist
      try {
        await db.query(`
          UPDATE ssnews_account_image_settings 
          SET 
            prompt_prefix = ?,
            prompt_suffix = ?,
            brand_colors = ?,
            preferred_style_codes = ?,
            default_settings = ?,
            updated_at = NOW()
          WHERE account_id = ?
        `, [
          settingsData.prompt_prefix,
          settingsData.prompt_suffix,
          settingsData.brand_colors,
          settingsData.preferred_style_codes,
          settingsData.default_settings,
          accountId
        ]);
      } catch (error) {
        if (error.message.includes('preferred_style_codes')) {
          // Column doesn't exist yet, update without it
          console.log('⚠️ preferred_style_codes column not found, updating without it');
          await db.query(`
            UPDATE ssnews_account_image_settings 
            SET 
              prompt_prefix = ?,
              prompt_suffix = ?,
              brand_colors = ?,
              default_settings = ?,
              updated_at = NOW()
            WHERE account_id = ?
          `, [
            settingsData.prompt_prefix,
            settingsData.prompt_suffix,
            settingsData.brand_colors,
            settingsData.default_settings,
            accountId
          ]);
        } else {
          throw error;
        }
      }
      console.log(`✅ Updated image settings for account ${accountId}`);
    } else {
      // Create new settings - handle if preferred_style_codes column doesn't exist
      try {
        await db.insert('ssnews_account_image_settings', settingsData);
      } catch (error) {
        if (error.message.includes('preferred_style_codes')) {
          // Column doesn't exist yet, create without it
          console.log('⚠️ preferred_style_codes column not found, creating without it');
          const { preferred_style_codes, ...settingsWithoutPreferred } = settingsData;
          await db.insert('ssnews_account_image_settings', settingsWithoutPreferred);
        } else {
          throw error;
        }
      }
      console.log(`✅ Created image settings for account ${accountId}`);
    }

    res.json({
      success: true,
      message: 'Image generation settings updated successfully',
      settings: {
        promptPrefix: settingsData.prompt_prefix || '',
        promptSuffix: settingsData.prompt_suffix || '',
        brandColors: brandColors,  // Use original data instead of parsing JSON
        defaults: {
          modelVersion: defaults.modelVersion || 'v2', // Add model version
          aspectRatio: defaults.aspectRatio || '16:9',
          resolution: defaults.resolution || '', // Add resolution
          styleType: defaults.styleType || 'GENERAL',
          renderingSpeed: defaults.renderingSpeed || 'DEFAULT',
          magicPrompt: defaults.magicPrompt || 'AUTO',
          negativePrompt: defaults.negativePrompt || '',
          numImages: parseInt(defaults.numImages) || 1
        },
        preferredStyleCodes: preferredStyleCodes  // Use original data instead of parsing JSON
      },
      accountId
    });
  } catch (error) {
    console.error('❌ Error updating account image settings:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Add a new brand color set
app.post('/api/eden/settings/brand-colors', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { name, colors } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!name || !Array.isArray(colors) || colors.length === 0) {
      return res.status(400).json({ error: 'Name and colors array are required' });
    }

    // Validate color format
    for (const color of colors) {
      if (!/^#?[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({ error: `Invalid color format: ${color}. Expected hex format (e.g., #FF0000)` });
      }
    }

    console.log(`🎨 Adding brand color set "${name}" for account ${accountId}`);

    // Use database transaction to ensure atomic operation
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Lock the row and get current settings
      const [currentSettings] = await connection.execute(`
        SELECT brand_colors FROM ssnews_account_image_settings 
        WHERE account_id = ? FOR UPDATE
      `, [accountId]);

      let brandColors = [];
      if (currentSettings.length > 0 && currentSettings[0].brand_colors) {
        try {
          const rawData = currentSettings[0].brand_colors;
          console.log(`🔍 Raw brand_colors data type: ${typeof rawData}`);
          console.log(`🔍 Raw brand_colors data:`, rawData);
          
          if (typeof rawData === 'string') {
            brandColors = JSON.parse(rawData);
          } else if (Array.isArray(rawData)) {
            brandColors = rawData;
          } else {
            console.warn('⚠️ Unexpected brand_colors format, starting fresh');
            brandColors = [];
          }
          
          console.log(`🔍 Parsed brand colors count: ${brandColors.length}`);
          console.log(`🔍 Existing color sets:`, brandColors.map(set => set.name));
        } catch (parseError) {
          console.warn('⚠️ Invalid JSON in existing brand_colors, starting fresh:', parseError.message);
          brandColors = [];
        }
      } else {
        console.log(`🔍 No existing brand colors found for account ${accountId}`);
      }

      // Add new color set (normalize colors to include #)
      const normalizedColors = colors.map(color => color.startsWith('#') ? color : `#${color}`);
      const newColorSet = {
        name: name.trim(),
        colors: normalizedColors,
        createdAt: new Date().toISOString()
      };
      
      brandColors.push(newColorSet);
      console.log(`🎨 After adding new set, total count: ${brandColors.length}`);
      console.log(`🎨 All color sets:`, brandColors.map(set => set.name));

      // Serialize with error handling
      let brandColorsJson;
      try {
        brandColorsJson = JSON.stringify(brandColors);
        console.log(`🔍 Serialized brand colors length: ${brandColorsJson.length}`);
      } catch (serializeError) {
        console.error('❌ Failed to serialize brand colors:', serializeError.message);
        console.error('Data that failed to serialize:', brandColors);
        await connection.rollback();
        return res.status(500).json({ error: 'Failed to serialize brand colors data' });
      }

      // Update or create settings
      if (currentSettings.length > 0) {
        const [updateResult] = await connection.execute(`
          UPDATE ssnews_account_image_settings 
          SET brand_colors = ?, updated_at = NOW()
          WHERE account_id = ?
        `, [brandColorsJson, accountId]);
        console.log(`🔍 Update result:`, updateResult);
      } else {
        const [insertResult] = await connection.execute(`
          INSERT INTO ssnews_account_image_settings (account_id, brand_colors, default_settings)
          VALUES (?, ?, ?)
        `, [
          accountId,
          brandColorsJson,
          JSON.stringify({
            aspectRatio: '16:9',
            styleType: 'GENERAL',
            renderingSpeed: 'DEFAULT',
            magicPrompt: 'AUTO',
            negativePrompt: '',
            numImages: 1
          })
        ]);
        console.log(`🔍 Insert result:`, insertResult);
      }

      // Verify the update by reading back
      const [verifySettings] = await connection.execute(`
        SELECT brand_colors FROM ssnews_account_image_settings 
        WHERE account_id = ?
      `, [accountId]);
      
      let verifiedBrandColors = [];
      if (verifySettings.length > 0 && verifySettings[0].brand_colors) {
        try {
          const rawData = verifySettings[0].brand_colors;
          if (typeof rawData === 'string') {
            verifiedBrandColors = JSON.parse(rawData);
          } else if (Array.isArray(rawData)) {
            verifiedBrandColors = rawData;
          }
          console.log(`✅ Verified brand colors count: ${verifiedBrandColors.length}`);
          console.log(`✅ Verified color sets:`, verifiedBrandColors.map(set => set.name));
        } catch (parseError) {
          console.error('❌ Failed to parse verified data:', parseError.message);
        }
      }

      await connection.commit();
      
      res.json({
        success: true,
        message: `Brand color set "${name}" added successfully`,
        brandColors: verifiedBrandColors.length > 0 ? verifiedBrandColors : brandColors,
        accountId,
        debug: {
          originalCount: brandColors.length - 1,
          newCount: verifiedBrandColors.length || brandColors.length,
          addedSet: newColorSet.name
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error adding brand color set:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Remove a brand color set
app.delete('/api/eden/settings/brand-colors/:colorSetIndex', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { colorSetIndex } = req.params;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const index = parseInt(colorSetIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'Invalid color set index' });
    }

    console.log(`🗑️ Removing brand color set at index ${index} for account ${accountId}`);

    // Use database transaction to ensure atomic operation
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Lock the row and get current settings
      const [currentSettings] = await connection.execute(`
        SELECT brand_colors FROM ssnews_account_image_settings 
        WHERE account_id = ? FOR UPDATE
      `, [accountId]);

      if (currentSettings.length === 0 || !currentSettings[0].brand_colors) {
        await connection.rollback();
        return res.status(404).json({ error: 'No brand colors found' });
      }

      let brandColors = [];
      try {
        const rawData = currentSettings[0].brand_colors;
        console.log(`🔍 Raw brand_colors data type: ${typeof rawData}`);
        console.log(`🔍 Raw brand_colors data:`, rawData);
        
        if (typeof rawData === 'string') {
          brandColors = JSON.parse(rawData);
        } else if (Array.isArray(rawData)) {
          brandColors = rawData;
        } else {
          console.error('❌ Unexpected brand_colors format:', typeof rawData);
          await connection.rollback();
          return res.status(500).json({ error: 'Invalid brand colors data format in database' });
        }
        
        console.log(`🔍 Parsed brand colors count: ${brandColors.length}`);
        console.log(`🔍 Existing color sets:`, brandColors.map(set => set.name));
      } catch (parseError) {
        console.error('❌ Invalid JSON in brand_colors field:', parseError.message);
        await connection.rollback();
        return res.status(500).json({ error: 'Invalid brand colors data in database' });
      }
      
      if (index >= brandColors.length) {
        await connection.rollback();
        return res.status(404).json({ error: 'Color set index not found' });
      }

      const removedColorSet = brandColors.splice(index, 1)[0];
      console.log(`🗑️ Removing color set: ${removedColorSet.name}`);
      console.log(`🗑️ Remaining color sets: ${brandColors.length}`);

      // Serialize updated brand colors with error handling
      let updatedBrandColorsJson;
      try {
        updatedBrandColorsJson = JSON.stringify(brandColors);
        console.log(`🔍 Serialized updated brand colors length: ${updatedBrandColorsJson.length}`);
      } catch (serializeError) {
        console.error('❌ Failed to serialize updated brand colors:', serializeError.message);
        await connection.rollback();
        return res.status(500).json({ error: 'Failed to serialize brand colors data' });
      }

      // Update settings
      const [updateResult] = await connection.execute(`
        UPDATE ssnews_account_image_settings 
        SET brand_colors = ?, updated_at = NOW()
        WHERE account_id = ?
      `, [updatedBrandColorsJson, accountId]);
      console.log(`🔍 Update result:`, updateResult);

      // Verify the update by reading back
      const [verifySettings] = await connection.execute(`
        SELECT brand_colors FROM ssnews_account_image_settings 
        WHERE account_id = ?
      `, [accountId]);
      
      let verifiedBrandColors = [];
      if (verifySettings.length > 0 && verifySettings[0].brand_colors) {
        try {
          const rawData = verifySettings[0].brand_colors;
          if (typeof rawData === 'string') {
            verifiedBrandColors = JSON.parse(rawData);
          } else if (Array.isArray(rawData)) {
            verifiedBrandColors = rawData;
          }
          console.log(`✅ Verified brand colors count: ${verifiedBrandColors.length}`);
          console.log(`✅ Verified remaining color sets:`, verifiedBrandColors.map(set => set.name));
        } catch (parseError) {
          console.error('❌ Failed to parse verified data:', parseError.message);
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Brand color set "${removedColorSet.name}" removed successfully`,
        brandColors: verifiedBrandColors.length >= 0 ? verifiedBrandColors : brandColors,
        accountId,
        debug: {
          originalCount: brandColors.length + 1,
          newCount: verifiedBrandColors.length || brandColors.length,
          removedSet: removedColorSet.name
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error removing brand color set:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// ===== END ACCOUNT IMAGE SETTINGS API ENDPOINTS =====

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

    // Add preferred_style_codes column to account image settings if it doesn't exist
    if (!(await columnExists('ssnews_account_image_settings', 'preferred_style_codes'))) {
      try {
        await db.query('ALTER TABLE ssnews_account_image_settings ADD COLUMN preferred_style_codes JSON NULL COMMENT \'Array of preferred style codes and seeds\'');
        results.push({ action: 'Add preferred_style_codes column', status: 'success' });
        console.log('✅ Added preferred_style_codes column to ssnews_account_image_settings');
      } catch (error) {
        results.push({ action: 'Add preferred_style_codes column', status: 'error', error: error.message });
        console.log('❌ Failed to add preferred_style_codes column:', error.message);
      }
    } else {
      results.push({ action: 'Add preferred_style_codes column', status: 'skipped', reason: 'Column already exists' });
    }

    // Add image status column and migrate data
    if (!(await columnExists('ssnews_image_assets', 'status'))) {
      try {
        // 1. Add the new status column with a temporary default
        await db.query(`ALTER TABLE ssnews_image_assets ADD COLUMN status ENUM('pending_review', 'approved', 'rejected', 'archived') DEFAULT 'pending_review' NOT NULL AFTER alt_text_suggestion_ai`);
        results.push({ action: 'Add status column to ssnews_image_assets', status: 'success' });
        console.log('✅ Added status column to ssnews_image_assets');

        // 2. Update new status based on old is_approved_human column
        if (await columnExists('ssnews_image_assets', 'is_approved_human')) {
          await db.query(`UPDATE ssnews_image_assets SET status = 'approved' WHERE is_approved_human = TRUE`);
          await db.query(`UPDATE ssnews_image_assets SET status = 'pending_review' WHERE is_approved_human = FALSE`);
          results.push({ action: 'Migrate is_approved_human to status', status: 'success' });
          console.log('✅ Migrated data from is_approved_human to status');

          // 3. Drop the old is_approved_human column
          await db.query(`ALTER TABLE ssnews_image_assets DROP COLUMN is_approved_human`);
          results.push({ action: 'Drop is_approved_human column', status: 'success' });
          console.log('✅ Dropped old is_approved_human column');
        } else {
          results.push({ action: 'Migrate is_approved_human to status', status: 'skipped', reason: 'is_approved_human column does not exist' });
        }
        // 4. Add index on new status column
        if (!(await indexExists('ssnews_image_assets', 'idx_status'))) {
            await db.query('CREATE INDEX idx_status ON ssnews_image_assets(status)');
            results.push({ action: 'Create status index on ssnews_image_assets', status: 'success' });
            console.log('✅ Created idx_status index on ssnews_image_assets');
        } else {
            results.push({ action: 'Create status index on ssnews_image_assets', status: 'skipped', reason: 'Index already exists' });
        }

      } catch (error) {
        results.push({ action: 'Modify ssnews_image_assets for status column', status: 'error', error: error.message });
        console.log('❌ Failed to modify ssnews_image_assets for status column:', error.message);
      }
    } else {
      results.push({ action: 'Modify ssnews_image_assets for status column', status: 'skipped', reason: 'status column already exists' });
    }

    // Add generation_metadata column to image assets if it doesn't exist
    if (!(await columnExists('ssnews_image_assets', 'generation_metadata'))) {
      try {
        await db.query('ALTER TABLE ssnews_image_assets ADD COLUMN generation_metadata JSON NULL COMMENT \'Ideogram generation metadata including style codes\' AFTER alt_text_suggestion_ai');
        results.push({ action: 'Add generation_metadata column to ssnews_image_assets', status: 'success' });
        console.log('✅ Added generation_metadata column to ssnews_image_assets');
      } catch (error) {
        results.push({ action: 'Add generation_metadata column to ssnews_image_assets', status: 'error', error: error.message });
        console.log('❌ Failed to add generation_metadata column:', error.message);
      }
    } else {
      results.push({ action: 'Add generation_metadata column to ssnews_image_assets', status: 'skipped', reason: 'Column already exists' });
    }

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

// Get comprehensive AI tracking data for content
app.get('/api/eden/ai-tracking', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    const { contentId, category } = req.query;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!contentId) {
      return res.status(400).json({ error: 'Content ID is required' });
    }

    console.log(`📊 Fetching AI tracking data for content ${contentId} (account: ${accountId})`);

    // Build query conditions
    let whereConditions = ['generated_article_id = ?'];
    let queryParams = [parseInt(contentId)];

    if (category) {
      whereConditions.push('content_category = ?');
      queryParams.push(category);
    }

    // Query detailed AI response logs
    const trackingEntries = await db.query(`
      SELECT 
        response_log_id,
        generated_article_id,
        template_id,
        version_id,
        content_category,
        ai_service,
        model_used,
        prompt_text,
        system_message,
        response_text,
        tokens_used_input,
        tokens_used_output,
        tokens_used_total,
        generation_time_ms,
        temperature,
        max_output_tokens,
        stop_reason,
        finish_reason,
        is_complete,
        is_truncated,
        safety_ratings,
        content_filter_applied,
        success,
        error_message,
        warning_message,
        created_at
      FROM ssnews_ai_response_log 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
    `, queryParams);

    console.log(`✅ Found ${trackingEntries.length} AI tracking entries for content ${contentId}`);

    res.json({
      success: true,
      contentId: parseInt(contentId),
      category: category || null,
      entries: trackingEntries,
      count: trackingEntries.length,
      accountId
    });
  } catch (error) {
    console.error('❌ Error fetching AI tracking data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get generation history and analytics
app.get('/api/eden/images/generation-history', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`📊 Fetching generation history for account ${accountId}`);

    // Fetch generation history for this account with error handling
    let history = [];
    try {
      history = await db.query(`
        SELECT 
          generation_id as id,
          content_id,
          user_prompt,
          final_prompt,
          negative_prompt,
          style_type,
          aspect_ratio,
          magic_prompt_mode,
          rendering_speed,
          provider,
          generated_image_url,
          resolution,
          seed,
          is_image_safe,
          estimated_cost_usd,
          generation_time_seconds,
          content_title,
          content_summary,
          status,
          error_message,
          created_at,
          completed_at
        FROM ssnews_image_generations
        WHERE account_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `, [accountId]);
    } catch (dbError) {
      if (dbError.message.includes("doesn't exist")) {
        console.log(`⚠️ Image generations table doesn't exist yet for account ${accountId}`);
        history = [];
      } else {
        throw dbError;
      }
    }

    // Format the response to match the expected structure
    const formattedHistory = history.map(item => ({
      id: item.id,
      contentId: item.content_id,
      prompts: {
        userPrompt: item.user_prompt,
        finalPrompt: item.final_prompt
      },
      parameters: {
        styleType: item.style_type,
        aspectRatio: item.aspect_ratio,
        magicPrompt: item.magic_prompt_mode,
        renderingSpeed: item.rendering_speed,
        negativePrompt: item.negative_prompt
      },
      result: {
        imageUrl: item.generated_image_url,
        resolution: item.resolution,
        seed: item.seed,
        isImageSafe: item.is_image_safe
      },
      metadata: {
        provider: item.provider,
        estimatedCostUSD: parseFloat(item.estimated_cost_usd || 0),
        generationTimeSeconds: parseFloat(item.generation_time_seconds || 0),
        contentTitle: item.content_title,
        contentSummary: item.content_summary
      },
      status: item.status,
      errorMessage: item.error_message,
      createdAt: item.created_at,
      completedAt: item.completed_at
    }));

    res.json({
      success: true,
      history: formattedHistory,
      total: formattedHistory.length,
      accountId
    });
  } catch (error) {
    console.error('❌ Error fetching generation history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

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

// Debug endpoint to check and clean corrupt JSON data
app.post('/api/debug/clean-image-settings-json', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🧹 Checking and cleaning JSON data for account ${accountId}`);

    // Get all settings for this account
    const allSettings = await db.query(`
      SELECT 
        settings_id,
        account_id,
        brand_colors,
        preferred_style_codes,
        default_settings
      FROM ssnews_account_image_settings 
      WHERE account_id = ?
    `, [accountId]);

    const results = [];

    if (allSettings.length === 0) {
      return res.json({
        success: true,
        message: 'No settings found for this account',
        results: []
      });
    }

    for (const setting of allSettings) {
      const result = {
        settingsId: setting.settings_id,
        accountId: setting.account_id,
        issues: [],
        fixes: []
      };

      // Check brand_colors
      if (setting.brand_colors) {
        try {
          JSON.parse(setting.brand_colors);
          result.issues.push('brand_colors: Valid JSON');
        } catch (error) {
          result.issues.push(`brand_colors: Invalid JSON - ${error.message}`);
          result.issues.push(`brand_colors raw data: ${setting.brand_colors}`);
          
          // Try to fix by resetting to empty array
          try {
            await db.query(`
              UPDATE ssnews_account_image_settings 
              SET brand_colors = '[]'
              WHERE settings_id = ?
            `, [setting.settings_id]);
            result.fixes.push('brand_colors: Reset to empty array');
          } catch (fixError) {
            result.fixes.push(`brand_colors: Failed to fix - ${fixError.message}`);
          }
        }
      }

      // Check preferred_style_codes
      if (setting.preferred_style_codes) {
        try {
          JSON.parse(setting.preferred_style_codes);
          result.issues.push('preferred_style_codes: Valid JSON');
        } catch (error) {
          result.issues.push(`preferred_style_codes: Invalid JSON - ${error.message}`);
          result.issues.push(`preferred_style_codes raw data: ${setting.preferred_style_codes}`);
          
          // Try to fix by resetting to empty array
          try {
            await db.query(`
              UPDATE ssnews_account_image_settings 
              SET preferred_style_codes = '[]'
              WHERE settings_id = ?
            `, [setting.settings_id]);
            result.fixes.push('preferred_style_codes: Reset to empty array');
          } catch (fixError) {
            result.fixes.push(`preferred_style_codes: Failed to fix - ${fixError.message}`);
          }
        }
      }

      // Check default_settings
      if (setting.default_settings) {
        try {
          JSON.parse(setting.default_settings);
          result.issues.push('default_settings: Valid JSON');
        } catch (error) {
          result.issues.push(`default_settings: Invalid JSON - ${error.message}`);
          result.issues.push(`default_settings raw data: ${setting.default_settings}`);
          
          // Try to fix by resetting to default object
          const defaultSettings = JSON.stringify({
            aspectRatio: '16:9',
            styleType: 'GENERAL',
            renderingSpeed: 'DEFAULT',
            magicPrompt: 'AUTO',
            negativePrompt: '',
            numImages: 1
          });
          
          try {
            await db.query(`
              UPDATE ssnews_account_image_settings 
              SET default_settings = ?
              WHERE settings_id = ?
            `, [defaultSettings, setting.settings_id]);
            result.fixes.push('default_settings: Reset to default values');
          } catch (fixError) {
            result.fixes.push(`default_settings: Failed to fix - ${fixError.message}`);
          }
        }
      }

      results.push(result);
    }

    res.json({
      success: true,
      message: `Checked and cleaned JSON data for account ${accountId}`,
      results,
      accountId
    });
  } catch (error) {
    console.error('❌ Error cleaning image settings JSON:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to fix prayer points configuration
app.post('/api/debug/fix-prayer-config', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;
    
    console.log(`🔧 Checking prayer points configuration for account ${accountId}`);
    
    // Check if this account has prayer points configuration
    const existingConfig = await db.query(`
      SELECT config_id, display_name 
      FROM ssnews_prompt_configuration 
      WHERE account_id = ? AND prompt_category = 'prayer_points'
    `, [accountId]);
    
    let configStatus = 'existing';
    
    if (existingConfig.length === 0) {
      console.log(`⚠️ Account ${accountId} missing prayer points configuration, adding it...`);
      
      // Add prayer points configuration for this account
      await db.query(`
        INSERT INTO ssnews_prompt_configuration 
        (account_id, prompt_category, display_name, storage_schema, ui_config, generation_config, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        accountId,
        'prayer_points',
        'Prayer Points',
        JSON.stringify({
          type: 'array',
          max_items: 5,
          items: {
            order_number: { type: 'integer', required: true },
            prayer_text: { type: 'string', max_length: 200, required: true },
            theme: { type: 'string', max_length: 50 }
          }
        }),
        JSON.stringify({
          tab_name: 'Prayer Points',
          icon: 'Heart',
          display_type: 'numbered_list',
          empty_message: 'No prayer points generated',
          count_in_tab: true,
          order: 4
        }),
        JSON.stringify({
          model: 'gemini',
          max_tokens: 1000,
          temperature: 0.7,
          prompt_template: 'prayer',
          fallback_template: 'prayer',
          custom_instructions: 'Create 5 prayer points, 15-25 words each, covering different aspects: people affected, healing, guidance, hope, and justice.'
        }),
        true
      ]);
      
      configStatus = 'added';
      console.log(`✅ Added prayer points configuration for account ${accountId}`);
    } else {
      console.log(`✅ Account ${accountId} already has prayer points configuration`);
    }
    
    // Check for duplicate content
    const duplicates = await db.query(`
      SELECT 
        based_on_scraped_article_id,
        COUNT(*) as count,
        GROUP_CONCAT(gen_article_id) as article_ids,
        GROUP_CONCAT(status) as statuses
      FROM ssnews_generated_articles 
      WHERE account_id = ? AND status IN ('draft', 'review_pending')
      GROUP BY based_on_scraped_article_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, [accountId]);
    
    // Check recent prayer points generation
    const recentContent = await db.query(`
      SELECT 
        ga.gen_article_id,
        ga.title,
        ga.created_at,
        COUNT(gc.content_id) as prayer_count
      FROM ssnews_generated_articles ga
      LEFT JOIN ssnews_generated_content gc ON ga.gen_article_id = gc.based_on_gen_article_id 
        AND gc.prompt_category = 'prayer_points'
      WHERE ga.account_id = ? AND ga.status = 'draft' 
        AND ga.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      GROUP BY ga.gen_article_id
      ORDER BY ga.created_at DESC
      LIMIT 5
    `, [accountId]);
    
    res.json({
      success: true,
      configStatus,
      duplicates: {
        count: duplicates.length,
        items: duplicates.map(d => ({
          sourceArticleId: d.based_on_scraped_article_id,
          duplicateCount: d.count,
          articleIds: d.article_ids.split(','),
          statuses: d.statuses.split(',')
        }))
      },
      recentContent: recentContent.map(c => ({
        articleId: c.gen_article_id,
        title: c.title,
        createdAt: c.created_at,
        hasPrayerPoints: c.prayer_count > 0
      })),
      accountId
    });
  } catch (error) {
    console.error('❌ Error fixing prayer configuration:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to sync prompt templates with prompt configurations
app.post('/api/debug/sync-template-configs', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;
    
    console.log(`🔄 Syncing prompt templates to configurations for account ${accountId}`);
    
    // Get all active prompt templates for this account
    const templates = await db.query(`
      SELECT template_id, name, description, category, execution_order
      FROM ssnews_prompt_templates 
      WHERE account_id = ? AND is_active = 1
      ORDER BY execution_order ASC, name ASC
    `, [accountId]);
    
    console.log(`📋 Found ${templates.length} prompt templates to sync`);
    
    // Get existing configurations to avoid duplicates
    const existingConfigs = await db.query(`
      SELECT prompt_category 
      FROM ssnews_prompt_configuration 
      WHERE account_id = ?
    `, [accountId]);
    
    const existingCategories = new Set(existingConfigs.map(c => c.prompt_category));
    
    // Template configuration mappings
    const templateConfigs = {
      'prayer': {
        category: 'prayer_points',
        displayName: 'Prayer Points',
        schema: {
          type: 'array',
          max_items: 5,
          items: {
            order_number: { type: 'integer', required: true },
            prayer_text: { type: 'string', max_length: 200, required: true },
            theme: { type: 'string', max_length: 50 }
          }
        },
        uiConfig: {
          tab_name: 'Prayer Points',
          icon: 'Heart',
          display_type: 'numbered_list',
          empty_message: 'No prayer points generated',
          count_in_tab: true,
          order: 4
        }
      },
      'social_media': {
        category: 'social_media',
        displayName: 'Social Media',
        schema: {
          type: 'array',
          max_items: 3,
          items: {
            platform: { type: 'string', required: true },
            text: { type: 'string', max_length: 280, required: true },
            hashtags: { type: 'array', items: { type: 'string' } }
          }
        },
        uiConfig: {
          tab_name: 'Social Media',
          icon: 'Share2',
          display_type: 'platform_cards',
          empty_message: 'No social media posts generated',
          count_in_tab: true,
          order: 2
        }
      },
      'video_script': {
        category: 'video_scripts',
        displayName: 'Video Scripts',
        schema: {
          type: 'array',
          max_items: 3,
          items: {
            title: { type: 'string', max_length: 100, required: true },
            script: { type: 'string', required: true },
            duration: { type: 'integer' },
            visual_suggestions: { type: 'array', items: { type: 'string' } }
          }
        },
        uiConfig: {
          tab_name: 'Video Scripts',
          icon: 'Video',
          display_type: 'script_cards',
          empty_message: 'No video scripts generated',
          count_in_tab: true,
          order: 3
        }
      }
    };
    
    const syncResults = [];
    
    for (const template of templates) {
      const config = templateConfigs[template.category];
      if (!config) {
        console.log(`⚠️ No configuration mapping for category: ${template.category}`);
        continue;
      }
      
      const configCategory = config.category;
      
      if (existingCategories.has(configCategory)) {
        console.log(`✅ Configuration already exists for: ${configCategory}`);
        syncResults.push({ template: template.name, status: 'exists', category: configCategory });
        continue;
      }
      
      try {
        // Create the configuration
        await db.query(`
          INSERT INTO ssnews_prompt_configuration 
          (account_id, prompt_category, display_name, storage_schema, ui_config, generation_config, is_active) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          accountId,
          configCategory,
          config.displayName,
          JSON.stringify(config.schema),
          JSON.stringify(config.uiConfig),
          JSON.stringify({
            model: 'gemini',
            max_tokens: 1000,
            temperature: 0.7,
            prompt_template: template.category,
            custom_instructions: `Generate ${config.displayName.toLowerCase()} based on the news article content.`
          }),
          true
        ]);
        
        console.log(`✅ Created configuration for: ${config.displayName} (${configCategory})`);
        syncResults.push({ template: template.name, status: 'created', category: configCategory });
      } catch (error) {
        console.error(`❌ Failed to create configuration for ${template.name}:`, error.message);
        syncResults.push({ template: template.name, status: 'error', error: error.message });
      }
    }
    
    // Test the discovery after sync
    const discoveredTypes = await db.getActiveContentConfigurations(accountId);
    
    res.json({
      success: true,
      templatesFound: templates.length,
      syncResults,
      discoveredAfterSync: discoveredTypes.length,
      discoveredTypes: discoveredTypes.map(t => ({
        category: t.prompt_category,
        displayName: t.display_name
      })),
      accountId
    });
  } catch (error) {
    console.error('❌ Error syncing templates:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to switch UCB source from RSS to web scraping
app.post('/api/debug/fix-ucb-source', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;
    
    console.log(`🔧 Switching UCB source from RSS to web scraping for account ${accountId}`);
    
    // Find UCB source
    const ucbSource = await db.findOne(
      'ssnews_news_sources', 
      'name LIKE ? AND account_id = ?', 
      ['%UCB%', accountId]
    );
    
    if (!ucbSource) {
      return res.status(404).json({ 
        success: false, 
        error: 'UCB source not found for this account' 
      });
    }
    
    console.log(`📰 Found UCB source: ${ucbSource.name} (ID: ${ucbSource.source_id})`);
    console.log(`   Current RSS URL: ${ucbSource.rss_feed_url}`);
    console.log(`   Current Website URL: ${ucbSource.url}`);
    
    // Update source to use web scraping instead of RSS
    await db.update(
      'ssnews_news_sources',
      {
        rss_feed_url: null, // Remove RSS URL
        url: 'https://www.ucb.co.uk/word-for-today', // Set main website URL
        updated_at: new Date()
      },
      'source_id = ? AND account_id = ?',
      [ucbSource.source_id, accountId]
    );
    
    console.log(`✅ UCB source updated to use web scraping`);
    
    res.json({
      success: true,
      message: 'UCB source switched from RSS to web scraping',
      changes: {
        before: {
          rss_feed_url: ucbSource.rss_feed_url,
          url: ucbSource.url
        },
        after: {
          rss_feed_url: null,
          url: 'https://www.ucb.co.uk/word-for-today'
        }
      },
      source: {
        id: ucbSource.source_id,
        name: ucbSource.name
      }
    });
    
  } catch (error) {
    console.error('❌ Error switching UCB source:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== PROMPT TEMPLATE MANAGEMENT API =====

// Get all prompt templates for account
app.get('/api/prompts/templates', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;
    
    const templates = await db.query(`
      SELECT 
        template_id,
        name,
        description,
        category,
        execution_order,
        is_active,
        created_at,
        updated_at
      FROM ssnews_prompt_templates 
      WHERE account_id = ? AND is_active = 1
      ORDER BY execution_order ASC, name ASC
    `, [accountId]);
    
    res.json({
      success: true,
      templates: templates || [],
      accountId
    });
  } catch (error) {
    console.error('❌ Error fetching prompt templates:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create new prompt template
app.post('/api/prompts/templates', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;
    const { name, category, description, promptContent, systemMessage, createdBy } = req.body;
    
    if (!name || !category || !promptContent) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, category, and promptContent are required' 
      });
    }
    
    // Get next execution order
    const maxOrderResult = await db.query(`
      SELECT COALESCE(MAX(execution_order), 0) as max_order
      FROM ssnews_prompt_templates 
      WHERE account_id = ?
    `, [accountId]);
    
    const nextOrder = (maxOrderResult[0]?.max_order || 0) + 1;
    
    // Create template
    const templateResult = await db.query(`
      INSERT INTO ssnews_prompt_templates
      (account_id, name, description, category, execution_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
    `, [accountId, name, description || '', category, nextOrder]);
    
    const templateId = templateResult.insertId;
    
    // Create initial version
    await db.query(`
      INSERT INTO ssnews_prompt_versions
      (template_id, version_number, prompt_content, system_message, is_current, created_by, created_at)
      VALUES (?, 1, ?, ?, 1, ?, NOW())
    `, [templateId, promptContent, systemMessage || '', createdBy || 'user']);
    
    console.log(`✅ Created prompt template: ${name} (${category}) for account ${accountId}`);
    
    res.json({
      success: true,
      templateId,
      message: `Template "${name}" created successfully`,
      accountId
    });
  } catch (error) {
    console.error('❌ Error creating prompt template:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get template versions and details
app.get('/api/prompts/templates/:templateId/versions', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;
    const { templateId } = req.params;
    
    const versions = await db.query(`
      SELECT 
        version_id,
        version_number,
        prompt_content,
        system_message,
        is_current,
        created_by,
        created_at
      FROM ssnews_prompt_versions 
      WHERE template_id = ?
      ORDER BY version_number DESC
    `, [templateId]);
    
    res.json({
      success: true,
      versions: versions || [],
      templateId,
      accountId
    });
  } catch (error) {
    console.error('❌ Error fetching template versions:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get template history and stats
app.get('/api/prompts/templates/:templateId/history', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { templateId } = req.params;
    
    // For now, return empty history - can be expanded later
    res.json({
      success: true,
      history: [],
      templateId
    });
  } catch (error) {
    console.error('❌ Error fetching template history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get template stats
app.get('/api/prompts/templates/:templateId/stats', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { templateId } = req.params;
    
    // For now, return basic stats - can be expanded later
    res.json({
      success: true,
      stats: {
        totalGenerations: 0,
        averageRating: 0,
        lastUsed: null
      },
      templateId
    });
  } catch (error) {
    console.error('❌ Error fetching template stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create new template version
app.post('/api/prompts/templates/:templateId/versions', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { templateId } = req.params;
    const { promptContent, systemMessage, notes } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }
    
    // Start transaction to ensure data consistency
    await db.query('START TRANSACTION');
    
    try {
      // Get next version number
      const maxVersionResult = await db.query(`
        SELECT COALESCE(MAX(version_number), 0) as max_version
        FROM ssnews_prompt_versions 
        WHERE template_id = ?
      `, [templateId]);
      
      const nextVersion = (maxVersionResult[0]?.max_version || 0) + 1;
      
      // Set all existing versions as not current
      await db.query(`
        UPDATE ssnews_prompt_versions 
        SET is_current = 0 
        WHERE template_id = ?
      `, [templateId]);
      
      // Create new version and set it as current
      const versionResult = await db.query(`
        INSERT INTO ssnews_prompt_versions
        (template_id, version_number, prompt_content, system_message, notes, is_current, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, 1, 'user', NOW())
      `, [templateId, nextVersion, promptContent, systemMessage || '', notes || '']);
      
      // Update template's updated_at timestamp
      await db.query(`
        UPDATE ssnews_prompt_templates 
        SET updated_at = NOW() 
        WHERE template_id = ?
      `, [templateId]);
      
      // Commit transaction
      await db.query('COMMIT');
      
      console.log(`✅ Created new version ${nextVersion} for template ${templateId} and set as current`);
      
      res.json({
        success: true,
        versionId: versionResult.insertId,
        versionNumber: nextVersion,
        isCurrentVersion: true,
        message: `Version ${nextVersion} created successfully and set as current`
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error creating template version:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Set current version
app.put('/api/prompts/templates/:templateId/versions/:versionId/current', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { templateId, versionId } = req.params;
    
    // Set all versions to not current
    await db.query(`
      UPDATE ssnews_prompt_versions 
      SET is_current = 0 
      WHERE template_id = ?
    `, [templateId]);
    
    // Set specified version as current
    await db.query(`
      UPDATE ssnews_prompt_versions 
      SET is_current = 1 
      WHERE version_id = ? AND template_id = ?
    `, [versionId, templateId]);
    
    res.json({
      success: true,
      message: 'Current version updated successfully'
    });
  } catch (error) {
    console.error('❌ Error setting current version:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Test prompt template
app.post('/api/prompts/templates/:templateId/versions/:versionId/test', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { templateId, versionId } = req.params;
    const { testVariables } = req.body;
    
    // Get the version details
    const version = await db.query(`
      SELECT prompt_content, system_message
      FROM ssnews_prompt_versions 
      WHERE version_id = ? AND template_id = ?
    `, [versionId, templateId]);
    
    if (!version.length) {
      return res.status(404).json({ error: 'Template version not found' });
    }
    
    let processedPrompt = version[0].prompt_content;
    
    // Replace variables in prompt if provided
    if (testVariables) {
      for (const [key, value] of Object.entries(testVariables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processedPrompt = processedPrompt.replace(regex, value);
      }
    }
    
    // For testing purposes, just return the processed prompt
    // In a real implementation, you might call the AI service here
    res.json({
      success: true,
      result: {
        processedPrompt,
        systemMessage: version[0].system_message,
        testVariables,
        message: 'This is a test response. In production, this would call the AI service.'
      }
    });
  } catch (error) {
    console.error('❌ Error testing prompt template:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Reorder templates
app.put('/api/prompts/templates/reorder', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;
    const { order } = req.body;
    
    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'Order array is required' });
    }
    
    // Update execution order for each template
    for (const update of order) {
      await db.query(`
        UPDATE ssnews_prompt_templates 
        SET execution_order = ?, updated_at = NOW()
        WHERE template_id = ? AND account_id = ?
      `, [update.executionOrder, update.templateId, accountId]);
    }
    
    console.log(`✅ Updated template order for account ${accountId}`);
    
    res.json({
      success: true,
      message: 'Template order updated successfully',
      updatedCount: order.length
    });
  } catch (error) {
    console.error('❌ Error reordering templates:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Initialize default prompt templates for account
app.post('/api/prompts/templates/initialize-defaults', accountContext, async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { accountId } = req.accountContext;
    
    console.log(`🔧 Initializing default prompt templates for account ${accountId}`);
    
    // Check if account already has templates
    const existingTemplates = await db.query(`
      SELECT COUNT(*) as count
      FROM ssnews_prompt_templates 
      WHERE account_id = ? AND is_active = 1
    `, [accountId]);
    
    if (existingTemplates[0]?.count > 0) {
      return res.json({
        success: true,
        message: `Account already has ${existingTemplates[0].count} prompt templates`,
        templatesCount: existingTemplates[0].count,
        accountId
      });
    }
    
    // Default templates to create
    const defaultTemplates = [
      {
        name: 'Article Analyzer',
        category: 'analysis',
        description: 'Analyzes articles for relevance and generates summaries',
        execution_order: 1,
        prompt_content: `Analyze this news article for relevance to Christian audiences and Eden.co.uk's mission. Provide a relevance score and detailed analysis.

News Article:
{article_content}

Please provide:
1. Relevance score (0.0 to 1.0)
2. Summary (2-3 sentences)
3. Key themes
4. Potential Christian perspectives
5. Recommended content approach

Focus on stories that relate to faith, values, social issues, or topics that would interest Christian readers.`,
        system_message: 'You are an AI analyst specializing in Christian content curation. Evaluate content for its relevance and potential impact on Christian audiences.'
      },
      {
        name: 'Social Media Post',
        category: 'social_media',
        description: 'Creates social media content for various platforms',
        execution_order: 2,
        prompt_content: `Create social media content based on this news article. Generate posts for different platforms that are engaging and reflect Christian values.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Generate JSON with:
{
  "facebook": {
    "text": "150-200 words Facebook post",
    "hashtags": ["#Christian", "#Faith"]
  },
  "instagram": {
    "text": "100-150 words Instagram caption",
    "hashtags": ["#Christian", "#Faith", "#Hope"]
  },
  "linkedin": {
    "text": "Professional LinkedIn post",
    "hashtags": ["#Christian", "#Leadership"]
  }
}

Each post should be encouraging, include relevant scripture if appropriate, and maintain Eden.co.uk's hopeful tone.`,
        system_message: 'You are a social media manager for Eden.co.uk. Create engaging, encouraging Christian content that inspires and uplifts followers.'
      },
      {
        name: 'Blog Post Generator',
        category: 'blog_post',
        description: 'Generates engaging blog posts from news articles',
        execution_order: 3,
        prompt_content: `Create an engaging blog post based on this news article. The blog post should be warm, encouraging, and reflect Christian values. Include relevant Bible verses where appropriate and maintain a hopeful tone throughout.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Please write a blog post that:
- Has an engaging title
- Is 800-1200 words long
- Includes 2-3 relevant Bible verses
- Maintains Eden.co.uk's warm, encouraging tone
- Ends with a call to action or reflection question`,
        system_message: 'You are a Christian content writer for Eden.co.uk, a platform that shares encouraging Christian content. Your writing should be warm, hopeful, and biblically grounded.'
      },
      {
        name: 'Video Script Creator',
        category: 'video_script',
        description: 'Generates video scripts for different durations',
        execution_order: 4,
        prompt_content: `Create a video script based on this news article. The script should be engaging, encouraging, and suitable for Christian audiences.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Social Media Output:
{social_media_output}

Script Requirements:
- Duration: 60 seconds
- Include introduction, main content, and conclusion
- Maintain conversational, warm tone
- Include relevant Bible verses where appropriate
- End with encouragement or call to action

Return JSON format:
{
  "title": "Video title",
  "script": "Full script with scene directions in [brackets]",
  "duration": 60,
  "visualSuggestions": ["Visual suggestion 1", "Visual suggestion 2"]
}`,
        system_message: 'You are a video script writer for Eden.co.uk. Create engaging, biblically-grounded content that encourages and inspires viewers.'
      },
      {
        name: 'Prayer Points Generator',
        category: 'prayer',
        description: 'Creates prayer points based on news articles and current events',
        execution_order: 5,
        prompt_content: `Create 5 prayer points based on this news article. Each prayer point should be 15-25 words and cover different aspects: people affected, healing, guidance, hope, and justice.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Format each prayer point as a separate paragraph. Make them specific to the article content while maintaining a hopeful, faith-filled tone.`,
        system_message: 'You are a prayer coordinator for Eden.co.uk. Create thoughtful, biblically-grounded prayer points that help people pray meaningfully about current events.'
      },
      {
        name: 'Image Generation Prompts',
        category: 'image_generation',
        description: 'Generates prompts for AI image creation',
        execution_order: 6,
        prompt_content: `Create detailed image generation prompts based on this content to accompany the article and social media posts.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Generate 3 different image prompts:
1. Hero image for the article (inspirational, relevant to content)
2. Social media image (engaging, shareable)
3. Background/texture image (subtle, supportive)

Each prompt should be detailed and specify style, mood, colors, and composition.`,
        system_message: 'You are a visual content creator for Eden.co.uk. Create image prompts that are inspirational, relevant, and visually appealing for Christian audiences.'
      }
    ];
    
    const createdTemplates = [];
    
    // Create each template
    for (const template of defaultTemplates) {
      try {
        // Create template
        const templateResult = await db.query(`
          INSERT INTO ssnews_prompt_templates
          (account_id, name, description, category, execution_order, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
        `, [accountId, template.name, template.description, template.category, template.execution_order]);
        
        const templateId = templateResult.insertId;
        
        // Create initial version
        await db.query(`
          INSERT INTO ssnews_prompt_versions
          (template_id, version_number, prompt_content, system_message, is_current, created_by, created_at)
          VALUES (?, 1, ?, ?, 1, 'system', NOW())
        `, [templateId, template.prompt_content, template.system_message]);
        
        createdTemplates.push({
          templateId,
          name: template.name,
          category: template.category
        });
        
        console.log(`✅ Created template: ${template.name} (${template.category})`);
        
      } catch (error) {
        console.error(`❌ Failed to create template ${template.name}:`, error.message);
      }
    }
    
    console.log(`🎉 Initialized ${createdTemplates.length} default templates for account ${accountId}`);
    
    res.json({
      success: true,
      message: `Successfully created ${createdTemplates.length} default prompt templates`,
      templates: createdTemplates,
      accountId
    });
    
  } catch (error) {
    console.error('❌ Error initializing default templates:', error.message);
    res.status(500).json({ error: error.message });
  }
});