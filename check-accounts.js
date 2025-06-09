#!/usr/bin/env node

/**
 * CHECK AVAILABLE ACCOUNTS
 * Find what account IDs are available for testing
 */

import db from './src/services/database.js';

async function checkAccounts() {
  try {
    console.log('🔍 Checking available accounts...');
    
    // Initialize database
    await db.initialize();
    
    // Get all accounts
    const accounts = await db.query(`
      SELECT 
        account_id,
        name,
        slug,
        organization_id,
        is_active,
        created_at
      FROM ssnews_accounts 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📊 Available Accounts:');
    console.table(accounts);
    
    if (accounts.length > 0) {
      // Use the first account to check story 214
      const firstAccount = accounts[0];
      console.log(`\n🎯 Using account: ${firstAccount.name} (${firstAccount.account_id})`);
      
      // Check if story 214 exists for this account
      const story214 = await db.query(`
        SELECT 
          gen_article_id,
          title,
          status,
          created_at,
          CHAR_LENGTH(body_draft) as body_length
        FROM ssnews_generated_articles 
        WHERE gen_article_id = 214 AND account_id = ?
      `, [firstAccount.account_id]);
      
      if (story214.length > 0) {
        console.log('\n✅ Story 214 found:');
        console.table(story214);
        
        // Check social media content for this story
        const socialContent = await db.query(`
          SELECT 
            content_id,
            prompt_category,
            status,
            created_at,
            CHAR_LENGTH(JSON_EXTRACT(content_data, '$')) as data_length,
            SUBSTRING(JSON_EXTRACT(content_data, '$'), -100) as data_ending
          FROM ssnews_generated_content 
          WHERE based_on_gen_article_id = 214 
            AND account_id = ?
            AND prompt_category = 'social_media'
        `, [firstAccount.account_id]);
        
        if (socialContent.length > 0) {
          console.log('\n📱 Social Media Content:');
          console.table(socialContent);
          
          // Get the full content data
          const fullContent = await db.query(`
            SELECT content_data
            FROM ssnews_generated_content 
            WHERE based_on_gen_article_id = 214 
              AND account_id = ?
              AND prompt_category = 'social_media'
            LIMIT 1
          `, [firstAccount.account_id]);
          
          if (fullContent.length > 0) {
            const contentText = fullContent[0].content_data;
            console.log('\n📝 Full Content Analysis:');
            console.log('Content Length:', contentText.length);
            console.log('Starts with:', contentText.substring(0, 100));
            console.log('Ends with:', contentText.substring(contentText.length - 100));
            console.log('Ends with quote?', contentText.endsWith('"'));
            console.log('Contains ```json?', contentText.includes('```json'));
            console.log('Contains ...?', contentText.includes('...'));
            
            // Check if UI would show truncation warning
            const wouldShowWarning = contentText.includes('```json') || 
                                    contentText.includes('...') || 
                                    contentText.endsWith('"') === false;
            console.log('\n🚨 Would show truncation warning?', wouldShowWarning);
            
            if (wouldShowWarning) {
              console.log('Triggers:');
              if (contentText.includes('```json')) console.log('  - Contains ```json');
              if (contentText.includes('...')) console.log('  - Contains ...');
              if (contentText.endsWith('"') === false) console.log('  - Does not end with quote');
            }
            
            console.log('\n📄 Full Content:');
            console.log('='.repeat(80));
            console.log(contentText);
            console.log('='.repeat(80));
          }
        } else {
          console.log('\n❌ No social media content found for story 214');
        }
      } else {
        console.log('\n❌ Story 214 not found in this account');
        
        // List recent stories to see what's available
        const recentStories = await db.query(`
          SELECT 
            gen_article_id,
            title,
            status,
            created_at
          FROM ssnews_generated_articles 
          WHERE account_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `, [firstAccount.account_id]);
        
        console.log('\n📰 Recent Stories in This Account:');
        console.table(recentStories);
      }
    }
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error checking accounts:', error);
    process.exit(1);
  }
}

checkAccounts(); 