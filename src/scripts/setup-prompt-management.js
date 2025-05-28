import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

async function setupPromptManagement() {
  let connection;
  
  try {
    console.log('🔧 Setting up prompt management system...');
    
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

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'prompt-management-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✅ Executed statement successfully');
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
            console.log('ℹ️ Table/data already exists, skipping...');
            continue;
          }
          throw error;
        }
      }
    }

    console.log('🎉 Prompt management system setup complete!');
    console.log('📋 Created tables:');
    console.log('   - ssnews_prompt_templates');
    console.log('   - ssnews_prompt_versions');
    console.log('   - ssnews_content_generation_log');
    console.log('✅ Inserted default prompt templates');

  } catch (error) {
    console.error('❌ Error setting up prompt management:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupPromptManagement(); 