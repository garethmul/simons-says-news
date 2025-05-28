import { execSync } from 'child_process';
import path from 'path';

function setupHeroku() {
  const projectName = path.basename(process.cwd());
  
  console.log(`🚀 Setting up Heroku app: ${projectName}`);
  
  try {
    // Check if Heroku CLI is available
    execSync('heroku --version', { stdio: 'ignore' });
    
    // Try to create app with project name
    try {
      execSync(`heroku create ${projectName}`, { stdio: 'inherit' });
      console.log(`✅ Created Heroku app: ${projectName}`);
      return projectName;
    } catch {
      // If name is taken, try with suffix
      const appNameWithSuffix = `${projectName}-app`;
      try {
        execSync(`heroku create ${appNameWithSuffix}`, { stdio: 'inherit' });
        console.log(`✅ Created Heroku app: ${appNameWithSuffix}`);
        return appNameWithSuffix;
      } catch {
        console.log('❌ Both app names are taken. Please choose manually:');
        console.log(`heroku create ${projectName}-YOUR_SUFFIX`);
        return null;
      }
    }
    
  } catch (error) {
    console.error('❌ Heroku CLI not found. Please install: https://devcenter.heroku.com/articles/heroku-cli');
    return null;
  }
}

const appName = setupHeroku();
if (appName) {
  console.log(`\n📝 Your Heroku app URL: https://${appName}.herokuapp.com`);
  console.log(`\n🔧 Next steps:`);
  console.log(`1. Run: npm run setup:heroku-env`);
  console.log(`2. Run: npm run setup:auto-deploy`);
} 