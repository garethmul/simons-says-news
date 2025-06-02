import jobManager from './jobManager.js';
import contentGenerator from './contentGenerator.js';
import newsAggregator from './newsAggregator.js';
import aiService from './aiService.js';
import db from './database.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
    
    // Clean up any stale jobs from previous sessions
    this.cleanupStaleJobs();
    
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
    
    // Create job-specific logger
    const jobLogger = global.createJobLogger ? global.createJobLogger(job.job_id, job.account_id) : {
      info: console.log,
      warn: console.warn, 
      error: console.error,
      debug: console.log
    };
    
    jobLogger.info(`🔄 Processing job ${job.job_id} (${job.job_type}) for account ${job.account_id}`);

    try {
      // MySQL JSON columns return objects directly
      const payload = job.payload || {};
      jobLogger.debug(`📋 Job ${job.job_id} payload:`, payload);
      
      let results = null;

      switch (job.job_type) {
        case 'content_generation':
          results = await this.processContentGeneration(job.job_id, payload, jobLogger);
          break;
        case 'full_cycle':
          results = await this.processFullCycle(job.job_id, payload, jobLogger);
          break;
        case 'news_aggregation':
          results = await this.processNewsAggregation(job.job_id, payload, jobLogger);
          break;
        case 'ai_analysis':
          results = await this.processAiAnalysis(job.job_id, payload, jobLogger);
          break;
        case 'url_analysis':
          results = await this.processUrlAnalysis(job.job_id, payload, jobLogger);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      await jobManager.completeJob(job.job_id, results);
      jobLogger.info(`✅ Job ${job.job_id} completed successfully`);

    } catch (error) {
      jobLogger.error(`❌ Job ${job.job_id} failed: ${error.message}`);
      await jobManager.failJob(job.job_id, error.message);
    } finally {
      this.currentJob = null;
    }
  }

  // Process content generation job
  async processContentGeneration(jobId, payload, jobLogger) {
    await jobManager.updateJobProgress(jobId, 10, 'Starting content generation...');

    const { specificStoryId, limit = 5 } = payload;
    
    // Get the job to access account_id
    const job = await jobManager.getJob(jobId);
    const accountId = job?.account_id;
    
    let results;

    if (specificStoryId) {
      // Generate content for specific story
      await jobManager.updateJobProgress(jobId, 20, 'Finding story...');
      
      const story = await db.findOne('ssnews_scraped_articles', 'article_id = ?', [specificStoryId]);
      if (!story) {
        throw new Error(`Story not found: ${specificStoryId}`);
      }

      await jobManager.updateJobProgress(jobId, 30, 'Generating content for story...');
      
      const generatedContent = await contentGenerator.generateContentForStory(story, accountId);
      
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
      
      const generatedContent = await contentGenerator.generateContentFromTopStories(limit, accountId);
      
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
  async processFullCycle(jobId, payload, jobLogger) {
    await jobManager.updateJobProgress(jobId, 5, 'Starting full automation cycle...');

    // Get the job to access account_id
    const job = await jobManager.getJob(jobId);
    const accountId = job?.account_id;

    const results = {};

    // Step 1: News Aggregation
    await jobManager.updateJobProgress(jobId, 10, 'Aggregating news from sources...');
    
    const articlesAggregated = await newsAggregator.aggregateAllSources(accountId);
    results.articlesAggregated = articlesAggregated;
    
    await jobManager.updateJobProgress(jobId, 35, `Aggregated ${articlesAggregated} articles`);

    // Step 2: AI Analysis
    await jobManager.updateJobProgress(jobId, 40, 'Running AI analysis on articles...');
    
    const articlesAnalyzed = await newsAggregator.analyzeScrapedArticles(20, accountId);
    results.articlesAnalyzed = articlesAnalyzed;
    
    await jobManager.updateJobProgress(jobId, 65, `Analyzed ${articlesAnalyzed} articles`);

    // Step 3: Content Generation
    await jobManager.updateJobProgress(jobId, 70, 'Generating content from top stories...');
    
    const generatedContent = await contentGenerator.generateContentFromTopStories(5, accountId);
    results.contentGenerated = generatedContent.length;
    results.blogIds = generatedContent.map(c => c.blogId);
    
    await jobManager.updateJobProgress(jobId, 95, `Generated ${generatedContent.length} content pieces`);

    results.completedAt = new Date();
    
    return results;
  }

  // Process news aggregation job
  async processNewsAggregation(jobId, payload, jobLogger) {
    await jobManager.updateJobProgress(jobId, 10, 'Starting news aggregation...');

    const { sourceName, sourceId, singleSource } = payload;
    
    // Get the job to access account_id
    const job = await jobManager.getJob(jobId);
    const accountId = job?.account_id;
    
    let results;

    if (singleSource && sourceId) {
      // Handle single source refresh (new functionality)
      jobLogger.info(`🔄 Processing single source refresh: ${sourceName} (ID: ${sourceId}) for account ${accountId}`);
      
      if (!accountId) {
        throw new Error('Job missing account_id - cannot process source refresh');
      }
      
      // Get the source details
      const source = await db.findOne(
        'ssnews_news_sources', 
        'source_id = ? AND account_id = ?', 
        [sourceId, accountId]
      );
      
      if (!source) {
        throw new Error(`Source not found: ${sourceName} (ID: ${sourceId}) in account ${accountId}`);
      }
      
      if (!source.is_active) {
        jobLogger.warn(`⚠️ Source "${sourceName}" is currently disabled but processing anyway`);
      }
      
      await jobManager.updateJobProgress(jobId, 30, `Processing articles from ${sourceName}...`);
      
      // Process the single source
      const articles = await newsAggregator.processSource(source, accountId);
      
      // Update last scraped timestamp - handle potential database errors
      try {
        await db.updateSourceLastScraped(source.source_id, accountId);
      } catch (updateError) {
        jobLogger.warn(`⚠️ Failed to update last_checked timestamp: ${updateError.message}`);
        // Don't fail the job for this
      }
      
      jobLogger.info(`✅ Source refresh complete: ${articles.length} articles found from ${sourceName}`);
      
      results = {
        articlesFound: articles.length,
        articlesAggregated: articles.length, // For compatibility with existing news_aggregation structure
        sourceId,
        sourceName,
        sourceType: source.rss_feed_url ? 'RSS' : 'Web Scraping',
        singleSource: true,
        accountId
      };
      
    } else if (sourceName) {
      // Aggregate from specific source (existing functionality)
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
      // Aggregate from all sources (existing functionality)
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
  async processAiAnalysis(jobId, payload, jobLogger) {
    await jobManager.updateJobProgress(jobId, 10, 'Starting AI analysis...');
    jobLogger.info('🧠 Starting AI analysis job');

    const { limit = 20 } = payload;
    
    // Get the job to access account_id
    const job = await jobManager.getJob(jobId);
    const accountId = job?.account_id;
    
    jobLogger.info(`📊 Will analyze up to ${limit} articles for account ${accountId}`);
    await jobManager.updateJobProgress(jobId, 30, `Analyzing ${limit} articles for account ${accountId}...`);
    
    try {
      const analyzed = await newsAggregator.analyzeScrapedArticles(limit, accountId);
      
      jobLogger.info(`✅ Analysis complete: ${analyzed} articles analyzed`);
      await jobManager.updateJobProgress(jobId, 90, 'AI analysis complete');
      
      return {
        articlesAnalyzed: analyzed,
        limit,
        accountId
      };
    } catch (error) {
      jobLogger.error(`❌ AI analysis failed: ${error.message}`);
      throw error;
    }
  }

  // Process URL analysis job
  async processUrlAnalysis(jobId, payload, jobLogger) {
    await jobManager.updateJobProgress(jobId, 10, 'Starting URL analysis...');
    
    const { articleId, url, sourceId } = payload;
    
    // Get the job to access account_id
    const job = await jobManager.getJob(jobId);
    const accountId = job?.account_id;
    
    if (!articleId || !url) {
      throw new Error('Missing articleId or url in job payload');
    }
    
    jobLogger.info(`🔗 Analyzing submitted URL: ${url}`);
    
    try {
      // Get the article record
      await jobManager.updateJobProgress(jobId, 20, 'Fetching article content...');
      
      const article = await db.findOne(
        'ssnews_scraped_articles',
        'article_id = ? AND account_id = ?',
        [articleId, accountId]
      );
      
      if (!article) {
        throw new Error(`Article not found: ${articleId} in account ${accountId}`);
      }
      
      // Scrape the URL to get content
      await jobManager.updateJobProgress(jobId, 40, 'Scraping article content...');
      
      try {
        const response = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Eden Content Bot 1.0 (https://eden.co.uk)'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract title, content, and other metadata
        let title = $('h1').first().text().trim() || 
                   $('title').text().trim() || 
                   'Untitled Article';
        
        // Clean up title by removing site name suffixes
        title = title.replace(/ - [^-]+$/, '').trim();
        
        // Extract content from various selectors
        const contentSelectors = [
          'article',
          '.content',
          '.post-content',
          '.entry-content',
          '.article-content',
          '[class*="content"]',
          'main',
          '.main'
        ];
        
        let content = '';
        for (const selector of contentSelectors) {
          const contentEl = $(selector);
          if (contentEl.length > 0) {
            // Remove script, style, nav, footer elements
            contentEl.find('script, style, nav, footer, .nav, .navigation, .sidebar').remove();
            content = contentEl.text().trim();
            if (content.length > 500) { // Use this selector if we get substantial content
              break;
            }
          }
        }
        
        // Fallback to body content if no specific content area found
        if (content.length < 200) {
          $('script, style, nav, footer, header, .nav, .navigation, .sidebar').remove();
          content = $('body').text().trim();
        }
        
        // Extract publication date
        let pubDate = $('meta[property="article:published_time"]').attr('content') ||
                     $('meta[name="publish-date"]').attr('content') ||
                     $('time').attr('datetime') ||
                     $('[class*="date"]').first().text().trim();
        
        // Try to parse the date
        let publicationDate = new Date();
        if (pubDate) {
          const parsedDate = new Date(pubDate);
          if (!isNaN(parsedDate.getTime())) {
            publicationDate = parsedDate;
          }
        }
        
        // Update the article with scraped content
        await jobManager.updateJobProgress(jobId, 60, 'Updating article with scraped content...');
        
        await db.update(
          'ssnews_scraped_articles',
          {
            title: title.substring(0, 255), // Ensure it fits in the column
            full_text: content.substring(0, 10000), // Limit content length
            publication_date: publicationDate,
            updated_at: new Date()
          },
          'article_id = ? AND account_id = ?',
          [articleId, accountId]
        );
        
        jobLogger.info(`✅ Content scraped successfully for ${url}`);
        
      } catch (scrapingError) {
        jobLogger.warn(`⚠️ Failed to scrape content from ${url}: ${scrapingError.message}`);
        // Still continue with AI analysis even if scraping fails
      }
      
      // Run AI analysis on the article
      await jobManager.updateJobProgress(jobId, 70, 'Running AI analysis...');
      
      // Get the updated article
      const updatedArticle = await db.findOne(
        'ssnews_scraped_articles',
        'article_id = ? AND account_id = ?',
        [articleId, accountId]
      );
      
      if (updatedArticle && updatedArticle.full_text && updatedArticle.full_text.length > 100) {
        try {
          // Run AI analysis using the existing news aggregator method
          const analysisResult = await aiService.analyzeArticle(updatedArticle);
          
          if (analysisResult) {
            // Update article with AI analysis results
            await db.update(
              'ssnews_scraped_articles',
              {
                summary_ai: analysisResult.summary,
                keywords_ai: analysisResult.keywords,
                relevance_score: analysisResult.relevanceScore,
                status: 'analyzed',
                updated_at: new Date()
              },
              'article_id = ? AND account_id = ?',
              [articleId, accountId]
            );
            
            jobLogger.info(`✅ AI analysis completed for article ${articleId}`);
          }
        } catch (analysisError) {
          jobLogger.warn(`⚠️ AI analysis failed for ${url}: ${analysisError.message}`);
          // Don't fail the job if AI analysis fails
        }
      } else {
        jobLogger.warn(`⚠️ Insufficient content for AI analysis: ${url}`);
      }
      
      await jobManager.updateJobProgress(jobId, 90, 'URL analysis complete');
      
      return {
        url,
        articleId,
        contentLength: updatedArticle?.full_text?.length || 0,
        title: updatedArticle?.title || 'Unknown',
        analysisComplete: true,
        accountId
      };
      
    } catch (error) {
      jobLogger.error(`❌ URL analysis failed for ${url}: ${error.message}`);
      
      // Mark article as failed
      try {
        await db.update(
          'ssnews_scraped_articles',
          {
            title: `Failed to process: ${url}`,
            status: 'failed',
            updated_at: new Date()
          },
          'article_id = ? AND account_id = ?',
          [articleId, accountId]
        );
      } catch (updateError) {
        jobLogger.error(`❌ Failed to update article status: ${updateError.message}`);
      }
      
      throw error;
    }
  }

  // Clean up jobs that were left in "processing" state from previous worker sessions
  async cleanupStaleJobs() {
    try {
      console.log('🧹 Checking for stale jobs from previous sessions...');
      
      const staleJobs = await jobManager.getStaleJobs(5); // Jobs processing for more than 5 minutes
      
      if (staleJobs.length > 0) {
        console.log(`🧹 Found ${staleJobs.length} stale jobs, marking as failed...`);
        
        for (const job of staleJobs) {
          await jobManager.markJobAsStale(job.job_id, `Job timeout: Was processing when worker restarted. Processing for ${job.minutes_processing} minutes.`);
          console.log(`🧹 Marked job #${job.job_id} (${job.job_type}) as failed - was processing for ${job.minutes_processing} minutes`);
        }
      } else {
        console.log('🧹 No stale jobs found');
      }
    } catch (error) {
      console.error('❌ Error cleaning up stale jobs:', error.message);
    }
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