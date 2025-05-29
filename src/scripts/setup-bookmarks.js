import db from '../services/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function setupBookmarks() {
  try {
    console.log('🔄 Initializing database connection...');
    await db.initialize();
    
    console.log('📊 Creating bookmarks table...');
    
    // Create the bookmarks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS ssnews_user_bookmarks (
        bookmark_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        user_email VARCHAR(255) NULL,
        article_id INT NOT NULL,
        bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES ssnews_scraped_articles(article_id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_article (user_id, article_id),
        INDEX idx_user_id (user_id),
        INDEX idx_article_id (article_id),
        INDEX idx_bookmarked_at (bookmarked_at)
      )
    `);
    
    console.log('✅ Bookmarks table created successfully!');
    
    // Check if the table was created properly
    const tableInfo = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ssnews_user_bookmarks' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📋 Table structure:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''}`);
    });
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up bookmarks:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupBookmarks(); 