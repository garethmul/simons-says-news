#!/usr/bin/env node

import db from './src/services/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Get limit from command line arguments, default to 3
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 3;

async function checkRecentContent() {
  try {
    console.log('🔍 Checking recent content generation...');
    
    // Initialize database connection
    await db.initialize();
    
    // Check recent generated articles
    console.log('\n📰 Recent Generated Articles:');
    const recentArticles = await db.query(`
      SELECT 
        gen_article_id,
        based_on_scraped_article_id,
        title,
        status,
        created_at
      FROM ssnews_generated_articles 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `);
    
    if (recentArticles.length > 0) {
      console.table(recentArticles);
      
      // Get the most recent article
      const latestArticle = recentArticles[0];
      console.log(`\n🎯 Latest Article: ${latestArticle.gen_article_id} (Based on Article: ${latestArticle.based_on_scraped_article_id})`);
      
      // Check social media content for the latest article
      console.log('\n📱 Social Media Content:');
      const socialMedia = await db.query(`
        SELECT 
          gen_social_id,
          platform,
          LEFT(text_draft, 100) as text_preview,
          LENGTH(text_draft) as text_length,
          status
        FROM ssnews_generated_social_posts 
        WHERE based_on_gen_article_id = ?
        ORDER BY gen_social_id DESC
      `, [latestArticle.gen_article_id]);
      
      if (socialMedia.length > 0) {
        console.table(socialMedia);
      } else {
        console.log('❌ No social media content found');
      }
      
      // Check prayer points (from generic content system)
      console.log('\n🙏 Prayer Points:');
      const prayers = await db.query(`
        SELECT 
          content_id,
          LEFT(JSON_UNQUOTE(JSON_EXTRACT(content_data, '$[0].prayer_text')), 80) as prayer_preview,
          JSON_LENGTH(content_data) as prayer_count,
          status
        FROM ssnews_generated_content 
        WHERE based_on_gen_article_id = ? AND prompt_category = 'prayer_points'
        ORDER BY content_id DESC
      `, [latestArticle.gen_article_id]);
      
      if (prayers.length > 0) {
        console.table(prayers);
        console.log(`📊 Prayer Records: ${prayers.length}, Prayer Count in Latest: ${prayers[0].prayer_count || 0} (Expected: 5)`);
      } else {
        console.log('❌ No prayer points found');
      }
      
      // Check images
      console.log('\n🖼️ Generated Images (from Assets):');
      const images = await db.query(`
        SELECT 
          image_id,
          source_api,
          LEFT(alt_text_suggestion_ai, 60) as alt_text_preview,
          sirv_cdn_url,
          uploaded_at
        FROM ssnews_image_assets 
        WHERE associated_content_type = 'gen_article' AND associated_content_id = ?
        ORDER BY image_id DESC
      `, [latestArticle.gen_article_id]);
      
      if (images.length > 0) {
        console.table(images);
      } else {
        console.log('❌ No generated images found');
      }

      // Check image prompt
      console.log('\n🎨 Image Generation Prompt Used:');
      const imagePrompt = await db.query(`
        SELECT
          JSON_UNQUOTE(JSON_EXTRACT(content_data, '$[0].text')) as prompt_text
        FROM ssnews_generated_content
        WHERE based_on_gen_article_id = ? AND prompt_category = 'image_generation'
        LIMIT 1
      `, [latestArticle.gen_article_id]);

      if (imagePrompt.length > 0 && imagePrompt[0].prompt_text) {
        console.log(`\n> ${imagePrompt[0].prompt_text}\n`);
      } else {
        console.log('❌ No image prompt found in generated content.');
      }
      
    } else {
      console.log('❌ No generated articles found');
    }
    
  } catch (error) {
    console.error('❌ Error checking recent content:', error);
  } finally {
    await db.close();
  }
}

checkRecentContent(); 