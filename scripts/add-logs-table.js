import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addLogsTable() {
  let connection;
  
  try {
    console.log('🔧 Adding system logs table to database...');
    
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

    // Create the logs table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ssnews_system_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        level ENUM('info', 'warn', 'error', 'debug') NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        source VARCHAR(100) DEFAULT 'server',
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_timestamp (timestamp),
        INDEX idx_level (level),
        INDEX idx_source (source)
      )
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Created ssnews_system_logs table');

    // Check if table was created successfully
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'ssnews_system_logs'
    `, [process.env.DB_NAME]);

    if (rows[0].count > 0) {
      console.log('🎉 System logs table setup complete!');
      console.log('📋 Table: ssnews_system_logs');
      console.log('   - Columns: log_id, timestamp, level, message, source, metadata, created_at');
      console.log('   - Indexes: timestamp, level, source');
      console.log('   - Ready for database-based logging');
    } else {
      console.error('❌ Table creation verification failed');
    }

  } catch (error) {
    console.error('❌ Error adding logs table:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
addLogsTable(); 