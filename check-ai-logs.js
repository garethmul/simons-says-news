#!/usr/bin/env node

import db from './src/services/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAILogs() {
  try {
    console.log('🔍 Checking AI response logs...');
    
    // Initialize database connection
    await db.initialize();
    
    // Query recent AI response logs
    console.log('\n📊 Recent AI Response Logs:');
    const recentLogs = await db.query(`
      SELECT 
        response_log_id,
        generated_article_id,
        content_category,
        ai_service,
        model_used,
        stop_reason,
        is_complete,
        is_truncated,
        tokens_used_output,
        max_output_tokens,
        temperature,
        LEFT(response_text, 100) as response_preview,
        created_at
      FROM ssnews_ai_response_log 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (recentLogs.length === 0) {
      console.log('❌ No AI response logs found. The enhanced logging may not be working yet.');
      console.log('💡 This could mean:');
      console.log('   - Generation hasn\'t started yet');
      console.log('   - Logging code isn\'t being called');
      console.log('   - Database table wasn\'t created properly');
    } else {
      console.log(`✅ Found ${recentLogs.length} recent AI response logs:`);
      console.table(recentLogs);
    }
    
    // Check for truncated responses
    console.log('\n⚠️ Truncated Responses:');
    const truncatedLogs = await db.query(`
      SELECT * FROM v_truncated_responses LIMIT 5
    `);
    
    if (truncatedLogs.length > 0) {
      console.log(`Found ${truncatedLogs.length} truncated responses:`);
      console.table(truncatedLogs);
    } else {
      console.log('No truncated responses found in recent logs.');
    }
    
    // Check content generation log (old table)
    console.log('\n📋 Recent Content Generation Log (Basic):');
    const basicLogs = await db.query(`
      SELECT 
        log_id,
        generated_article_id,
        ai_service,
        model_used,
        tokens_used,
        generation_time_ms,
        success,
        error_message,
        created_at
      FROM ssnews_content_generation_log 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (basicLogs.length > 0) {
      console.table(basicLogs);
    } else {
      console.log('No basic generation logs found.');
    }
    
  } catch (error) {
    console.error('❌ Error checking AI logs:', error);
  } finally {
    await db.close();
  }
}

checkAILogs(); 