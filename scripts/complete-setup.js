import { execSync } from 'child_process';
import path from 'path';

async function completeSetup() {
  const projectName = path.basename(process.cwd());
  
  console.log(`🚀 Complete setup for project: ${projectName}\n`);
  
  try {
    // Step 1: GitHub setup
    console.log('📦 Step 1: Setting up GitHub repository...');
    execSync('node scripts/setup-github.js', { stdio: 'inherit' });
    
    // Step 2: Heroku app creation
    console.log('\n📱 Step 2: Creating Heroku app...');
    execSync('node scripts/setup-heroku.js', { stdio: 'inherit' });
    
    // Step 3: Environment variables
    console.log('\n🔧 Step 3: Configuring environment variables...');
    execSync('node scripts/setup-heroku-env.js', { stdio: 'inherit' });
    
    // Step 4: Auto-deployment
    console.log('\n🔄 Step 4: Setting up auto-deployment...');
    execSync('node scripts/setup-auto-deploy.js --open', { stdio: 'inherit' });
    
    console.log('\n✅ Complete setup finished!');
    console.log('\n📋 Next steps:');
    console.log('1. Complete GitHub integration in the opened browser tab');
    console.log('2. Review and update production environment variables');
    console.log('3. Push changes to trigger first deployment');
    console.log('4. Monitor deployment at Heroku dashboard');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

completeSetup(); 