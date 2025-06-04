import db from '../services/database.js';

async function fixPrayerPointsConfiguration() {
  try {
    console.log('🔄 Initializing database connection...');
    await db.initialize();
    
    console.log('🔍 Checking prayer points configuration...');
    
    // Get all active accounts
    const accounts = await db.query(`
      SELECT DISTINCT account_id, name 
      FROM ssnews_accounts 
      WHERE is_active = 1
    `);
    
    console.log(`📊 Found ${accounts.length} active accounts`);
    
    // Check which accounts have prayer points configuration
    const configuredAccounts = await db.query(`
      SELECT account_id, display_name 
      FROM ssnews_prompt_configuration 
      WHERE prompt_category = 'prayer_points'
    `);
    
    console.log(`🙏 Found ${configuredAccounts.length} accounts with prayer points configuration:`);
    configuredAccounts.forEach(config => {
      console.log(`  - Account: ${config.account_id}, Display: ${config.display_name}`);
    });
    
    // Find accounts missing prayer points configuration
    const configuredAccountIds = new Set(configuredAccounts.map(c => c.account_id));
    const missingAccounts = accounts.filter(account => !configuredAccountIds.has(account.account_id));
    
    if (missingAccounts.length > 0) {
      console.log(`\n⚠️ Found ${missingAccounts.length} accounts missing prayer points configuration:`);
      missingAccounts.forEach(account => {
        console.log(`  - Account: ${account.account_id} (${account.name})`);
      });
      
      console.log('\n🔧 Adding prayer points configuration for missing accounts...');
      
      for (const account of missingAccounts) {
        try {
          await db.query(`
            INSERT INTO ssnews_prompt_configuration 
            (account_id, prompt_category, display_name, storage_schema, ui_config, generation_config, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            account.account_id,
            'prayer_points',
            'Prayer Points',
            JSON.stringify({
              type: 'array',
              max_items: 5,
              items: {
                order_number: { type: 'integer', required: true },
                prayer_text: { type: 'string', max_length: 200, required: true },
                theme: { type: 'string', max_length: 50 }
              }
            }),
            JSON.stringify({
              tab_name: 'Prayer Points',
              icon: 'Heart',
              display_type: 'numbered_list',
              empty_message: 'No prayer points generated',
              count_in_tab: true,
              order: 4
            }),
            JSON.stringify({
              model: 'gemini',
              max_tokens: 1000,
              temperature: 0.7,
              prompt_template: 'prayer',
              fallback_template: 'prayer',
              custom_instructions: 'Create 5 prayer points, 15-25 words each, covering different aspects: people affected, healing, guidance, hope, and justice.'
            }),
            true
          ]);
          
          console.log(`✅ Added prayer points configuration for account: ${account.account_id} (${account.name})`);
        } catch (error) {
          console.error(`❌ Failed to add configuration for account ${account.account_id}:`, error.message);
        }
      }
    } else {
      console.log('\n✅ All accounts already have prayer points configuration');
    }
    
    // Now let's check for duplicate content in review tab
    console.log('\n🔍 Checking for duplicate content in review tab...');
    
    const duplicateCheck = await db.query(`
      SELECT 
        based_on_scraped_article_id,
        account_id,
        COUNT(*) as count,
        GROUP_CONCAT(gen_article_id) as article_ids,
        GROUP_CONCAT(status) as statuses,
        GROUP_CONCAT(created_at) as created_dates
      FROM ssnews_generated_articles 
      WHERE status IN ('draft', 'review_pending')
      GROUP BY based_on_scraped_article_id, account_id
      HAVING COUNT(*) > 1
      ORDER BY account_id, count DESC
    `);
    
    if (duplicateCheck.length > 0) {
      console.log(`\n⚠️ Found ${duplicateCheck.length} duplicate content issues:`);
      duplicateCheck.forEach(dup => {
        console.log(`  - Source Article: ${dup.based_on_scraped_article_id}, Account: ${dup.account_id}`);
        console.log(`    Generated Articles: ${dup.article_ids} (Statuses: ${dup.statuses})`);
        console.log(`    Created: ${dup.created_dates}`);
      });
      
      console.log('\n🧹 To fix duplicates, run regenerate again or manually remove older versions');
    } else {
      console.log('\n✅ No duplicate content found in review tab');
    }
    
    // Check prayer points content for recent articles
    console.log('\n🔍 Checking recent prayer points generation...');
    
    const recentContent = await db.query(`
      SELECT 
        ga.gen_article_id,
        ga.title,
        ga.account_id,
        ga.created_at,
        COUNT(gc.content_id) as prayer_count
      FROM ssnews_generated_articles ga
      LEFT JOIN ssnews_generated_content gc ON ga.gen_article_id = gc.based_on_gen_article_id 
        AND gc.prompt_category = 'prayer_points'
      WHERE ga.status = 'draft' 
        AND ga.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      GROUP BY ga.gen_article_id
      ORDER BY ga.created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n📊 Recent content (last 24 hours):`);
    recentContent.forEach(content => {
      const prayerStatus = content.prayer_count > 0 ? '✅ Has prayers' : '❌ Missing prayers';
      console.log(`  - "${content.title}" (ID: ${content.gen_article_id}) - ${prayerStatus}`);
    });
    
    console.log('\n✅ Prayer points configuration check complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Try regenerating content again - prayer points should now appear');
    console.log('2. Check the Content Review tab for any remaining duplicates');
    console.log('3. If duplicates persist, manually archive/delete the older versions');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing prayer points configuration:', error.message);
    console.error('Stack trace:', error.stack);
    await db.close();
    process.exit(1);
  }
}

fixPrayerPointsConfiguration(); 