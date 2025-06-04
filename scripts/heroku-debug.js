#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Heroku Deployment Debug Information');
console.log('=====================================');

console.log('\n📱 Environment:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('PORT:', process.env.PORT || 'undefined');

console.log('\n🗄️ Database Configuration:');
console.log('DB_HOST:', process.env.DB_HOST ? '✅ Set' : '❌ Missing');
console.log('DB_PORT:', process.env.DB_PORT ? '✅ Set' : '❌ Missing');
console.log('DB_USER:', process.env.DB_USER ? '✅ Set' : '❌ Missing');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Set' : '❌ Missing');
console.log('DB_NAME:', process.env.DB_NAME ? '✅ Set' : '❌ Missing');
console.log('MYSQL_SSL_CA:', process.env.MYSQL_SSL_CA ? '✅ Set' : '❌ Missing');

console.log('\n🤖 AI Services:');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('IDEOGRAM_API_KEY:', process.env.IDEOGRAM_API_KEY ? '✅ Set' : '❌ Missing');

console.log('\n🖼️ Image Services:');
console.log('PEXELS_API_KEY:', process.env.PEXELS_API_KEY ? '✅ Set' : '❌ Missing');
console.log('SIRV_CLIENT_ID:', process.env.SIRV_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('SIRV_CLIENT_SECRET:', process.env.SIRV_CLIENT_SECRET ? '✅ Set' : '❌ Missing');

console.log('\n🔐 Security:');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing');
console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);

console.log('\n🌐 Frontend Configuration:');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'undefined');

// Test database connection
console.log('\n🧪 Testing Database Connection...');
import mysql from 'mysql2/promise';

async function testDatabaseConnection() {
  try {
    const sslConfig = process.env.NODE_ENV === 'production' 
      ? {
          ca: process.env.MYSQL_SSL_CA,
          rejectUnauthorized: false
        }
      : process.env.MYSQL_SSL_CA 
        ? { ca: process.env.MYSQL_SSL_CA }
        : false;

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslConfig,
      connectTimeout: 10000
    });

    console.log('✅ Database connection successful');
    await connection.end();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

testDatabaseConnection(); 