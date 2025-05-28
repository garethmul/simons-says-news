import { exec } from 'child_process';
import { platform } from 'os';
import { promisify } from 'util';
import { PORTS } from '../ports.config.js';

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

async function killPorts() {
  console.log('🔪 Killing processes on configured ports...');
  await Promise.all(PORTS_TO_KILL.map(port => killProcessOnPort(port)));
  console.log('✅ Port cleanup complete');
}

killPorts().catch(console.error); 