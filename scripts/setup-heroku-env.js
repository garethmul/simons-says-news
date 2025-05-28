import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';

// Load local .env file
dotenv.config();

// Variables that should NOT be copied to production
const EXCLUDE_VARS = [
  'VITE_API_URL',
  'FRONTEND_URL',
  'VITE_DEBUG_LEVEL',
  'VITE_DEBUG_CATEGORIES',
  'REACT_APP_DEBUG'
];

// Variables that need different values in production
const PRODUCTION_OVERRIDES = {
  NODE_ENV: 'production',
  SESSION_SECRET: 'CHANGE_THIS_IN_PRODUCTION', // Reminder to change
  FRONTEND_URL: 'https://your-app-name.herokuapp.com' // Will be updated
};

function setupHerokuEnv() {
  console.log('🔧 Configuring Heroku environment variables...');
  
  try {
    // Check if we're in a Heroku app directory
    const herokuRemotes = execSync('git remote -v', { encoding: 'utf8' });
    if (!herokuRemotes.includes('heroku')) {
      console.log('❌ No Heroku remote found. Run "heroku create" first.');
      return;
    }
    
    // Get current Heroku app name
    const appInfo = execSync('heroku apps:info --json', { encoding: 'utf8' });
    const appData = JSON.parse(appInfo);
    const appName = appData.name;
    
    console.log(`📱 Configuring app: ${appName}`);
    
    // Update production overrides with actual app name
    PRODUCTION_OVERRIDES.FRONTEND_URL = `https://${appName}.herokuapp.com`;
    
    // Process environment variables
    const envVars = [];
    
    for (const [key, value] of Object.entries(process.env)) {
      // Skip excluded variables
      if (EXCLUDE_VARS.includes(key)) {
        console.log(`⏭️  Skipping ${key} (development only)`);
        continue;
      }
      
      // Use production override if available
      const finalValue = PRODUCTION_OVERRIDES[key] || value;
      
      if (finalValue) {
        envVars.push(`${key}=${finalValue}`);
        
        // Warn about values that need manual update
        if (PRODUCTION_OVERRIDES[key] && key === 'SESSION_SECRET') {
          console.log(`⚠️  Remember to update ${key} with a secure production value`);
        }
      }
    }
    
    // Set all variables at once
    if (envVars.length > 0) {
      const configCommand = `heroku config:set ${envVars.join(' ')}`;
      console.log('🚀 Setting environment variables...');
      execSync(configCommand, { stdio: 'inherit' });
      console.log('✅ Environment variables configured');
    }
    
    // Display current config
    console.log('\n📋 Current Heroku config:');
    execSync('heroku config', { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Error configuring Heroku environment:', error.message);
  }
}

setupHerokuEnv(); 