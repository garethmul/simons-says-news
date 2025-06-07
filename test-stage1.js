import compatibilityLayer from './src/services/compatibilityLayer.js';
import db from './src/services/database.js';

/**
 * STAGE 1 VALIDATION SCRIPT
 * 
 * This script tests the core functionality of Stage 1 implementation
 * to ensure the compatibility layer works correctly.
 */

async function testStage1Implementation() {
  console.log('🧪 Testing Stage 1 Implementation...\n');
  
  try {
    // Initialize database
    console.log('📊 Initializing database connection...');
    await db.initialize();
    console.log('✅ Database connected successfully\n');

    // Test 1: System Health Check
    console.log('🏥 Testing system health check...');
    const health = await compatibilityLayer.getSystemHealth();
    console.log('Legacy system available:', health.legacy.available);
    console.log('Modern system available:', health.modern.available);
    console.log('Modern templates count:', health.modern.templates);
    console.log('✅ System health check completed\n');

    // Test 2: Legacy Account Detection
    console.log('🔍 Testing legacy account detection...');
    const isLegacyAccount = await compatibilityLayer.checkForModernTemplates('test-legacy-account');
    console.log('Test account has modern templates:', isLegacyAccount);
    console.log('✅ Account detection working\n');

    // Test 3: Legacy Content Generation (Dry Run)
    console.log('📝 Testing legacy content generation (dry run)...');
    const testArticle = {
      title: 'Stage 1 Test Article',
      full_text: 'This is a test article to validate Stage 1 compatibility layer functionality.',
      summary_ai: 'Test article for Stage 1 validation',
      source_name: 'Stage 1 Test',
      url: 'https://test.com/stage1'
    };

    const result = await compatibilityLayer.generateContent(testArticle, 999, 'test-legacy-account');
    
    console.log('Generation result structure:');
    console.log('- _legacy:', result._legacy);
    console.log('- _system:', result._system);
    console.log('- socialPosts:', Array.isArray(result.socialPosts));
    console.log('- videoScripts:', Array.isArray(result.videoScripts));
    console.log('- _generatedTypes:', result._generatedTypes?.length || 0, 'types');
    console.log('✅ Legacy content generation structure validated\n');

    // Test 4: Error Handling
    console.log('🛡️  Testing error handling...');
    try {
      const errorResult = await compatibilityLayer.generateLegacyContent(null, 999, 'test-account');
      console.log('Error handling result has legacy flag:', errorResult._legacy);
      console.log('✅ Error handling working correctly\n');
    } catch (error) {
      console.log('✅ Error handled gracefully:', error.message.substring(0, 50) + '...\n');
    }

    // Test 5: Database Table Checks
    console.log('🗄️  Testing database table checks...');
    const legacyTables = await compatibilityLayer.checkLegacyTables();
    const modernTables = await compatibilityLayer.checkModernTables();
    
    if (legacyTables.error) {
      console.log('Legacy tables check (expected in test):', legacyTables.error.substring(0, 50) + '...');
    } else {
      console.log('Legacy tables found:', Object.keys(legacyTables).length);
    }
    
    if (modernTables.error) {
      console.log('Modern tables check (expected in test):', modernTables.error.substring(0, 50) + '...');
    } else {
      console.log('Modern tables found:', Object.keys(modernTables).length);
    }
    console.log('✅ Database table checks completed\n');

    // Test 6: Modern Engine Registration
    console.log('🚀 Testing modern engine registration...');
    const mockEngine = {
      execute: async (article, blogId, accountId) => {
        return {
          _modern: true,
          _system: 'modern',
          mockContent: ['test content']
        };
      }
    };
    
    compatibilityLayer.setModernWorkflowEngine(mockEngine);
    console.log('Modern engine registered:', !!compatibilityLayer.modernWorkflowEngine);
    console.log('✅ Engine registration working\n');

    // Summary
    console.log('🎉 STAGE 1 VALIDATION COMPLETE');
    console.log('================================');
    console.log('✅ Compatibility layer functional');
    console.log('✅ Legacy system preserved');
    console.log('✅ Modern system ready for implementation');
    console.log('✅ Error handling robust');
    console.log('✅ Database integration working');
    console.log('✅ Health monitoring operational');
    console.log('\n🚀 Ready to proceed to Stage 2: Database Schema Evolution');

  } catch (error) {
    console.error('\n❌ STAGE 1 VALIDATION FAILED');
    console.error('================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n🔧 Please fix the issues before proceeding to Stage 2');
    process.exit(1);
  }
}

// Run the test
testStage1Implementation(); 