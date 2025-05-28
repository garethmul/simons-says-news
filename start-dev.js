import { spawn, exec } from 'child_process';
import { platform } from 'os';
import { promisify } from 'util';
import fs from 'fs';
import { PORTS } from './ports.config.js';

const execAsync = promisify(exec);
const isWindows = platform() === 'win32';

// Ports to clean up
const PORTS_TO_KILL = [PORTS.FRONTEND, PORTS.BACKEND, PORTS.HMR];

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

async function createNodemonConfig() {
  const nodemonConfig = {
    restartable: "rs",
    ignore: [
      ".git",
      "node_modules/**/node_modules",
      "dist",
      "src/components/**/*",
      "src/pages/**/*",
      "src/assets/**/*",
      "src/hooks/**/*",
      "src/styles/**/*",
      "src/App.jsx",
      "src/main.jsx",
      "src/index.css",
      "*.test.js"
    ],
    verbose: true,
    watch: [
      "src/routes/",
      "src/config/",
      "src/utils/",
      "src/models/",
      "src/middleware/",
      "src/services/",
      "src/socket/",
      "server.js"
    ],
    ext: "js,jsx,json",
    delay: "1000",
    env: {
      NODE_ENV: "development"
    }
  };

  fs.writeFileSync('nodemon.json', JSON.stringify(nodemonConfig, null, 2));
  console.log('📝 Created nodemon.json configuration');
}

async function startDevelopment() {
  console.log('🚀 Starting development environment...\n');

  // Kill existing processes
  console.log('🔪 Cleaning up existing processes...');
  await Promise.all(PORTS_TO_KILL.map(port => killProcessOnPort(port)));

  // Create nodemon config
  await createNodemonConfig();

  console.log('\n🔧 Starting servers...');

  // Start backend server
  console.log(`🖥️  Starting backend server on port ${PORTS.BACKEND}...`);
  const backendProcess = spawn('npm', ['run', 'server'], {
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: true
  });

  // Wait a moment for backend to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Start frontend server
  console.log(`🌐 Starting frontend server on port ${PORTS.FRONTEND}...`);
  const frontendProcess = spawn('npm', ['run', 'client'], {
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: true
  });

  // Handle process cleanup
  const cleanup = () => {
    console.log('\n🛑 Shutting down development servers...');
    
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill('SIGTERM');
    }
    
    if (frontendProcess && !frontendProcess.killed) {
      frontendProcess.kill('SIGTERM');
    }
    
    // Force kill after timeout
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
      if (frontendProcess && !frontendProcess.killed) {
        frontendProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  };

  // Handle shutdown signals
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  // Handle process errors
  backendProcess.on('error', (error) => {
    console.error('❌ Backend process error:', error);
  });

  frontendProcess.on('error', (error) => {
    console.error('❌ Frontend process error:', error);
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Backend process exited with code ${code}`);
    }
  });

  frontendProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Frontend process exited with code ${code}`);
    }
  });

  console.log('\n✅ Development environment started!');
  console.log(`🌐 Frontend: http://localhost:${PORTS.FRONTEND}`);
  console.log(`🔗 Backend: http://localhost:${PORTS.BACKEND}`);
  console.log(`💡 Press Ctrl+C to stop all servers\n`);
}

// Start development environment
startDevelopment().catch(console.error); 