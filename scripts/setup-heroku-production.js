#!/usr/bin/env node

import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load local environment variables
dotenv.config();

console.log('🚀 Setting up Heroku environment variables for production...');

const herokuAppName = 'simons-says-news';
const herokuUrl = `https://${herokuAppName}.herokuapp.com`;

const envVars = {
  // Environment
  NODE_ENV: 'production',
  FRONTEND_URL: herokuUrl,
  
  // Database (copy from local .env)
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  MYSQL_SSL_CA: process.env.MYSQL_SSL_CA,
  
  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
  MAX_OUTPUT_TOKENS: process.env.MAX_OUTPUT_TOKENS || '32000',
  
  // Image Services
  PEXELS_API_KEY: process.env.PEXELS_API_KEY,
  IDEOGRAM_API_KEY: process.env.IDEOGRAM_API_KEY,
  SIRV_CLIENT_ID: process.env.SIRV_CLIENT_ID,
  SIRV_CLIENT_SECRET: process.env.SIRV_CLIENT_SECRET,
  SIRV_PUBLIC_URL: process.env.SIRV_PUBLIC_URL,
  
  // Security
  SESSION_SECRET: 'heroku-production-secret-' + Math.random().toString(36).substring(7),
  
  // Other APIs
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  ISBNDB_COM_API_KEY: process.env.ISBNDB_COM_API_KEY,
  FRESHSALES_API_KEY: process.env.FRESHSALES_API_KEY,
  FRESHSALES_TRANSACTIONAL_API_KEY: process.env.FRESHSALES_TRANSACTIONAL_API_KEY,
  FRESHSALES_DOMAIN: process.env.FRESHSALES_DOMAIN,
  FRESHSALES_INVITATION_TEMPLATE_ID: process.env.FRESHSALES_INVITATION_TEMPLATE_ID,
  FRESHSALES_PASSWORD_RESET_TEMPLATE_ID: process.env.FRESHSALES_PASSWORD_RESET_TEMPLATE_ID,
  
  // Configuration
  MAX_CONCURRENT_JOBS: process.env.MAX_CONCURRENT_JOBS || '5',
  ENABLE_MEDIA_PROMPT_EXTRACTION: process.env.ENABLE_MEDIA_PROMPT_EXTRACTION || 'true',
  ENABLE_MEDIA_GENERATION_SERVICE: process.env.ENABLE_MEDIA_GENERATION_SERVICE || 'true'
};

console.log('\n📝 Setting environment variables on Heroku...');

for (const [key, value] of Object.entries(envVars)) {
  if (value && value !== 'undefined') {
    try {
      // Escape quotes and special characters for shell
      const escapedValue = value.toString().replace(/"/g, '\\"');
      const command = `heroku config:set ${key}="${escapedValue}" --app ${herokuAppName}`;
      
      console.log(`Setting ${key}...`);
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      console.error(`❌ Failed to set ${key}:`, error.message);
    }
  } else {
    console.warn(`⚠️ Skipping ${key} (not set in local environment)`);
  }
}

console.log('\n✅ Heroku environment variables configured!');
console.log('\n🔧 Next steps:');
console.log('1. Commit your changes: git add . && git commit -m "Fix Heroku deployment issues"');
console.log('2. Deploy to Heroku: git push heroku main');
console.log(`3. Check the app: ${herokuUrl}`);
console.log('4. Monitor logs: heroku logs --tail --app ' + herokuAppName); 