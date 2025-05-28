import { execSync } from 'child_process';
import path from 'path';

function setupAutoDeploy() {
  const projectName = path.basename(process.cwd());
  
  console.log('🔄 Setting up automatic deployment...');
  
  try {
    // Get Heroku app info
    const appInfo = execSync('heroku apps:info --json', { encoding: 'utf8' });
    const appData = JSON.parse(appInfo);
    const appName = appData.name;
    
    // Get GitHub repository info
    const gitRemote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const repoMatch = gitRemote.match(/github\.com[:/](.+)\/(.+)\.git/);
    
    if (!repoMatch) {
      console.log('❌ Could not determine GitHub repository from remote URL');
      return;
    }
    
    const [, owner, repo] = repoMatch;
    
    console.log(`📱 Heroku app: ${appName}`);
    console.log(`📦 GitHub repo: ${owner}/${repo}`);
    
    // Enable required Heroku features
    try {
      execSync('heroku labs:enable runtime-dyno-metadata', { stdio: 'ignore' });
    } catch {
      // Feature might already be enabled
    }
    
    // Set app name in config for reference
    execSync(`heroku config:set HEROKU_APP_NAME=${appName}`, { stdio: 'inherit' });
    
    console.log('\n🌐 To complete automatic deployment setup:');
    console.log(`1. Visit: https://dashboard.heroku.com/apps/${appName}/deploy/github`);
    console.log(`2. Connect to GitHub repository: ${owner}/${repo}`);
    console.log('3. Enable "Automatic deploys" from main branch');
    console.log('4. Optionally enable "Wait for CI to pass before deploy"');
    
    // Open browser automatically (optional)
    const shouldOpen = process.argv.includes('--open');
    if (shouldOpen) {
      const url = `https://dashboard.heroku.com/apps/${appName}/deploy/github`;
      console.log(`\n🌐 Opening browser to: ${url}`);
      
      // Cross-platform browser opening
      const command = process.platform === 'win32' ? 'start' : 
                     process.platform === 'darwin' ? 'open' : 'xdg-open';
      execSync(`${command} "${url}"`, { stdio: 'ignore' });
    }
    
  } catch (error) {
    console.error('❌ Error setting up auto-deploy:', error.message);
  }
}

setupAutoDeploy(); 