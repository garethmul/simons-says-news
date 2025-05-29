import db from '../services/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixJobsJson() {
  try {
    console.log('🔄 Initializing database connection...');
    await db.initialize();
    
    console.log('🔄 Checking jobs table structure...');
    
    // First, check if the table exists
    const tableCheck = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ssnews_jobs' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (tableCheck.length === 0) {
      console.log('❌ Jobs table does not exist. Creating it...');
      
      // Create the jobs table with proper JSON columns
      await db.query(`
        CREATE TABLE IF NOT EXISTS ssnews_jobs (
          job_id INT AUTO_INCREMENT PRIMARY KEY,
          job_type ENUM('content_generation', 'full_cycle', 'news_aggregation', 'ai_analysis') NOT NULL,
          status ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'queued',
          priority INT DEFAULT 0,
          payload JSON NULL,
          results JSON NULL,
          error_message TEXT NULL,
          progress_percentage INT DEFAULT 0,
          progress_details TEXT NULL,
          worker_id VARCHAR(100) NULL,
          retry_count INT DEFAULT 0,
          max_retries INT DEFAULT 3,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          started_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by VARCHAR(100) DEFAULT 'system',
          INDEX idx_status (status),
          INDEX idx_job_type (job_type),
          INDEX idx_priority_created (priority DESC, created_at ASC),
          INDEX idx_created_at (created_at),
          INDEX idx_worker (worker_id)
        )
      `);
      
      console.log('✅ Jobs table created successfully!');
    } else {
      console.log('📊 Jobs table exists. Checking column types...');
      
      // Check if payload and results columns are JSON or TEXT
      const payloadColumn = tableCheck.find(col => col.COLUMN_NAME === 'payload');
      const resultsColumn = tableCheck.find(col => col.COLUMN_NAME === 'results');
      
      console.log(`Payload column type: ${payloadColumn?.DATA_TYPE}`);
      console.log(`Results column type: ${resultsColumn?.DATA_TYPE}`);
      
      // If columns are TEXT, we need to fix them
      if (payloadColumn && payloadColumn.DATA_TYPE === 'text') {
        console.log('🔄 Converting payload column from TEXT to JSON...');
        
        // First, fix any invalid JSON data
        await db.query(`
          UPDATE ssnews_jobs 
          SET payload = '{}' 
          WHERE payload = '[object Object]' 
          OR payload IS NULL 
          OR payload = ''
        `);
        
        // Convert column to JSON
        await db.query(`
          ALTER TABLE ssnews_jobs 
          MODIFY COLUMN payload JSON NULL
        `);
        
        console.log('✅ Payload column converted to JSON');
      }
      
      if (resultsColumn && resultsColumn.DATA_TYPE === 'text') {
        console.log('🔄 Converting results column from TEXT to JSON...');
        
        // First, fix any invalid JSON data
        await db.query(`
          UPDATE ssnews_jobs 
          SET results = NULL 
          WHERE results = '[object Object]' 
          OR results = ''
        `);
        
        // Convert column to JSON
        await db.query(`
          ALTER TABLE ssnews_jobs 
          MODIFY COLUMN results JSON NULL
        `);
        
        console.log('✅ Results column converted to JSON');
      }
    }
    
    // Clean up any remaining bad data
    console.log('🧹 Cleaning up invalid JSON data...');
    
    const badJobs = await db.query(`
      SELECT job_id, payload, results 
      FROM ssnews_jobs 
      WHERE payload LIKE '%[object Object]%' 
      OR results LIKE '%[object Object]%'
      LIMIT 10
    `);
    
    console.log(`Found ${badJobs.length} jobs with invalid JSON`);
    
    for (const job of badJobs) {
      try {
        // Try to parse and fix the payload
        let fixedPayload = {};
        if (job.payload && job.payload !== '[object Object]') {
          try {
            fixedPayload = JSON.parse(job.payload);
          } catch (e) {
            console.log(`Job ${job.job_id} has unparseable payload: ${job.payload}`);
          }
        }
        
        // Try to parse and fix the results
        let fixedResults = null;
        if (job.results && job.results !== '[object Object]') {
          try {
            fixedResults = JSON.parse(job.results);
          } catch (e) {
            console.log(`Job ${job.job_id} has unparseable results: ${job.results}`);
          }
        }
        
        // Update the job with fixed data
        await db.query(`
          UPDATE ssnews_jobs 
          SET payload = ?, results = ? 
          WHERE job_id = ?
        `, [JSON.stringify(fixedPayload), fixedResults ? JSON.stringify(fixedResults) : null, job.job_id]);
        
        console.log(`✅ Fixed job ${job.job_id}`);
      } catch (error) {
        console.error(`❌ Failed to fix job ${job.job_id}:`, error.message);
      }
    }
    
    console.log('✅ Jobs table JSON fix completed!');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing jobs JSON:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixJobsJson(); 