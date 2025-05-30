import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORTS } from './ports.config.js';

// Project Eden services
import db from './src/services/database.js';
import newsAggregator from './src/services/newsAggregator.js';
import contentGenerator from './src/services/contentGenerator.js';
import aiService from './src/services/aiService.js';
import imageService from './src/services/imageService.js';
import PromptManager from './src/services/promptManager.js';
import jobManager from './src/services/jobManager.js';
import jobWorker from './src/services/jobWorker.js';

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
      newsAggregation: true
    }
  });
});

// Project Eden API endpoints

// News aggregation endpoints
app.post('/api/eden/news/aggregate', async (req, res) => {
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

app.post('/api/eden/news/analyze', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    console.log('🧠 Manual news analysis triggered');
    const analyzed = await newsAggregator.analyzeScrapedArticles();
    
    res.json({
      success: true,
      message: `Analyzed ${analyzed} articles`,
      analyzed
    });
  } catch (error) {
    console.error('❌ News analysis failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/eden/news/top-stories', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const minScore = parseFloat(req.query.minScore) || 0.6;
    
    const topStories = await newsAggregator.getTopStories(limit, minScore);
    
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

app.get('/api/eden/news/sources/status', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const status = await newsAggregator.getSourceStatus();
    
    res.json({
      success: true,
      sources: status
    });
  } catch (error) {
    console.error('❌ Error getting source status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update news source RSS feed URL
app.put('/api/eden/news/sources/:sourceName/rss', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { sourceName } = req.params;
    const { rss_feed_url } = req.body;

    if (!rss_feed_url) {
      return res.status(400).json({ error: 'RSS feed URL is required' });
    }

    // Update the RSS feed URL in the database
    const result = await db.update(
      'ssnews_news_sources',
      { rss_feed_url },
      'name = ?',
      [sourceName]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json({
      success: true,
      message: `RSS feed URL updated for ${sourceName}`
    });
  } catch (error) {
    console.error('❌ Error updating RSS feed URL:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update news source status (enable/disable)
app.put('/api/eden/news/sources/:sourceId/status', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { sourceId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean value' });
    }

    // Update the source status in the database
    const result = await db.update(
      'ssnews_news_sources',
      { is_active },
      'source_id = ?',
      [sourceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    console.log(`✅ Source ${sourceId} status updated to ${is_active ? 'active' : 'inactive'}`);

    res.json({
      success: true,
      message: `Source status updated to ${is_active ? 'active' : 'inactive'}`
    });
  } catch (error) {
    console.error('❌ Error updating source status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Content generation endpoints
app.post('/api/eden/content/generate', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const limit = parseInt(req.body.limit) || 5;
    const specificStoryId = req.body.specificStoryId;
    
    console.log(`🎨 Creating content generation job (limit: ${limit}${specificStoryId ? `, specific story: ${specificStoryId}` : ''})`);
    
    // Create job instead of processing synchronously
    const jobPayload = { limit };
    if (specificStoryId) {
      jobPayload.specificStoryId = specificStoryId;
    }
    
    const jobId = await jobManager.createJob(
      'content_generation',
      jobPayload,
      1, // priority
      'user'
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

app.post('/api/eden/content/generate-evergreen', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { category, count = 1 } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    console.log(`🌲 Evergreen content generation triggered (category: ${category})`);
    const generatedContent = await contentGenerator.generateEvergreenContent(category, count);
    
    res.json({
      success: true,
      message: `Generated ${generatedContent.length} evergreen content pieces`,
      content: generatedContent
    });
  } catch (error) {
    console.error('❌ Evergreen content generation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/eden/content/review', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const statusParam = req.query.status || 'draft';
    const limit = parseInt(req.query.limit) || 20;
    
    // Handle multiple statuses separated by commas
    const statuses = statusParam.split(',').map(s => s.trim());
    
    let content = [];
    for (const status of statuses) {
      const statusContent = await contentGenerator.getContentForReview(status, limit);
      content = content.concat(statusContent);
    }
    
    // Remove duplicates and limit results
    const uniqueContent = content.filter((item, index, self) => 
      index === self.findIndex(t => t.gen_article_id === item.gen_article_id)
    ).slice(0, limit);
    
    res.json({
      success: true,
      content: uniqueContent,
      count: uniqueContent.length
    });
  } catch (error) {
    console.error('❌ Error fetching content for review:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/eden/content/:contentType/:contentId/status', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { contentType, contentId } = req.params;
    const { status, finalContent } = req.body;
    
    if (!['article', 'social', 'video'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    await contentGenerator.updateContentStatus(
      parseInt(contentId), 
      contentType, 
      status, 
      finalContent
    );
    
    res.json({
      success: true,
      message: `${contentType} ${contentId} status updated to ${status}`
    });
  } catch (error) {
    console.error('❌ Error updating content status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Image service endpoints
app.get('/api/eden/images/search', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { query, count = 5 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const images = await imageService.searchAndValidateImages(query, parseInt(count));
    
    res.json({
      success: true,
      images,
      count: images.length
    });
  } catch (error) {
    console.error('❌ Image search failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// System status and stats endpoints
app.get('/api/eden/stats/generation', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const stats = await contentGenerator.getGenerationStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error getting generation stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/eden/stats/images', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const stats = await imageService.getImageStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error getting image stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== USER BOOKMARKS API ENDPOINTS =====

// Get user's bookmarked articles
app.get('/api/eden/bookmarks', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get all bookmarked article IDs for the user
    const bookmarks = await db.query(`
      SELECT 
        b.bookmark_id,
        b.article_id,
        b.bookmarked_at,
        a.title,
        a.url,
        a.publication_date,
        a.summary_ai,
        a.keywords_ai,
        a.relevance_score,
        s.name as source_name
      FROM ssnews_user_bookmarks b
      JOIN ssnews_scraped_articles a ON b.article_id = a.article_id
      JOIN ssnews_news_sources s ON a.source_id = s.source_id
      WHERE b.user_id = ?
      ORDER BY b.bookmarked_at DESC
    `, [userId]);

    res.json({
      success: true,
      bookmarks
    });
  } catch (error) {
    console.error('❌ Error fetching bookmarks:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Add a bookmark
app.post('/api/eden/bookmarks', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { userId, userEmail, articleId } = req.body;
    
    if (!userId || !articleId) {
      return res.status(400).json({ error: 'User ID and Article ID are required' });
    }

    // Check if bookmark already exists
    const existing = await db.findOne(
      'ssnews_user_bookmarks',
      'user_id = ? AND article_id = ?',
      [userId, articleId]
    );

    if (existing) {
      return res.json({
        success: true,
        message: 'Bookmark already exists',
        bookmarkId: existing.bookmark_id
      });
    }

    // Insert new bookmark
    const bookmarkId = await db.insert('ssnews_user_bookmarks', {
      user_id: userId,
      user_email: userEmail || null,
      article_id: articleId
    });

    console.log(`⭐ User ${userId} bookmarked article ${articleId}`);

    res.json({
      success: true,
      message: 'Bookmark added successfully',
      bookmarkId
    });
  } catch (error) {
    console.error('❌ Error adding bookmark:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Remove a bookmark
app.delete('/api/eden/bookmarks', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { userId, articleId } = req.query;
    
    if (!userId || !articleId) {
      return res.status(400).json({ error: 'User ID and Article ID are required' });
    }

    const result = await db.query(
      'DELETE FROM ssnews_user_bookmarks WHERE user_id = ? AND article_id = ?',
      [userId, articleId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    console.log(`⭐ User ${userId} removed bookmark for article ${articleId}`);

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
app.get('/api/eden/bookmarks/ids', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const bookmarks = await db.query(
      'SELECT article_id FROM ssnews_user_bookmarks WHERE user_id = ?',
      [userId]
    );

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

function logToDatabase(level, message, metadata = null) {
  // Don't await this to avoid blocking the main thread
  if (isSystemReady && db) {
    db.insertLog(level, message, 'server', metadata).catch(() => {
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
    metadata
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

// Server-Sent Events endpoint for real-time logs
app.get('/api/eden/logs/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    // Send recent logs immediately from database
    if (isSystemReady && db) {
      const recentLogs = await db.getLogs(50); // Get last 50 logs
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
app.get('/api/eden/logs/history', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const limit = parseInt(req.query.limit) || 100;
    const level = req.query.level; // optional filter by level
    const source = req.query.source; // optional filter by source
    
    const logs = await db.getLogs(limit, level, source);
    
    res.json({
      success: true,
      logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Error fetching log history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear logs endpoint
app.delete('/api/eden/logs', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const olderThanDays = req.query.olderThanDays ? parseInt(req.query.olderThanDays) : null;
    const deletedCount = await db.clearLogs(olderThanDays);
    
    res.json({ 
      success: true, 
      message: `Cleared ${deletedCount} log entries`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get log statistics endpoint
app.get('/api/eden/logs/stats', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const stats = await db.getLogStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Server-Sent Events endpoint for progress updates
app.get('/api/eden/automate/progress', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send current progress immediately
  res.write(`data: ${JSON.stringify(automationProgress)}\n\n`);

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify(automationProgress)}\n\n`);
  }, 5000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
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
app.post('/api/eden/automate/full-cycle', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    console.log('🤖 Creating full automation cycle job');
    
    // Create job instead of using old progress tracking
    const jobId = await jobManager.createJob(
      'full_cycle',
      {}, // no specific parameters needed
      5, // high priority
      'user'
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

// Reset automation progress endpoint
app.post('/api/eden/automate/reset', async (req, res) => {
  try {
    automationProgress = {
      isRunning: false,
      currentStep: '',
      progress: 0,
      totalSteps: 3,
      stepDetails: '',
      startTime: null,
      results: {}
    };
    
    res.json({ success: true, message: 'Automation progress reset' });
  } catch (error) {
    console.error('❌ Error resetting automation progress:', error);
    res.status(500).json({ error: 'Failed to reset automation progress' });
  }
});

async function runFullCycleAsync() {
  try {
    // Step 1: Aggregate news
    updateProgress('Aggregating News', 10, 'Fetching articles from news sources...');
    console.log('📰 Step 1: Aggregating news...');
    const totalArticles = await newsAggregator.aggregateAllSources();
    updateProgress('Aggregating News', 33, `Aggregated ${totalArticles} articles`, { articlesAggregated: totalArticles });
    
    // Step 2: Analyze articles
    updateProgress('Analyzing Articles', 40, 'Running AI analysis on scraped articles...');
    console.log('🧠 Step 2: Analyzing articles...');
    const analyzed = await newsAggregator.analyzeScrapedArticles();
    updateProgress('Analyzing Articles', 66, `Analyzed ${analyzed} articles with AI`, { articlesAnalyzed: analyzed });
    
    // Step 3: Generate content
    updateProgress('Generating Content', 70, 'Creating blog posts, social content, and video scripts...');
    console.log('🎨 Step 3: Generating content...');
    const generatedContent = await contentGenerator.generateContentFromTopStories(5);
    updateProgress('Generating Content', 90, `Generated ${generatedContent.length} content pieces`);
    
    // Complete
    updateProgress('Complete', 100, 'Automation cycle completed successfully!', {
      articlesAggregated: totalArticles,
      articlesAnalyzed: analyzed,
      contentGenerated: generatedContent.length,
      completedAt: new Date()
    });

    // Reset after 30 seconds
    setTimeout(() => {
      automationProgress.isRunning = false;
      console.log('✅ Automation cycle finished - ready for next cycle');
    }, 30000);

  } catch (error) {
    console.error('❌ Full automation cycle failed:', error.message);
    updateProgress('Error', 0, `Failed: ${error.message}`);
    automationProgress.isRunning = false;
  }
}

// ===== PROMPT MANAGEMENT API ENDPOINTS =====

// Get all prompt templates
app.get('/api/eden/prompts/templates', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const templates = await promptManager.getAllTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    console.error('❌ Error fetching prompt templates:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get specific template with current version
app.get('/api/eden/prompts/templates/:templateId', async (req, res) => {
  try {
    if (!isSystemReady || !promptManager) {
      return res.status(503).json({ error: 'System not ready' });
    }
    
    const { templateId } = req.params;
    const template = await promptManager.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ success: true, template });
  } catch (error) {
    console.error('❌ Error fetching prompt template:', error);
    res.status(500).json({ error: 'Failed to fetch prompt template' });
  }
});

// Get all versions for a template
app.get('/api/eden/prompts/templates/:templateId/versions', async (req, res) => {
  try {
    if (!isSystemReady || !promptManager) {
      return res.status(503).json({ error: 'System not ready' });
    }
    
    const { templateId } = req.params;
    const versions = await promptManager.getTemplateVersions(templateId);
    res.json({ success: true, versions });
  } catch (error) {
    console.error('❌ Error fetching template versions:', error);
    res.status(500).json({ error: 'Failed to fetch template versions' });
  }
});

// Create new template version
app.post('/api/eden/prompts/templates/:templateId/versions', async (req, res) => {
  try {
    if (!isSystemReady || !promptManager) {
      return res.status(503).json({ error: 'System not ready' });
    }
    
    const { templateId } = req.params;
    const { promptContent, systemMessage, parameters, notes, createdBy } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }
    
    const result = await promptManager.createTemplateVersion(
      templateId, 
      promptContent, 
      systemMessage, 
      parameters, 
      createdBy || 'user', 
      notes || ''
    );
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error creating template version:', error);
    res.status(500).json({ error: 'Failed to create template version' });
  }
});

// Set current version for a template
app.put('/api/eden/prompts/templates/:templateId/versions/:versionId/current', async (req, res) => {
  try {
    if (!isSystemReady || !promptManager) {
      return res.status(503).json({ error: 'System not ready' });
    }
    
    const { templateId, versionId } = req.params;
    await promptManager.setCurrentVersion(templateId, versionId);
    res.json({ success: true, message: 'Current version updated' });
  } catch (error) {
    console.error('❌ Error setting current version:', error);
    res.status(500).json({ error: 'Failed to set current version' });
  }
});

// Test a prompt with sample variables
app.post('/api/eden/prompts/templates/:templateId/versions/:versionId/test', async (req, res) => {
  try {
    if (!isSystemReady || !promptManager) {
      return res.status(503).json({ error: 'System not ready' });
    }
    
    const { templateId, versionId } = req.params;
    const { testVariables } = req.body;
    
    const result = await promptManager.testPrompt(templateId, versionId, testVariables || {});
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error testing prompt:', error);
    res.status(500).json({ error: 'Failed to test prompt' });
  }
});

// Get generation history for a template
app.get('/api/eden/prompts/templates/:templateId/history', async (req, res) => {
  try {
    if (!isSystemReady || !promptManager) {
      return res.status(503).json({ error: 'System not ready' });
    }
    
    const { templateId } = req.params;
    const { limit } = req.query;
    
    const history = await promptManager.getGenerationHistory(templateId, parseInt(limit) || 50);
    res.json({ success: true, history });
  } catch (error) {
    console.error('❌ Error fetching generation history:', error);
    res.status(500).json({ error: 'Failed to fetch generation history' });
  }
});

// Get usage statistics for a template
app.get('/api/eden/prompts/templates/:templateId/stats', async (req, res) => {
  try {
    if (!isSystemReady || !promptManager) {
      return res.status(503).json({ error: 'System not ready' });
    }
    
    const { templateId } = req.params;
    const stats = await promptManager.getUsageStats(templateId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error fetching usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

// Create new prompt template
app.post('/api/eden/prompts/templates', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { name, category, description, promptContent, systemMessage, createdBy } = req.body;
    
    if (!name || !category || !promptContent) {
      return res.status(400).json({ error: 'Name, category, and prompt content are required' });
    }

    const templateId = await promptManager.createTemplate({
      name,
      category,
      description: description || '',
      promptContent,
      systemMessage: systemMessage || '',
      createdBy: createdBy || 'user'
    });

    res.json({ success: true, templateId });
  } catch (error) {
    console.error('❌ Error creating prompt template:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== END PROMPT MANAGEMENT API ENDPOINTS =====

// ===== JOB MANAGEMENT API ENDPOINTS =====

// Get job queue status and statistics
app.get('/api/eden/jobs/queue/stats', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const stats = await jobManager.getQueueStats();
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
app.get('/api/eden/jobs/recent', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const jobs = await jobManager.getRecentJobs(limit);
    
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
app.get('/api/eden/jobs/status/:status', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { status } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!['queued', 'processing', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const jobs = await jobManager.getJobsByStatus(status, limit);
    
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
app.get('/api/eden/jobs/:jobId', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { jobId } = req.params;
    const job = await jobManager.getJob(parseInt(jobId));
    
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

// Cancel a job
app.post('/api/eden/jobs/:jobId/cancel', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { jobId } = req.params;
    await jobManager.cancelJob(parseInt(jobId));
    
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
app.post('/api/eden/jobs/:jobId/retry', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const { jobId } = req.params;
    await jobManager.retryJob(parseInt(jobId));
    
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
app.get('/api/eden/jobs/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    // Send current queue stats immediately
    const stats = await jobManager.getQueueStats();
    const recentJobs = await jobManager.getRecentJobs(5);
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

  // Send updates every 5 seconds
  const updateInterval = setInterval(async () => {
    try {
      const stats = await jobManager.getQueueStats();
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
  }, 5000);

  req.on('close', () => {
    clearInterval(updateInterval);
  });

  req.on('error', () => {
    clearInterval(updateInterval);
  });
});

// Worker control endpoints
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
app.delete('/api/eden/jobs/cleanup', async (req, res) => {
  try {
    if (!isSystemReady) {
      return res.status(503).json({ error: 'System not ready' });
    }

    const daysOld = parseInt(req.query.daysOld) || 7;
    const deletedCount = await jobManager.cleanupOldJobs(daysOld);
    
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

// ===== END JOB MANAGEMENT API ENDPOINTS =====

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