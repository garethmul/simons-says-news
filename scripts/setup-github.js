import { execSync } from 'child_process';
import path from 'path';

function setupGitHub() {
  const projectName = path.basename(process.cwd());
  
  console.log(`🚀 Setting up GitHub repository: ${projectName}`);
  
  try {
    // Check if git is initialized
    try {
      execSync('git status', { stdio: 'ignore' });
    } catch {
      console.log('📝 Initializing git repository...');
      execSync('git init');
    }
    
    // Check if GitHub CLI is available
    try {
      execSync('gh --version', { stdio: 'ignore' });
      
      // Create repository with GitHub CLI
      console.log('📦 Creating GitHub repository...');
      execSync(`gh repo create ${projectName} --public --source=. --remote=origin --push`, { stdio: 'inherit' });
      
    } catch {
      console.log('❌ GitHub CLI not found. Please:');
      console.log('1. Install GitHub CLI: https://cli.github.com/');
      console.log('2. Or create repository manually on GitHub.com');
      console.log(`3. Repository name should be: ${projectName}`);
      
      // Prepare for manual setup
      execSync('git add .');
      execSync('git commit -m "Initial commit: project setup"');
      
      console.log('\n📋 Manual setup commands:');
      console.log(`git remote add origin https://github.com/YOUR_USERNAME/${projectName}.git`);
      console.log('git branch -M main');
      console.log('git push -u origin main');
    }
    
  } catch (error) {
    console.error('❌ Error setting up GitHub:', error.message);
  }
}

setupGitHub(); 