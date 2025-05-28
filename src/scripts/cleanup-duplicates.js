import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function cleanupDuplicates() {
  let connection;
  
  try {
    console.log('🧹 Starting duplicate cleanup...');
    
    // Create database connection
    const sslConfig = process.env.NODE_ENV === 'production' 
      ? {
          ca: process.env.MYSQL_SSL_CA,
          rejectUnauthorized: false
        }
      : process.env.MYSQL_SSL_CA 
        ? { ca: process.env.MYSQL_SSL_CA }
        : false;

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslConfig,
      timezone: 'Z'
    });

    console.log('✅ Connected to database');

    // First, let's see how many duplicates we have
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM ssnews_news_sources'
    );
    console.log(`📊 Total news sources before cleanup: ${countResult[0].total}`);

    // Get duplicate sources (keep the oldest one for each name)
    const [duplicates] = await connection.execute(`
      SELECT source_id, name, created_at,
             ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as row_num
      FROM ssnews_news_sources
    `);

    // Delete duplicates (keep row_num = 1, delete others)
    const duplicateIds = duplicates
      .filter(row => row.row_num > 1)
      .map(row => row.source_id);

    if (duplicateIds.length > 0) {
      console.log(`🗑️  Deleting ${duplicateIds.length} duplicate sources...`);
      
      // Delete duplicate sources
      await connection.execute(
        `DELETE FROM ssnews_news_sources WHERE source_id IN (${duplicateIds.map(() => '?').join(',')})`,
        duplicateIds
      );
      
      console.log(`✅ Deleted ${duplicateIds.length} duplicate sources`);
    } else {
      console.log('✅ No duplicates found');
    }

    // Check final count
    const [finalCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM ssnews_news_sources'
    );
    console.log(`📊 Total news sources after cleanup: ${finalCount[0].total}`);

    // Show remaining sources
    const [sources] = await connection.execute(
      'SELECT source_id, name, url FROM ssnews_news_sources ORDER BY source_id'
    );
    
    console.log('\n📋 Remaining news sources:');
    sources.forEach(source => {
      console.log(`  ${source.source_id}: ${source.name}`);
    });

    console.log('\n🎉 Cleanup complete!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run cleanup
cleanupDuplicates(); 