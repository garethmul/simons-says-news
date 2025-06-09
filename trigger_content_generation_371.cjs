// Import required services - we'll directly use the services instead of the API
const jobManagerPath = './src/services/jobManager.js';
const contentGeneratorPath = './src/services/contentGenerator.js';
const dbPath = './src/services/database.js';

// Since we're using CommonJS, we need to dynamically import the ES modules
async function triggerContentGeneration() {
  console.log('🚀 Starting direct content generation for Article 371...');
  
  try {
    // Dynamic imports for ES modules
    const { default: db } = await import(dbPath);
    const { default: jobManager } = await import(jobManagerPath);
    
    console.log('📡 Initializing database connection...');
    await db.initialize();
    
    console.log('⚙️ Creating content generation job...');
    
    // Create a content generation job directly
    const jobId = await jobManager.createJob(
      'content_generation',
      { specificStoryId: 371 },
      1, // priority
      'script',
      '56a17e9b-2274-40cc-8c83-4979e8df671a' // account ID
    );
    
    console.log(`✅ Job created successfully! Job ID: ${jobId}`);
    console.log(`📊 You can track this job through the UI or logs`);
    
    // Check job status immediately
    const job = await jobManager.getJob(jobId);
    console.log(`📋 Job Status: ${job.status}`);
    console.log(`📅 Created: ${job.created_at}`);
    
    console.log('\n🔍 Next steps:');
    console.log('1. Monitor job progress through server logs');
    console.log('2. Check database for generated content');
    console.log('3. Verify all 8 content types are created');
    console.log('4. Confirm image generation works');
    
    await db.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

triggerContentGeneration(); 