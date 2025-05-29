import jobManager from './jobManager.js';
import contentGenerator from './contentGenerator.js';
import newsAggregator from './newsAggregator.js';
import db from './database.js';

class JobWorker {
  constructor() {
    this.isRunning = false;
    this.currentJob = null;
    this.pollInterval = 5000; // Poll every 5 seconds
    this.pollTimer = null;
  }

  // Start the worker
  start() {
    if (this.isRunning) {
      console.log('⚠️ Worker already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Job worker started');
    this.poll();
  }

  // Stop the worker
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Worker not running');
      return;
    }

    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    console.log('🛑 Job worker stopped');
  }

  // Poll for new jobs
  async poll() {
    if (!this.isRunning) return;

    try {
      const job = await jobManager.getNextJob();
      
      if (job) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error('❌ Error in worker poll:', error.message);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.pollTimer = setTimeout(() => this.poll(), this.pollInterval);
    }
  }

  // Process a single job
  async processJob(job) {
    const claimed = await jobManager.claimJob(job.job_id);
    if (!claimed) {
      console.log(`⚠️ Job ${job.job_id} already claimed by another worker`);
      return;
    }

    this.currentJob = job;
    console.log(`🔄 Processing job ${job.job_id} (${job.job_type})`);

    try {
      // MySQL JSON columns return objects directly
      const payload = job.payload || {};
      console.log(`📋 Job ${job.job_id} payload:`, payload);
      
      let results = null;

      switch (job.job_type) {
        case 'content_generation':
          results = await this.processContentGeneration(job.job_id, payload);
          break;
        case 'full_cycle':
          results = await this.processFullCycle(job.job_id, payload);
          break;
        case 'news_aggregation':
          results = await this.processNewsAggregation(job.job_id, payload);
          break;
        case 'ai_analysis':
          results = await this.processAiAnalysis(job.job_id, payload);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      await jobManager.completeJob(job.job_id, results);
      console.log(`✅ Job ${job.job_id} completed successfully`);

    } catch (error) {
      console.error(`❌ Job ${job.job_id} failed:`, error.message);
      await jobManager.failJob(job.job_id, error.message);
    } finally {
      this.currentJob = null;
    }
  }

  // Process content generation job
  async processContentGeneration(jobId, payload) {
    await jobManager.updateJobProgress(jobId, 10, 'Starting content generation...');

    const { specificStoryId, limit = 5 } = payload;
    let results;

    if (specificStoryId) {
      // Generate content for specific story
      await jobManager.updateJobProgress(jobId, 20, 'Finding story...');
      
      const story = await db.findOne('ssnews_scraped_articles', 'article_id = ?', [specificStoryId]);
      if (!story) {
        throw new Error(`Story not found: ${specificStoryId}`);
      }

      await jobManager.updateJobProgress(jobId, 30, 'Generating content for story...');
      
      const generatedContent = await contentGenerator.generateContentForStory(story);
      
      await jobManager.updateJobProgress(jobId, 90, 'Content generation complete');
      
      results = {
        contentGenerated: 1,
        blogId: generatedContent.blogId,
        specificStoryId,
        storyTitle: story.title
      };

    } else {
      // Generate content from top stories
      await jobManager.updateJobProgress(jobId, 20, 'Finding top stories...');
      
      const generatedContent = await contentGenerator.generateContentFromTopStories(limit);
      
      await jobManager.updateJobProgress(jobId, 90, `Generated ${generatedContent.length} content pieces`);
      
      results = {
        contentGenerated: generatedContent.length,
        blogIds: generatedContent.map(c => c.blogId),
        limit
      };
    }

    return results;
  }

  // Process full cycle job
  async processFullCycle(jobId, payload) {
    await jobManager.updateJobProgress(jobId, 5, 'Starting full automation cycle...');

    const results = {};

    // Step 1: News Aggregation
    await jobManager.updateJobProgress(jobId, 10, 'Aggregating news from sources...');
    
    const articlesAggregated = await newsAggregator.aggregateAllSources();
    results.articlesAggregated = articlesAggregated;
    
    await jobManager.updateJobProgress(jobId, 35, `Aggregated ${articlesAggregated} articles`);

    // Step 2: AI Analysis
    await jobManager.updateJobProgress(jobId, 40, 'Running AI analysis on articles...');
    
    const articlesAnalyzed = await newsAggregator.analyzeScrapedArticles();
    results.articlesAnalyzed = articlesAnalyzed;
    
    await jobManager.updateJobProgress(jobId, 65, `Analyzed ${articlesAnalyzed} articles`);

    // Step 3: Content Generation
    await jobManager.updateJobProgress(jobId, 70, 'Generating content from top stories...');
    
    const generatedContent = await contentGenerator.generateContentFromTopStories(5);
    results.contentGenerated = generatedContent.length;
    results.blogIds = generatedContent.map(c => c.blogId);
    
    await jobManager.updateJobProgress(jobId, 95, `Generated ${generatedContent.length} content pieces`);

    results.completedAt = new Date();
    
    return results;
  }

  // Process news aggregation job
  async processNewsAggregation(jobId, payload) {
    await jobManager.updateJobProgress(jobId, 10, 'Starting news aggregation...');

    const { sourceName } = payload;
    let results;

    if (sourceName) {
      // Aggregate from specific source
      const source = await db.findOne('ssnews_news_sources', 'name = ?', [sourceName]);
      if (!source) {
        throw new Error(`Source not found: ${sourceName}`);
      }

      await jobManager.updateJobProgress(jobId, 30, `Aggregating from ${sourceName}...`);
      
      const articles = await newsAggregator.processSource(source);
      
      results = {
        articlesAggregated: articles.length,
        sourceName
      };
    } else {
      // Aggregate from all sources
      await jobManager.updateJobProgress(jobId, 30, 'Aggregating from all sources...');
      
      const totalArticles = await newsAggregator.aggregateAllSources();
      
      results = {
        articlesAggregated: totalArticles
      };
    }

    await jobManager.updateJobProgress(jobId, 90, 'News aggregation complete');
    
    return results;
  }

  // Process AI analysis job
  async processAiAnalysis(jobId, payload) {
    await jobManager.updateJobProgress(jobId, 10, 'Starting AI analysis...');

    const { limit = 20 } = payload;
    
    await jobManager.updateJobProgress(jobId, 30, `Analyzing ${limit} articles...`);
    
    const analyzed = await newsAggregator.analyzeScrapedArticles(limit);
    
    await jobManager.updateJobProgress(jobId, 90, 'AI analysis complete');
    
    return {
      articlesAnalyzed: analyzed,
      limit
    };
  }

  // Get worker status
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentJob: this.currentJob ? {
        job_id: this.currentJob.job_id,
        job_type: this.currentJob.job_type,
        created_at: this.currentJob.created_at
      } : null,
      workerId: jobManager.workerId
    };
  }
}

// Create singleton instance
const jobWorker = new JobWorker();

export default jobWorker; 