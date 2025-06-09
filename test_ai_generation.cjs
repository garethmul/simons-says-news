// Test AI generation directly
async function testAIGeneration() {
  console.log('🧪 Testing AI generation directly...\n');
  
  try {
    // Import the AI service (dynamically for CommonJS)
    const { default: aiService } = await import('./src/services/aiService.js');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    
    // Test article data
    const testArticle = {
      title: 'Why should we maintain Christian bookshops?',
      full_text: 'Christian bookshops are facing challenges in the modern digital age. These stores have traditionally served as community hubs for believers, offering not just books but also a space for fellowship and spiritual growth. However, with the rise of online retailers and digital books, many are questioning whether physical Christian bookshops still have a place in our communities.',
      source_name: 'Christian Post',
      url: 'https://example.com/test'
    };
    
    const basicConfig = {
      temperature: 0.7,
      max_tokens: 1000,
      model: 'gemini'
    };
    
    // Test different content types
    const testTypes = ['analysis', 'social_media', 'blog_post', 'letter'];
    
    for (const type of testTypes) {
      try {
        console.log(`🔍 Testing ${type}...`);
        
        const result = await aiService.generateGenericContent(
          type, 
          testArticle, 
          basicConfig, 
          999, // test blog ID
          accountId
        );
        
        console.log(`✅ ${type}: Generated ${result?.length || 0} characters`);
        if (result && result.length > 0) {
          console.log(`   📝 Preview: "${result.substring(0, 100)}..."`);
        } else {
          console.log(`   ❌ Empty response for ${type}`);
        }
        console.log('');
        
      } catch (error) {
        console.log(`❌ ${type}: Error - ${error.message}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAIGeneration(); 