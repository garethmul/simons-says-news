import { PORTS } from '../ports.config.js';

async function checkHealth() {
  console.log('🏥 Running health check...\n');
  
  try {
    // Import fetch for Node.js compatibility
    const fetch = (await import('node-fetch')).default;
    
    // Check backend health
    console.log(`🔍 Checking backend server (http://localhost:${PORTS.BACKEND})...`);
    const backendResponse = await fetch(`http://localhost:${PORTS.BACKEND}/api/health`, {
      timeout: 5000
    });
    
    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log('✅ Backend server is healthy');
      console.log(`   Status: ${data.status}`);
      console.log(`   Environment: ${data.environment}`);
      console.log(`   Port: ${data.port}`);
    } else {
      console.log(`❌ Backend server returned status: ${backendResponse.status}`);
    }
    
    // Check frontend
    console.log(`\n🔍 Checking frontend server (http://localhost:${PORTS.FRONTEND})...`);
    const frontendResponse = await fetch(`http://localhost:${PORTS.FRONTEND}`, {
      timeout: 5000
    });
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend server is healthy');
      console.log(`   Status: ${frontendResponse.status}`);
      console.log(`   Content-Type: ${frontendResponse.headers.get('content-type')}`);
    } else {
      console.log(`❌ Frontend server returned status: ${frontendResponse.status}`);
    }
    
    console.log('\n🎉 Health check complete!');
    console.log(`🌐 Frontend: http://localhost:${PORTS.FRONTEND}`);
    console.log(`🔗 Backend API: http://localhost:${PORTS.BACKEND}/api`);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   • Make sure both servers are running: npm run dev');
    console.log('   • Check if ports are available');
    console.log('   • Verify environment variables in .env');
    console.log('   • Try restarting: npm run restart');
  }
}

checkHealth(); 