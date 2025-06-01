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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Eden-Content-Bot/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/html',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

    this.axiosConfig = {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Eden-Content-Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status < 500; // Accept anything less than 500 as valid
      }
    };
  }

  async aggregateAllSources(accountId = null) {
    console.log(`🔄 Starting news aggregation... (accountId: ${accountId})`);
    
    try {
      const sources = await db.getActiveNewsSources(accountId);
      console.log(`📰 Found ${sources.length} active news sources`);

      let totalArticles = 0;
      
      for (const source of sources) {
        try {
          console.log(`📡 Processing: ${source.name}`);
          const articles = await this.processSource(source, accountId);
          totalArticles += articles.length;
          
          // Update last scraped timestamp with account context
          await db.updateSourceLastScraped(source.source_id, accountId);
          
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

  async processSource(source, accountId = null) {
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
          await this.storeArticle(article, source.source_id, accountId);
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

      // Enhanced article selectors for Christian news sites
      const articleSelectors = [
        // Semantic HTML5
        'article',
        'main article',
        
        // Common blog/news patterns
        '.post',
        '.news-item',
        '.article',
        '.entry',
        '.story',
        '.content-item',
        
        // Christian-specific patterns
        '.news-article',
        '.blog-post',
        '.sermon',
        '.bulletin-item',
        '.ministry-update',
        
        // Generic content patterns
        '[class*="article"]',
        '[class*="post"]',
        '[class*="news"]',
        '[class*="story"]',
        '[class*="content"]',
        
        // Container patterns
        '.item',
        '.card',
        '.tile',
        
        // List item patterns (for article lists)
        'li[class*="post"]',
        'li[class*="article"]',
        'li[class*="news"]',
        
        // Fallback: look for divs with links and headings
        'div:has(h1 a), div:has(h2 a), div:has(h3 a)'
      ];

      console.log(`📄 Page title: "${$('title').text()}"`);
      console.log(`📝 Page content length: ${response.data.length} characters`);

      let selectorUsed = null;
      let elementsFound = 0;

      for (const selector of articleSelectors) {
        const elements = $(selector);
        console.log(`🔍 Selector "${selector}": ${elements.length} elements found`);
        
        if (elements.length > 0) {
          selectorUsed = selector;
          elementsFound = elements.length;
          
          // Process up to 15 elements (increased from 10)
          elements.slice(0, 15).each((i, element) => {
            const $el = $(element);
            
            // Enhanced title extraction
            const titleSelectors = [
              'h1', 'h2', 'h3', 'h4',
              '.title', '.headline', '.post-title', '.entry-title',
              '[class*="title"]', '[class*="headline"]',
              'a[title]' // Sometimes the title is in the link's title attribute
            ];
            
            let title = '';
            let titleEl = null;
            for (const titleSel of titleSelectors) {
              titleEl = $el.find(titleSel).first();
              if (titleEl.length > 0 && titleEl.text().trim()) {
                title = this.cleanText(titleEl.text());
                break;
              }
            }
            
            // Enhanced link extraction
            let linkEl = $el.find('a').first();
            if (!linkEl.length || !linkEl.attr('href')) {
              // Try to find a link in the title element
              linkEl = titleEl && titleEl.is('a') ? titleEl : titleEl?.find('a').first();
            }
            
            const relativeUrl = linkEl?.attr('href');
            
            // Enhanced content extraction
            const contentSelectors = [
              'p', '.excerpt', '.summary', '.content', '.description',
              '.post-excerpt', '.entry-summary',
              '[class*="excerpt"]', '[class*="summary"]', '[class*="content"]',
              '.lead' // Common for news sites
            ];
            
            let content = '';
            for (const contentSel of contentSelectors) {
              const contentEl = $el.find(contentSel).first();
              if (contentEl.length > 0 && contentEl.text().trim().length > 20) {
                content = this.cleanText(contentEl.text());
                break;
              }
            }
            
            // If no content found in specific elements, try getting text from the whole element
            if (!content || content.length < 20) {
              // Get all text but exclude common navigation elements
              const textContent = $el.clone()
                .find('nav, .nav, .navigation, .menu, .sidebar, script, style')
                .remove()
                .end()
                .text();
              
              if (textContent.trim().length > 50) {
                content = this.cleanText(textContent);
              }
            }
            
            // More lenient filtering - reduced minimum content length
            if (title && relativeUrl && content.length > 30) {
              const fullUrl = this.resolveUrl(relativeUrl, source.url);
              
              // Additional validation
              if (fullUrl && fullUrl.startsWith('http') && title.length > 5) {
                const article = {
                  title,
                  url: fullUrl,
                  publication_date: new Date(),
                  full_text: content,
                  source_name: source.name
                };
                
                articles.push(article);
                console.log(`✅ Found article: "${title.substring(0, 50)}..." (${content.length} chars)`);
              }
            }
          });
          
          console.log(`📊 Selector "${selector}" yielded ${articles.length} valid articles`);
          
          if (articles.length > 0) {
            break; // Use first successful selector that yields articles
          }
        }
      }

      if (articles.length === 0) {
        console.log(`⚠️  No articles found with any selector. Debug info:`);
        console.log(`   - Elements found with best selector (${selectorUsed}): ${elementsFound}`);
        console.log(`   - Page has ${$('a').length} links total`);
        console.log(`   - Page has ${$('h1, h2, h3').length} headings total`);
        
        // Try a desperate fallback: look for any links with meaningful text
        const fallbackArticles = [];
        $('a').each((i, link) => {
          if (i >= 10) return false; // Limit to first 10 links
          
          const $link = $(link);
          const href = $link.attr('href');
          const linkText = $link.text().trim();
          
          if (href && linkText.length > 20 && linkText.length < 200) {
            const fullUrl = this.resolveUrl(href, source.url);
            if (fullUrl && fullUrl.startsWith('http')) {
              fallbackArticles.push({
                title: this.cleanText(linkText),
                url: fullUrl,
                publication_date: new Date(),
                full_text: linkText + ' (extracted from link)',
                source_name: source.name
              });
            }
          }
        });
        
        if (fallbackArticles.length > 0) {
          console.log(`🔄 Fallback method found ${fallbackArticles.length} potential articles`);
          articles.push(...fallbackArticles);
        }
      }

      console.log(`🎉 Web scraping complete: ${articles.length} articles extracted from ${source.name}`);
      return articles;
      
    } catch (error) {
      console.error(`❌ Website scraping failed for ${source.name}:`, error.message);
      console.error(`   URL: ${source.url}`);
      console.error(`   Error type: ${error.code || 'Unknown'}`);
      return [];
    }
  }

  async storeArticle(article, sourceId, accountId = null) {
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

      const articleId = await db.insertScrapedArticle(articleData, accountId);
      console.log(`💾 Stored article: ${article.title.substring(0, 50)}...`);
      
      return articleId;
    } catch (error) {
      if (error.message.includes('Duplicate entry')) {
        return null; // Silently skip duplicates
      }
      throw error;
    }
  }

  async analyzeScrapedArticles(limit = 20, accountId = null) {
    console.log(`🧠 Starting AI analysis of scraped articles (limit: ${limit}, accountId: ${accountId})...`);
    
    try {
      const articles = await db.getUnanalyzedArticles(limit, accountId); // Process with specified limit and account filtering
      console.log(`📊 Analyzing ${articles.length} articles for account ${accountId || 'all accounts'}`);

      let analyzed = 0;

      for (const article of articles) {
        try {
          console.log(`🔍 Analyzing: ${article.title.substring(0, 50)}... (accountId: ${accountId})`);

          // Generate AI summary
          const summary = await aiService.summarizeArticle(article.full_text, article.title);
          
          // Extract keywords
          const keywords = await aiService.extractKeywords(article.full_text, article.title);
          
          // Analyze relevance
          const relevanceScore = await aiService.analyzeRelevance(summary, keywords);

          // Update article with analysis - with account filtering
          await db.updateArticleAnalysis(article.article_id, {
            summary_ai: summary,
            keywords_ai: keywords,
            relevance_score: relevanceScore
          }, accountId);

          analyzed++;
          console.log(`✅ Analyzed: ${article.title.substring(0, 30)}... (Score: ${relevanceScore}) (accountId: ${accountId})`);

          // Small delay to avoid rate limiting
          await this.delay(1000);
        } catch (error) {
          console.error(`❌ Error analyzing article ${article.article_id}:`, error.message);
        }
      }

      console.log(`🎉 Analysis complete: ${analyzed} articles analyzed for account ${accountId || 'all accounts'}`);
      return analyzed;
    } catch (error) {
      console.error('❌ Article analysis failed:', error.message);
      throw error;
    }
  }

  async getTopStories(limit = 5, minScore = 0.6, accountId = null) {
    try {
      console.log(`📈 Fetching top ${limit} stories (min score: ${minScore}, accountId: ${accountId})`);
      
      const articles = await db.getTopArticlesByRelevance(limit, minScore, accountId);
      
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

  async getSourceStatus(accountId = null) {
    try {
      console.log(`📊 Getting source status (accountId: ${accountId})`);
      
      // Get sources filtered by account if accountId is provided
      let sourcesQuery = 'SELECT * FROM ssnews_news_sources';
      let queryParams = [];
      
      if (accountId) {
        sourcesQuery += ' WHERE account_id = ?';
        queryParams.push(accountId);
      }
      
      sourcesQuery += ' ORDER BY name';
      
      const sources = await db.query(sourcesQuery, queryParams);
      const status = [];

      for (const source of sources) {
        // Get articles count for last 24 hours
        let recentQuery = 'SELECT COUNT(*) as count FROM ssnews_scraped_articles WHERE source_id = ? AND scraped_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        let recentParams = [source.source_id];
        
        if (accountId) {
          recentQuery += ' AND account_id = ?';
          recentParams.push(accountId);
        }
        
        const recentArticles = await db.query(recentQuery, recentParams);

        // Get total articles count
        let totalQuery = 'SELECT COUNT(*) as count FROM ssnews_scraped_articles WHERE source_id = ?';
        let totalParams = [source.source_id];
        
        if (accountId) {
          totalQuery += ' AND account_id = ?';
          totalParams.push(accountId);
        }
        
        const totalArticles = await db.query(totalQuery, totalParams);

        // Determine source type based on whether it has RSS feed
        const sourceType = source.rss_feed_url ? 'RSS' : 'Web Scraping';

        status.push({
          source_id: source.source_id,
          name: source.name,
          url: source.url,
          rss_feed_url: source.rss_feed_url,
          description: source.description,
          last_checked: source.last_scraped_at, // Map last_scraped_at to last_checked for frontend
          last_scraped_at: source.last_scraped_at, // Keep original field too
          articles_last_24h: recentArticles[0].count,
          total_articles: totalArticles[0].count,
          is_active: source.is_active,
          source_type: sourceType,
          success_rate: null, // TODO: Calculate actual success rate from scraping attempts
          created_at: source.created_at,
          updated_at: source.updated_at,
          account_id: source.account_id
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