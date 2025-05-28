#!/usr/bin/env node

import db from '../src/services/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔄 Resetting Project Eden data...');

async function resetProjectEden() {
  try {
    // Initialize database connection
    await db.initialize();
    console.log('✅ Database connected');

    // Clear all generated content tables
    console.log('🗑️ Clearing generated content...');
    
    // Clear image assets
    await db.query('DELETE FROM ssnews_image_assets WHERE associated_content_type = "gen_article"');
    console.log('✅ Cleared image assets');
    
    // Clear video scripts
    await db.query('DELETE FROM ssnews_generated_video_scripts');
    console.log('✅ Cleared video scripts');
    
    // Clear social posts
    await db.query('DELETE FROM ssnews_generated_social_posts');
    console.log('✅ Cleared social posts');
    
    // Clear generated articles
    await db.query('DELETE FROM ssnews_generated_articles');
    console.log('✅ Cleared generated articles');
    
    // Reset scraped articles status back to 'scraped' so they can be reprocessed
    await db.query('UPDATE ssnews_scraped_articles SET status = "scraped", summary_ai = NULL, keywords_ai = NULL, relevance_score = NULL WHERE status IN ("analyzed", "processed")');
    console.log('✅ Reset scraped articles status');
    
    // Optionally clear all scraped articles if you want to start completely fresh
    const clearAll = process.argv.includes('--clear-all');
    if (clearAll) {
      await db.query('DELETE FROM ssnews_scraped_articles');
      console.log('✅ Cleared all scraped articles');
    }
    
    // Get current counts
    const articleCount = await db.query('SELECT COUNT(*) as count FROM ssnews_scraped_articles');
    const genCount = await db.query('SELECT COUNT(*) as count FROM ssnews_generated_articles');
    const socialCount = await db.query('SELECT COUNT(*) as count FROM ssnews_generated_social_posts');
    const videoCount = await db.query('SELECT COUNT(*) as count FROM ssnews_generated_video_scripts');
    
    console.log('\n📊 Current data state:');
    console.log(`📰 Scraped articles: ${articleCount[0]?.count || 0}`);
    console.log(`📝 Generated articles: ${genCount[0]?.count || 0}`);
    console.log(`📱 Social posts: ${socialCount[0]?.count || 0}`);
    console.log(`🎬 Video scripts: ${videoCount[0]?.count || 0}`);
    
    console.log('\n🎉 Project Eden data reset complete!');
    console.log('💡 You can now run the full automation cycle to generate fresh content');
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run the reset
resetProjectEden(); 