#!/usr/bin/env node

/**
 * CHECK STORY 214 CONTENT
 * Investigate the truncation issue for story about Christian bookshops
 */

import db from './src/services/database.js';

async function checkStory214() {
  try {
    console.log('🔍 Investigating Story #214 - Christian bookshops...');
    
    // Initialize database
    await db.initialize();
    
    // 1. Check the basic generated article info
    console.log('\n📝 Generated Article Info:');
    const articleInfo = await db.query(`
      SELECT 
        gen_article_id,
        title,
        based_on_scraped_article_id,
        status,
        created_at,
        CHAR_LENGTH(body_draft) as body_length
      FROM ssnews_generated_articles 
      WHERE gen_article_id = 214
    `);
    
    if (articleInfo.length === 0) {
      console.log('❌ No article found with ID 214');
      return;
    }
    
    console.table(articleInfo);
    
    // 2. Check the source article
    if (articleInfo[0].based_on_scraped_article_id) {
      console.log('\n📰 Source Article Info:');
      const sourceInfo = await db.query(`
        SELECT 
          article_id,
          title,
          source_name,
          status,
          CHAR_LENGTH(full_text) as content_length
        FROM ssnews_scraped_articles 
        WHERE article_id = ?
      `, [articleInfo[0].based_on_scraped_article_id]);
      
      console.table(sourceInfo);
    }
    
    // 3. Check generated content entries for story 214
    console.log('\n🎨 Generated Content Entries:');
    const contentEntries = await db.query(`
      SELECT 
        content_id,
        prompt_category,
        status,
        created_at,
        CHAR_LENGTH(JSON_EXTRACT(content_data, '$')) as data_length,
        SUBSTRING(JSON_EXTRACT(content_data, '$'), 1, 200) as data_preview
      FROM ssnews_generated_content 
      WHERE based_on_gen_article_id = 214
      ORDER BY prompt_category, created_at
    `);
    
    console.table(contentEntries);
    
    // 4. Focus on social media content specifically
    console.log('\n📱 Social Media Content Details:');
    const socialMediaContent = await db.query(`
      SELECT 
        content_id,
        prompt_category,
        content_data,
        metadata,
        status,
        created_at
      FROM ssnews_generated_content 
      WHERE based_on_gen_article_id = 214 
        AND prompt_category = 'social_media'
    `);
    
    if (socialMediaContent.length > 0) {
      socialMediaContent.forEach((content, index) => {
        console.log(`\n--- Social Media Content #${index + 1} ---`);
        console.log('Content ID:', content.content_id);
        console.log('Status:', content.status);
        console.log('Created:', content.created_at);
        
        try {
          const contentData = JSON.parse(content.content_data);
          console.log('Parsed Content Data:');
          console.log(JSON.stringify(contentData, null, 2));
        } catch (error) {
          console.log('❌ Could not parse content_data as JSON:');
          console.log('Raw content_data:', content.content_data);
        }
        
        try {
          const metadata = JSON.parse(content.metadata || '{}');
          console.log('Metadata:');
          console.log(JSON.stringify(metadata, null, 2));
        } catch (error) {
          console.log('❌ Could not parse metadata as JSON:');
          console.log('Raw metadata:', content.metadata);
        }
      });
    } else {
      console.log('❌ No social media content found for story 214');
    }
    
    // 5. Check AI response logs for this content
    console.log('\n🤖 AI Response Logs:');
    const aiLogs = await db.query(`
      SELECT 
        response_log_id,
        content_category,
        ai_service,
        model_used,
        stop_reason,
        is_complete,
        is_truncated,
        tokens_used_output,
        max_output_tokens,
        CHAR_LENGTH(response_text) as response_length,
        SUBSTRING(response_text, 1, 200) as response_preview,
        created_at
      FROM ssnews_ai_response_log 
      WHERE generated_article_id = 214
      ORDER BY created_at DESC
    `);
    
    if (aiLogs.length > 0) {
      console.table(aiLogs);
      
      // Show the full social media response if it exists
      const socialMediaLog = aiLogs.find(log => log.content_category === 'social_media');
      if (socialMediaLog) {
        console.log('\n📱 Full Social Media AI Response:');
        const fullResponse = await db.query(`
          SELECT response_text 
          FROM ssnews_ai_response_log 
          WHERE response_log_id = ?
        `, [socialMediaLog.response_log_id]);
        
        if (fullResponse.length > 0) {
          console.log('Raw AI Response:');
          console.log('='.repeat(80));
          console.log(fullResponse[0].response_text);
          console.log('='.repeat(80));
          console.log('Response ends with quote?', fullResponse[0].response_text.endsWith('"'));
          console.log('Response includes ```json?', fullResponse[0].response_text.includes('```json'));
          console.log('Response includes ...?', fullResponse[0].response_text.includes('...'));
        }
      }
    } else {
      console.log('❌ No AI response logs found for story 214');
    }
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error investigating story 214:', error);
    process.exit(1);
  }
}

checkStory214(); 