#!/usr/bin/env node

import db from './src/services/database.js';
import contentGenerator from './src/services/contentGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugWorkflowFailure() {
  try {
    console.log('🔍 Debugging workflow failure for content generation...');
    
    // Initialize database connection
    await db.initialize();
    
    // Get the latest article to test with
    const recentArticles = await db.query(`
      SELECT gen_article_id, based_on_scraped_article_id, title
      FROM ssnews_generated_articles 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (recentArticles.length === 0) {
      console.log('❌ No articles found to test with');
      return;
    }
    
    const latestArticle = recentArticles[0];
    console.log(`\n🎯 Testing with Article: ${latestArticle.gen_article_id}`);
    console.log(`📰 Title: ${latestArticle.title}`);
    
    // Get the original scraped article data
    const scrapedArticle = await db.query(`
      SELECT article_id, title, full_text, summary_ai
      FROM ssnews_scraped_articles 
      WHERE article_id = ?
    `, [latestArticle.based_on_scraped_article_id]);
    
    if (scrapedArticle.length === 0) {
      console.log('❌ Original scraped article not found');
      return;
    }
    
    const sourceArticle = scrapedArticle[0];
    console.log(`\n📄 Source Article: ${sourceArticle.article_id}`);
    console.log(`📝 Content Length: ${sourceArticle.full_text?.length || 0} chars`);
    
    // Check workflow configuration for the account
    console.log('\n🔧 Checking Workflow Configuration...');
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    
    const workflowTemplates = await db.query(`
      SELECT template_id, name, category, execution_order, is_active
      FROM ssnews_prompt_templates 
      WHERE account_id = ? 
      ORDER BY execution_order
    `, [accountId]);
    
    if (workflowTemplates.length === 0) {
      console.log('❌ No workflow templates found for account');
      return;
    }
    
    console.table(workflowTemplates);
    
    // Check specifically for social media and prayer templates
    const socialTemplate = workflowTemplates.find(t => t.category === 'social_media');
    const prayerTemplate = workflowTemplates.find(t => t.category === 'prayer');
    
    console.log(`\n📊 Template Analysis:`);
    console.log(`🐦 Social Media Template: ${socialTemplate ? '✅ Found' : '❌ Missing'}`);
    console.log(`🙏 Prayer Template: ${prayerTemplate ? '✅ Found' : '❌ Missing'}`);
    
    if (socialTemplate) {
      console.log(`   - ID: ${socialTemplate.template_id}, Active: ${socialTemplate.is_active}, Order: ${socialTemplate.execution_order}`);
    }
    if (prayerTemplate) {
      console.log(`   - ID: ${prayerTemplate.template_id}, Active: ${prayerTemplate.is_active}, Order: ${prayerTemplate.execution_order}`);
    }
    
    // Check if content generation is being attempted
    console.log('\n📋 Content Generation Log Analysis...');
    const genLogs = await db.query(`
      SELECT template_id, ai_service, model_used, success, error_message, created_at
      FROM ssnews_content_generation_log 
      WHERE generated_article_id = ?
      ORDER BY created_at DESC
    `, [latestArticle.gen_article_id]);
    
    if (genLogs.length > 0) {
      console.table(genLogs);
    } else {
      console.log('❌ No generation logs found for this article');
    }
    
    // Test manual generation
    console.log('\n🧪 Testing Manual Content Generation...');
    
    try {
      console.log('Testing Social Media Generation...');
      
      // Manually trigger social media generation
      const socialResult = await contentGenerator.generateSocialPostsWithAccount(
        sourceArticle, 
        latestArticle.gen_article_id,
        accountId
      );
      
      console.log(`✅ Social Media Result: ${socialResult?.length || 0} posts generated`);
      if (socialResult?.length > 0) {
        console.log('📱 Generated posts:');
        socialResult.forEach((post, i) => {
          console.log(`   ${i+1}. ${post.platform}: ${post.content.text?.substring(0, 50)}...`);
        });
      }
      
    } catch (socialError) {
      console.log(`❌ Social Media Generation Failed: ${socialError.message}`);
      console.log(`Stack: ${socialError.stack}`);
    }
    
  } catch (error) {
    console.error('❌ Error debugging workflow:', error);
  } finally {
    await db.close();
  }
}

debugWorkflowFailure(); 