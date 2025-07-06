const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

class EnhancedScraper {
  constructor() {
    this.puppeteerInstance = null;
    this.isInitialised = false;
  }

  // Initialise Puppeteer instance
  async initialise() {
    if (this.isInitialised) return;

    try {
      const isProd = process.env.NODE_ENV === 'production';
      
      const launchOptions = isProd ? {
        executablePath: process.env.CHROME_BIN || '/app/.chrome-for-testing/chrome-linux64/chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        headless: 'new',
        timeout: 30000
      } : {
        headless: 'new',
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
        timeout: 30000
      };

      this.puppeteerInstance = await puppeteer.launch(launchOptions);
      this.isInitialised = true;
      console.log('Enhanced scraper initialised successfully');
    } catch (error) {
      console.error('Failed to initialise Puppeteer:', error);
      this.isInitialised = false;
    }
  }

  // Detect if a URL likely needs JavaScript rendering
  isJavaScriptSite(url) {
    const jsIndicators = [
      'ghost.org',
      'ghost.io',
      'medium.com',
      'substack.com',
      'wordpress.com',
      'wix.com',
      'squarespace.com',
      'webflow.com',
      'reactjs.org',
      'vue.js',
      'angular.io'
    ];

    const domain = new URL(url).hostname.toLowerCase();
    return jsIndicators.some(indicator => domain.includes(indicator));
  }

  // Enhanced scraping with automatic fallback
  async scrapeContent(url, timeout = 15000) {
    console.log(`Scraping URL: ${url}`);

    // Try static scraping first for performance
    if (!this.isJavaScriptSite(url)) {
      try {
        const staticResult = await this.staticScrape(url);
        if (staticResult && staticResult.content && staticResult.content.length > 200) {
          console.log('Static scraping successful');
          return staticResult;
        }
      } catch (error) {
        console.log('Static scraping failed, trying Puppeteer:', error.message);
      }
    }

    // Use Puppeteer for JavaScript-heavy sites or fallback
    try {
      await this.initialise();
      if (!this.isInitialised) {
        throw new Error('Puppeteer not available');
      }

      return await this.puppeteerScrape(url, timeout);
    } catch (error) {
      console.error('Puppeteer scraping failed:', error);
      
      // Final fallback to static scraping
      try {
        return await this.staticScrape(url);
      } catch (fallbackError) {
        console.error('All scraping methods failed:', fallbackError);
        throw new Error('Unable to scrape content from any method');
      }
    }
  }

  // Static scraping with Cheerio
  async staticScrape(url) {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, header, footer, .menu, .navigation, .sidebar, .ads, .advertisement').remove();

    // Extract content with multiple selectors
    const contentSelectors = [
      'article',
      '.post-content',
      '.entry-content',
      '.content',
      '.post-body',
      '.article-content',
      'main p',
      '.text p'
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > content.length) {
        content = element.text().trim();
      }
    }

    // Extract metadata
    const title = $('title').text().trim() || 
                  $('h1').first().text().trim() || 
                  $('meta[property="og:title"]').attr('content') || '';

    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';

    return {
      url,
      title,
      content: content || description,
      method: 'static',
      timestamp: new Date().toISOString()
    };
  }

  // Puppeteer scraping for JavaScript content
  async puppeteerScrape(url, timeout = 15000) {
    let page;
    
    try {
      page = await this.puppeteerInstance.newPage();

      // Set page configuration
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Block images and ads for faster loading
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate with timeout
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: timeout
      });

      // Wait for potential dynamic content
      await page.waitForTimeout(2000);

      // Try to trigger any lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await page.waitForTimeout(1000);

      // Extract content
      const result = await page.evaluate(() => {
        // Remove unwanted elements
        const unwantedSelectors = ['script', 'style', 'nav', 'header', 'footer', '.menu', '.navigation', '.sidebar', '.ads', '.advertisement'];
        unwantedSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => el.remove());
        });

        // Extract title
        const title = document.title || 
                     document.querySelector('h1')?.textContent?.trim() || 
                     document.querySelector('meta[property="og:title"]')?.content || '';

        // Extract content with multiple strategies
        const contentSelectors = [
          'article',
          '.post-content',
          '.entry-content', 
          '.content',
          '.post-body',
          '.article-content',
          '.ghost-content',
          'main',
          '.container p'
        ];

        let content = '';
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent?.trim() || '';
            if (text.length > content.length) {
              content = text;
            }
          }
        }

        // If still no content, try all paragraphs
        if (!content || content.length < 100) {
          const paragraphs = Array.from(document.querySelectorAll('p'))
            .map(p => p.textContent?.trim())
            .filter(text => text && text.length > 20)
            .join(' ');
          
          if (paragraphs.length > content.length) {
            content = paragraphs;
          }
        }

        const description = document.querySelector('meta[name="description"]')?.content || 
                           document.querySelector('meta[property="og:description"]')?.content || '';

        return {
          title,
          content: content || description,
          description,
          wordCount: content.split(' ').length
        };
      });

      return {
        url,
        title: result.title,
        content: result.content,
        description: result.description,
        wordCount: result.wordCount,
        method: 'puppeteer',
        timestamp: new Date().toISOString()
      };

    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  // Clean up resources
  async cleanup() {
    if (this.puppeteerInstance) {
      try {
        await this.puppeteerInstance.close();
        this.puppeteerInstance = null;
        this.isInitialised = false;
        console.log('Enhanced scraper cleaned up');
      } catch (error) {
        console.error('Error cleaning up Puppeteer:', error);
      }
    }
  }

  // Health check
  async isHealthy() {
    try {
      await this.initialise();
      return this.isInitialised;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const enhancedScraper = new EnhancedScraper();

// Graceful cleanup on process exit
process.on('exit', () => enhancedScraper.cleanup());
process.on('SIGINT', () => enhancedScraper.cleanup());
process.on('SIGTERM', () => enhancedScraper.cleanup());

module.exports = enhancedScraper; 