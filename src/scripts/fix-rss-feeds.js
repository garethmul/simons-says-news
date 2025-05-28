import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixRSSFeeds() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'simons_says_news',
      charset: 'utf8mb4'
    });

    console.log('✅ Connected to database');

    // Show current RSS feed URLs
    console.log('\n📋 Current RSS feed URLs:');
    const [currentSources] = await connection.execute(
      'SELECT name, rss_feed_url FROM ssnews_news_sources ORDER BY name'
    );
    
    currentSources.forEach(source => {
      console.log(`  ${source.name}: ${source.rss_feed_url || 'NULL'}`);
    });

    // Fix Christian Today UK RSS feed URL
    console.log('\n🔧 Fixing Christian Today UK RSS feed URL...');
    await connection.execute(
      'UPDATE ssnews_news_sources SET rss_feed_url = ? WHERE name = ?',
      ['https://www.christiantoday.com/rss.xml', 'Christian Today UK']
    );
    console.log('✅ Updated Christian Today UK RSS feed URL');

    // Add Baptist Times RSS feed URL (if they have one)
    console.log('\n🔧 Adding Baptist Times RSS feed URL...');
    await connection.execute(
      'UPDATE ssnews_news_sources SET rss_feed_url = ? WHERE name = ?',
      ['https://www.baptist.org.uk/news/rss', 'Baptist Times']
    );
    console.log('✅ Added Baptist Times RSS feed URL');

    // Try to fix Evangelical Alliance RSS feed URL
    console.log('\n🔧 Updating Evangelical Alliance RSS feed URL...');
    await connection.execute(
      'UPDATE ssnews_news_sources SET rss_feed_url = ? WHERE name = ?',
      ['https://www.eauk.org/news/rss.xml', 'Evangelical Alliance']
    );
    console.log('✅ Updated Evangelical Alliance RSS feed URL');

    // Update Premier Christian News to try different URL
    console.log('\n🔧 Updating Premier Christian News RSS feed URL...');
    await connection.execute(
      'UPDATE ssnews_news_sources SET rss_feed_url = ? WHERE name = ?',
      ['https://premierchristianity.com/rss', 'Premier Christian News']
    );
    console.log('✅ Updated Premier Christian News RSS feed URL');

    // Update UCB RSS feed URL
    console.log('\n🔧 Updating UCB RSS feed URL...');
    await connection.execute(
      'UPDATE ssnews_news_sources SET rss_feed_url = ? WHERE name = ?',
      ['https://www.ucb.co.uk/news/rss', 'UCB']
    );
    console.log('✅ Updated UCB RSS feed URL');

    // Show updated RSS feed URLs
    console.log('\n📋 Updated RSS feed URLs:');
    const [updatedSources] = await connection.execute(
      'SELECT name, rss_feed_url FROM ssnews_news_sources ORDER BY name'
    );
    
    updatedSources.forEach(source => {
      console.log(`  ${source.name}: ${source.rss_feed_url || 'NULL'}`);
    });

    console.log('\n🎉 RSS feed URLs updated successfully!');
    console.log('\n💡 Next steps:');
    console.log('  1. Test the updated RSS feeds');
    console.log('  2. Run news aggregation to see if more sources work');
    console.log('  3. Monitor source performance over time');

  } catch (error) {
    console.error('❌ RSS feed fix failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
fixRSSFeeds(); 