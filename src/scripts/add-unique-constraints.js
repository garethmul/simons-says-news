import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addUniqueConstraints() {
  let connection;
  
  try {
    console.log('🔧 Adding unique constraints to news sources table...');
    
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

    // First clean up any duplicates
    console.log('🧹 Cleaning up duplicates first...');
    
    const [duplicates] = await connection.execute(`
      SELECT source_id, name, created_at,
             ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as row_num
      FROM ssnews_news_sources
    `);

    const duplicateIds = duplicates
      .filter(row => row.row_num > 1)
      .map(row => row.source_id);

    if (duplicateIds.length > 0) {
      console.log(`🗑️  Deleting ${duplicateIds.length} duplicate sources...`);
      await connection.execute(
        `DELETE FROM ssnews_news_sources WHERE source_id IN (${duplicateIds.map(() => '?').join(',')})`,
        duplicateIds
      );
    }

    // Add unique constraint on name
    try {
      console.log('🔧 Adding unique constraint on name...');
      await connection.execute('ALTER TABLE ssnews_news_sources ADD UNIQUE KEY unique_name (name)');
      console.log('✅ Added unique constraint on name');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Unique constraint on name already exists');
      } else {
        throw error;
      }
    }

    // Add unique constraint on url
    try {
      console.log('🔧 Adding unique constraint on url...');
      await connection.execute('ALTER TABLE ssnews_news_sources ADD UNIQUE KEY unique_url (url)');
      console.log('✅ Added unique constraint on url');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Unique constraint on url already exists');
      } else {
        throw error;
      }
    }

    // Add indexes
    try {
      console.log('🔧 Adding index on name...');
      await connection.execute('ALTER TABLE ssnews_news_sources ADD INDEX idx_name (name)');
      console.log('✅ Added index on name');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index on name already exists');
      } else {
        throw error;
      }
    }

    try {
      console.log('🔧 Adding index on is_active...');
      await connection.execute('ALTER TABLE ssnews_news_sources ADD INDEX idx_active (is_active)');
      console.log('✅ Added index on is_active');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index on is_active already exists');
      } else {
        throw error;
      }
    }

    // Check final state
    const [finalCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM ssnews_news_sources'
    );
    console.log(`📊 Final news sources count: ${finalCount[0].total}`);

    console.log('\n🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
addUniqueConstraints(); 