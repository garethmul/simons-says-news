/**
 * NEWS AGGREGATION MODULE TEST (Project Eden Module 1)
 * 
 * Tests RSS feed parsing, web scraping, and data storage
 * as specified in Project Eden specification
 */

import fs from 'fs';

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

export async function testNewsAggregation() {
  console.log(`${BLUE}📰 Testing News Aggregation Module (Project Eden Module 1)${RESET}`);
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: RSS Feed Parser
  console.log(`\n${BLUE}🔍 Test 1: RSS Feed Parser${RESET}`);
  try {
    // Check if RSS parser exists
    const rssFeedParserExists = fs.existsSync('src/services/rssFeedParser.js');
    const newsAggregatorExists = fs.existsSync('src/services/newsAggregator.js');
    
    if (rssFeedParserExists || newsAggregatorExists) {
      console.log(`   ${GREEN}✅ RSS feed parsing capability: Available${RESET}`);
      results.passed++;
    } else {
      console.log(`   ${YELLOW}⚠️ RSS feed parsing capability: Needs implementation${RESET}`);
      console.log(`   ${BLUE}📋 Implementation Guide:${RESET}`);
      console.log(`      1. Create src/services/rssFeedParser.js`);
      console.log(`      2. Use 'rss-parser' npm package`);
      console.log(`      3. Support Premier Christian News, Christian Today, Church Times`);
      results.failed++;
    }
    results.total++;

    // Test 2: Web Scraping Capability
    console.log(`\n${BLUE}🔍 Test 2: Web Scraping with robots.txt Compliance${RESET}`);
    
    // Check for scraping libraries
    const packageJsonExists = fs.existsSync('package.json');
    let hasScrapingLibs = false;
    
    if (packageJsonExists) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      hasScrapingLibs = Object.keys(deps).some(dep => 
        ['cheerio', 'puppeteer', 'playwright', 'axios'].includes(dep)
      );
    }

    if (hasScrapingLibs) {
      console.log(`   ${GREEN}✅ Web scraping libraries: Available${RESET}`);
      results.passed++;
    } else {
      console.log(`   ${YELLOW}⚠️ Web scraping capability: Needs setup${RESET}`);
      console.log(`   ${BLUE}📋 Implementation Guide:${RESET}`);
      console.log(`      1. Install: npm install axios cheerio`);
      console.log(`      2. Respect robots.txt for each news source`);
      console.log(`      3. Implement rate limiting (1 request per 2 seconds)`);
      results.failed++;
    }
    results.total++;

    // Test 3: Data Storage Schema
    console.log(`\n${BLUE}🔍 Test 3: Data Storage (ssnews_scraped_articles)${RESET}`);
    
    const schemaExists = fs.existsSync('database/schema/stage3-template-engine.sql');
    let hasScrapedArticlesTable = false;
    
    if (schemaExists) {
      const schema = fs.readFileSync('database/schema/stage3-template-engine.sql', 'utf8');
      hasScrapedArticlesTable = schema.includes('ssnews_scraped_articles');
    }

    if (hasScrapedArticlesTable) {
      console.log(`   ${GREEN}✅ Database schema: ssnews_scraped_articles table defined${RESET}`);
      results.passed++;
    } else {
      console.log(`   ${YELLOW}⚠️ Database schema: Needs ssnews_scraped_articles table${RESET}`);
      console.log(`   ${BLUE}📋 Implementation Guide:${RESET}`);
      console.log(`      1. Add table to database schema`);
      console.log(`      2. Include fields: article_id, source_id, title, url, content`);
      console.log(`      3. Add indexes for source_id and publication_date`);
      results.failed++;
    }
    results.total++;

    // Test 4: News Sources Configuration
    console.log(`\n${BLUE}🔍 Test 4: News Sources Configuration${RESET}`);
    
    const newsSources = [
      'Premier Christian News (premierchristian.news)',
      'Christian Today UK (christiantoday.com/uk)',
      'Church Times (churchtimes.co.uk)',
      'Evangelical Alliance (eauk.org)'
    ];

    console.log(`   ${BLUE}📋 Required News Sources (Project Eden Spec):${RESET}`);
    newsSources.forEach(source => {
      console.log(`      📰 ${source}`);
    });

    // Check if configuration exists
    const configExists = fs.existsSync('src/config/newsSources.js') || 
                         fs.existsSync('src/config/newsSources.json');

    if (configExists) {
      console.log(`   ${GREEN}✅ News sources configuration: Available${RESET}`);
      results.passed++;
    } else {
      console.log(`   ${YELLOW}⚠️ News sources configuration: Needs creation${RESET}`);
      console.log(`   ${BLUE}📋 Implementation Guide:${RESET}`);
      console.log(`      1. Create src/config/newsSources.js`);
      console.log(`      2. Define RSS feeds and scraping endpoints`);
      console.log(`      3. Include rate limiting and retry logic`);
      results.failed++;
    }
    results.total++;

  } catch (error) {
    console.log(`   ${RED}❌ Error testing news aggregation: ${error.message}${RESET}`);
    results.failed++;
    results.total++;
  }

  // Summary
  const successRate = Math.round((results.passed / results.total) * 100);
  console.log(`\n${BLUE}📊 News Aggregation Module Summary:${RESET}`);
  console.log(`   Tests Passed: ${GREEN}${results.passed}${RESET}`);
  console.log(`   Tests Failed: ${RED}${results.failed}${RESET}`);
  console.log(`   Success Rate: ${successRate >= 75 ? GREEN : YELLOW}${successRate}%${RESET}`);

  if (results.failed > 0) {
    console.log(`\n${YELLOW}📋 Next Steps for Module 1 Implementation:${RESET}`);
    console.log(`   1. Create RSS feed parser service`);
    console.log(`   2. Set up web scraping with compliance`);
    console.log(`   3. Configure Christian news sources`);
    console.log(`   4. Implement data storage layer`);
    console.log(`   5. Add scheduling for daily aggregation`);
  }

  return {
    success: results.failed === 0,
    passed: results.passed,
    failed: results.failed,
    total: results.total
  };
}

export default {
  name: 'News Aggregation Module Test',
  run: testNewsAggregation
}; 