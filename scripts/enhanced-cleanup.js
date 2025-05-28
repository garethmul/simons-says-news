import { exec } from 'child_process';
import { platform } from 'os';
import { promisify } from 'util';
import fs from 'fs';
import { PORTS } from '../ports.config.js';

const execAsync = promisify(exec);
const isWindows = platform() === 'win32';

// Import your port configuration
const PORTS_TO_CLEAN = [PORTS.FRONTEND, PORTS.BACKEND, PORTS.HMR];

async function killProcessOnPort(port) {
  try {
    if (isWindows) {
      const findCmd = `netstat -ano | findstr :${port}`;
      const { stdout } = await execAsync(findCmd);
      
      if (stdout) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 4) {
            const pid = parts[4];
            if (pid && pid !== '0') {
              await execAsync(`taskkill /F /PID ${pid}`);
              console.log(`✅ Killed process ${pid} on port ${port}`);
            }
          }
        }
      }
    } else {
      await execAsync(`lsof -ti:${port} | xargs kill -9`);
      console.log(`✅ Killed process on port ${port}`);
    }
  } catch (error) {
    console.log(`ℹ️  No process found on port ${port}`);
  }
}

async function cleanupNodeModules() {
  try {
    if (fs.existsSync('node_modules')) {
      console.log('🧹 Cleaning node_modules...');
      if (isWindows) {
        await execAsync('rmdir /s /q node_modules');
      } else {
        await execAsync('rm -rf node_modules');
      }
      console.log('✅ node_modules cleaned');
    }
  } catch (error) {
    console.error('❌ Error cleaning node_modules:', error.message);
  }
}

async function cleanupCache() {
  try {
    console.log('🧹 Cleaning caches...');
    
    // Clean npm cache
    await execAsync('npm cache clean --force');
    
    // Clean Vite cache
    if (fs.existsSync('node_modules/.vite')) {
      if (isWindows) {
        await execAsync('rmdir /s /q node_modules\\.vite');
      } else {
        await execAsync('rm -rf node_modules/.vite');
      }
    }
    
    // Clean dist folder
    if (fs.existsSync('dist')) {
      if (isWindows) {
        await execAsync('rmdir /s /q dist');
      } else {
        await execAsync('rm -rf dist');
      }
    }
    
    console.log('✅ Caches cleaned');
  } catch (error) {
    console.error('❌ Error cleaning caches:', error.message);
  }
}

async function enhancedCleanup() {
  console.log('🚀 Starting enhanced cleanup...');
  
  // Kill processes on ports
  console.log('🔪 Killing processes on ports...');
  await Promise.all(PORTS_TO_CLEAN.map(port => killProcessOnPort(port)));
  
  // Clean caches
  await cleanupCache();
  
  // Optionally clean node_modules (uncomment if needed)
  // await cleanupNodeModules();
  
  console.log('✅ Enhanced cleanup complete!');
}

enhancedCleanup().catch(console.error); 