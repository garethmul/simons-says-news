#!/usr/bin/env node

/**
 * Test individual news sources for debugging
 * Usage: node src/scripts/test-source.js "Source Name"
 * Example: node src/scripts/test-source.js "Premier Christian News"
 */

import newsAggregator from '../services/newsAggregator.js';
import db from '../services/database.js';

const sourceName = process.argv[2];

if (!sourceName) {
  console.log('❌ Usage: node src/scripts/test-source.js "Source Name"');
  console.log('   Example: node src/scripts/test-source.js "Premier Christian News"');
  process.exit(1);
}

async function testSource() {
  try {
    console.log(`🧪 Testing news source: "${sourceName}"`);
    console.log('='.repeat(60));
    
    // Get source from database
    const source = await db.findOne('ssnews_news_sources', 'name = ?', [sourceName]);
    
    if (!source) {
      console.log(`❌ Source not found: "${sourceName}"`);
      
      // Show available sources
      const allSources = await db.findMany('ssnews_news_sources', '1=1', []);
      console.log('\n📋 Available sources:');
      allSources.forEach(s => {
        console.log(`   - "${s.name}" (${s.is_active ? 'active' : 'inactive'})`);
      });
      
      process.exit(1);
    }
    
    console.log(`📍 Source Details:`);
    console.log(`   Name: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    console.log(`   RSS: ${source.rss_feed_url || 'None (web scraping)'}`);
    console.log(`   Type: ${source.rss_feed_url ? 'RSS Feed' : 'Web Scraping'}`);
    console.log(`   Active: ${source.is_active ? 'Yes' : 'No'}`);
    console.log(`   Last scraped: ${source.last_scraped_at || 'Never'}`);
    console.log('');
    
    // Test the source
    console.log(`🔄 Testing source processing...`);
    const startTime = Date.now();
    
    const articles = await newsAggregator.processSource(source);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Test completed in ${duration}ms`);
    console.log('');
    
    if (articles.length === 0) {
      console.log(`❌ No articles found from ${sourceName}`);
      console.log('');
      console.log('🔧 Troubleshooting steps:');
      console.log('   1. Check if the website is accessible');
      console.log('   2. Verify the RSS feed URL (if applicable)');
      console.log('   3. Check if the website structure has changed');
      console.log('   4. Test with the new debug endpoint:');
      console.log(`      POST /api/eden/news/sources/${encodeURIComponent(sourceName)}/test`);
    } else {
      console.log(`✅ Found ${articles.length} articles from ${sourceName}`);
      console.log('');
      console.log('📄 Sample articles:');
      
      articles.slice(0, 3).forEach((article, index) => {
        console.log(`   ${index + 1}. "${article.title}"`);
        console.log(`      URL: ${article.url}`);
        console.log(`      Content: ${article.full_text.substring(0, 100)}...`);
        console.log(`      Length: ${article.full_text.length} characters`);
        console.log('');
      });
      
      if (articles.length > 3) {
        console.log(`   ... and ${articles.length - 3} more articles`);
      }
    }
    
    console.log('🎉 Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    await db.close();
    process.exit();
  }
}

testSource(); 