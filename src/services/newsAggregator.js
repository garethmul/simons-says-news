import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import db from './database.js';
import aiService from './aiService.js';

class NewsAggregator {
  constructor() {
    this.rssParser = new Parser({
      timeout: 30000,
      headers: {
        'User-Agent': 'Eden Content Bot 1.0 (https://eden.co.uk)'
      }
    });

    this.axiosConfig = {
      timeout: 30000,
      headers: {
        'User-Agent': 'Eden Content Bot 1.0 (https://eden.co.uk)'
      }
    };
  }

  async aggregateAllSources() {
    console.log('🔄 Starting news aggregation...');
    
    try {
      const sources = await db.getActiveNewsSources();
      console.log(`📰 Found ${sources.length} active news sources`);

      let totalArticles = 0;
      
      for (const source of sources) {
        try {
          console.log(`📡 Processing: ${source.name}`);
          const articles = await this.processSource(source);
          totalArticles += articles.length;
          
          // Update last scraped timestamp
          await db.updateSourceLastScraped(source.source_id);
          
          console.log(`✅ ${source.name}: ${articles.length} articles processed`);
        } catch (error) {
          console.error(`❌ Error processing ${source.name}:`, error.message);
        }
      }

      console.log(`🎉 Aggregation complete: ${totalArticles} total articles processed`);
      return totalArticles;
    } catch (error) {
      console.error('❌ News aggregation failed:', error.message);
      throw error;
    }
  }

  async processSource(source) {
    const articles = [];

    try {
      if (source.rss_feed_url) {
        // Try RSS first
        const rssArticles = await this.scrapeRSS(source);
        articles.push(...rssArticles);
      } else {
        // Fallback to website scraping
        const webArticles = await this.scrapeWebsite(source);
        articles.push(...webArticles);
      }

      // Store articles in database
      for (const article of articles) {
        try {
          await this.storeArticle(article, source.source_id);
        } catch (error) {
          if (!error.message.includes('Duplicate entry')) {
            console.error(`❌ Error storing article: ${error.message}`);
          }
        }
      }

      return articles;
    } catch (error) {
      console.error(`❌ Error processing source ${source.name}:`, error.message);
      return [];
    }
  }

  async scrapeRSS(source) {
    try {
      console.log(`📡 Fetching RSS: ${source.rss_feed_url}`);
      
      const feed = await this.rssParser.parseURL(source.rss_feed_url);
      const articles = [];

      for (const item of feed.items.slice(0, 20)) { // Limit to 20 most recent
        const article = {
          title: this.cleanText(item.title),
          url: item.link,
          publication_date: item.pubDate ? new Date(item.pubDate) : null,
          full_text: this.cleanText(item.contentSnippet || item.content || item.summary || ''),
          source_name: source.name
        };

        // Skip if no meaningful content
        if (article.title && article.url && article.full_text.length > 100) {
          articles.push(article);
        }
      }

      return articles;
    } catch (error) {
      console.error(`❌ RSS scraping failed for ${source.name}:`, error.message);
      return [];
    }
  }

  async scrapeWebsite(source) {
    try {
      console.log(`🌐 Scraping website: ${source.url}`);
      
      const response = await axios.get(source.url, this.axiosConfig);
      const $ = cheerio.load(response.data);
      const articles = [];

      // Generic article selectors (can be customized per source)
      const articleSelectors = [
        'article',
        '.post',
        '.news-item',
        '.article',
        '.entry',
        '[class*="article"]',
        '[class*="post"]'
      ];

      for (const selector of articleSelectors) {
        const elements = $(selector).slice(0, 10); // Limit to 10 articles
        
        if (elements.length > 0) {
          elements.each((i, element) => {
            const $el = $(element);
            
            const titleEl = $el.find('h1, h2, h3, .title, [class*="title"]').first();
            const linkEl = $el.find('a').first();
            const contentEl = $el.find('p, .content, .excerpt, [class*="content"]').first();
            
            const title = this.cleanText(titleEl.text());
            const relativeUrl = linkEl.attr('href');
            const content = this.cleanText(contentEl.text());
            
            if (title && relativeUrl && content.length > 50) {
              const fullUrl = this.resolveUrl(relativeUrl, source.url);
              
              articles.push({
                title,
                url: fullUrl,
                publication_date: new Date(),
                full_text: content,
                source_name: source.name
              });
            }
          });
          
          break; // Use first successful selector
        }
      }

      return articles;
    } catch (error) {
      console.error(`❌ Website scraping failed for ${source.name}:`, error.message);
      return [];
    }
  }

  async storeArticle(article, sourceId) {
    try {
      // Check if article already exists
      const existing = await db.findOne('ssnews_scraped_articles', 'url = ?', [article.url]);
      if (existing) {
        return null; // Skip duplicates
      }

      const articleData = {
        source_id: sourceId,
        title: article.title,
        url: article.url,
        publication_date: article.publication_date,
        full_text: article.full_text,
        status: 'scraped'
      };

      const articleId = await db.insertScrapedArticle(articleData);
      console.log(`💾 Stored article: ${article.title.substring(0, 50)}...`);
      
      return articleId;
    } catch (error) {
      if (error.message.includes('Duplicate entry')) {
        return null; // Silently skip duplicates
      }
      throw error;
    }
  }

  async analyzeScrapedArticles() {
    console.log('🧠 Starting AI analysis of scraped articles...');
    
    try {
      const articles = await db.getUnanalyzedArticles(20); // Process 20 at a time
      console.log(`📊 Analyzing ${articles.length} articles`);

      let analyzed = 0;

      for (const article of articles) {
        try {
          console.log(`🔍 Analyzing: ${article.title.substring(0, 50)}...`);

          // Generate AI summary
          const summary = await aiService.summarizeArticle(article.full_text, article.title);
          
          // Extract keywords
          const keywords = await aiService.extractKeywords(article.full_text, article.title);
          
          // Analyze relevance
          const relevanceScore = await aiService.analyzeRelevance(summary, keywords);

          // Update article with analysis
          await db.updateArticleAnalysis(article.article_id, {
            summary_ai: summary,
            keywords_ai: keywords,
            relevance_score: relevanceScore
          });

          analyzed++;
          console.log(`✅ Analyzed: ${article.title.substring(0, 30)}... (Score: ${relevanceScore})`);

          // Small delay to avoid rate limiting
          await this.delay(1000);
        } catch (error) {
          console.error(`❌ Error analyzing article ${article.article_id}:`, error.message);
        }
      }

      console.log(`🎉 Analysis complete: ${analyzed} articles analyzed`);
      return analyzed;
    } catch (error) {
      console.error('❌ Article analysis failed:', error.message);
      throw error;
    }
  }

  async getTopStories(limit = 5, minScore = 0.6) {
    try {
      console.log(`📈 Fetching top ${limit} stories (min score: ${minScore})`);
      
      const articles = await db.getTopArticlesByRelevance(limit, minScore);
      
      console.log(`🏆 Found ${articles.length} top stories`);
      return articles;
    } catch (error) {
      console.error('❌ Error fetching top stories:', error.message);
      throw error;
    }
  }

  // Utility methods
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Remove special characters
      .trim()
      .substring(0, 5000); // Limit length
  }

  resolveUrl(relativeUrl, baseUrl) {
    if (!relativeUrl) return '';
    
    if (relativeUrl.startsWith('http')) {
      return relativeUrl;
    }
    
    try {
      const base = new URL(baseUrl);
      return new URL(relativeUrl, base).href;
    } catch {
      return relativeUrl;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Manual trigger methods for testing
  async testSingleSource(sourceName) {
    try {
      const source = await db.findOne('ssnews_news_sources', 'name = ?', [sourceName]);
      if (!source) {
        throw new Error(`Source not found: ${sourceName}`);
      }

      console.log(`🧪 Testing source: ${sourceName}`);
      const articles = await this.processSource(source);
      
      console.log(`✅ Test complete: ${articles.length} articles found`);
      return articles;
    } catch (error) {
      console.error(`❌ Test failed for ${sourceName}:`, error.message);
      throw error;
    }
  }

  async getSourceStatus() {
    try {
      const sources = await db.getActiveNewsSources();
      const status = [];

      for (const source of sources) {
        const recentArticles = await db.query(
          'SELECT COUNT(*) as count FROM ssnews_scraped_articles WHERE source_id = ? AND scraped_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
          [source.source_id]
        );

        status.push({
          name: source.name,
          url: source.url,
          rss_feed_url: source.rss_feed_url,
          last_scraped_at: source.last_scraped_at,
          articles_last_24h: recentArticles[0].count,
          is_active: source.is_active
        });
      }

      return status;
    } catch (error) {
      console.error('❌ Error getting source status:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const newsAggregator = new NewsAggregator();

export default newsAggregator; 