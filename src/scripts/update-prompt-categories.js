import db from '../services/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function updatePromptCategories() {
  try {
    console.log('🔄 Initializing database connection...');
    await db.initialize();
    
    console.log('🔄 Updating prompt categories...');
    
    // First, ensure prompt management tables exist
    console.log('📊 Creating prompt management tables if they don\'t exist...');
    
    // Run the prompt management schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS ssnews_prompt_templates (
        template_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        category ENUM('blog_post', 'social_media', 'video_script', 'analysis') NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);
    
    console.log('✅ Prompt templates table created/verified');
    
    // Now update the category column to include new categories
    console.log('🔄 Updating category column to include new categories...');
    
    await db.query(`
      ALTER TABLE ssnews_prompt_templates 
      MODIFY COLUMN category ENUM(
        'blog_post', 
        'social_media', 
        'video_script', 
        'analysis',
        'prayer',
        'image_generation',
        'devotional',
        'newsletter',
        'sermon'
      ) NOT NULL
    `);
    
    console.log('✅ Category column updated successfully!');
    console.log('📝 New categories available:');
    console.log('  - prayer (for Prayer Points)');
    console.log('  - image_generation');
    console.log('  - devotional');
    console.log('  - newsletter');
    console.log('  - sermon');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating categories:', error.message);
    process.exit(1);
  }
}

// Run the update
updatePromptCategories(); 