#!/usr/bin/env node

import db from './src/services/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

async function applyEnhancedLogging() {
  try {
    console.log('🔧 Applying enhanced AI response logging schema...');
    
    // Initialize database connection
    await db.initialize();
    
    // Read and execute the enhanced logging schema
    const schemaPath = path.join(__dirname, 'src/scripts/enhanced-ai-logging.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.query(statement);
          console.log('✅ Executed statement successfully');
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
              error.code === 'ER_DUP_ENTRY' ||
              error.code === 'ER_DUP_KEYNAME') {
            console.log('ℹ️ Table/index already exists, skipping...');
            continue;
          }
          console.error('❌ Error executing statement:', error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('🎉 Enhanced AI response logging setup complete!');
    console.log('📋 Created table: ssnews_ai_response_log');
    console.log('📊 Created views: v_truncated_responses, v_generation_summary');
    console.log('');
    console.log('💡 The system will now capture:');
    console.log('   - Full prompts and responses');
    console.log('   - Stop reasons (STOP, MAX_TOKENS, SAFETY, etc.)');
    console.log('   - Token usage details');
    console.log('   - Truncation detection');
    console.log('   - Safety filter information');
    console.log('');
    console.log('🔍 Query examples:');
    console.log('   - SELECT * FROM v_truncated_responses;');
    console.log('   - SELECT * FROM v_generation_summary;');
    console.log('   - SELECT * FROM ssnews_ai_response_log WHERE stop_reason != "STOP";');

  } catch (error) {
    console.error('❌ Error applying enhanced logging schema:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

applyEnhancedLogging(); 