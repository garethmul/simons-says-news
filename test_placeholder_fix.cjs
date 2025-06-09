const mysql = require('mysql2/promise');

async function testPlaceholderFix() {
  console.log('🧪 TESTING PLACEHOLDER FIX\n');
  
  try {
    // Import the AI service (dynamically for CommonJS)
    const { default: aiService } = await import('./src/services/aiService.js');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    
    // Test article data (the same one that was failing)
    const testArticle = {
      title: 'Why should we maintain Christian bookshops?',
      full_text: 'Christian bookshops are facing challenges in the modern digital age. These stores have traditionally served as community hubs for believers, offering not just books but also a space for fellowship and spiritual growth. However, with the rise of online retailers and digital books, many are questioning whether physical Christian bookshops still have a place in our communities. The answer is a resounding yes. These shops provide unique value that cannot be replicated online, including personal recommendations, community connections, and the ability to browse and discover new titles. They also support local Christian authors and provide space for book clubs and events.',
      source_name: 'Christian Post',
      url: 'https://example.com/test'
    };
    
    const basicConfig = {
      temperature: 0.7,
      max_tokens: 1000,
      model: 'gemini'
    };
    
    // Test the content types that were previously failing
    const testTypes = ['email', 'letter'];
    
    for (const type of testTypes) {
      try {
        console.log(`🔍 Testing ${type}...`);
        
        const startTime = Date.now();
        const result = await aiService.generateGenericContent(
          type, 
          testArticle, 
          basicConfig, 
          999, // test blog ID
          accountId
        );
        const endTime = Date.now();
        
        console.log(`✅ ${type}: Generated ${result?.length || 0} characters in ${endTime - startTime}ms`);
        if (result && result.length > 0) {
          console.log(`   📝 Preview: "${result.substring(0, 150)}..."`);
          
          // Check for unreplaced placeholders
          const hasPlaceholders = result.includes('{') && result.includes('}');
          if (hasPlaceholders) {
            console.log(`   ❌ STILL HAS UNREPLACED PLACEHOLDERS!`);
            const placeholders = result.match(/\{[^}]+\}/g) || [];
            console.log(`   Found: ${placeholders.join(', ')}`);
          } else {
            console.log(`   ✅ No unreplaced placeholders in output`);
          }
        } else {
          console.log(`   ❌ Empty response for ${type}`);
        }
        console.log('');
        
      } catch (error) {
        console.log(`❌ ${type}: Error - ${error.message}`);
        console.log('');
      }
    }
    
    // Now check the AI log to see what was actually sent to Gemini
    console.log('\n🔍 CHECKING AI RESPONSE LOG FOR VERIFICATION\n');
    
    const connection = await mysql.createConnection({
      host: '5nstyz.stackhero-network.com',
      port: 5248,
      user: 'c360req',
      password: 'qere08h408gh3408ghW8UHG9',
      database: 'c360req',
      ssl: {
        ca: `-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVCq1CLQJ13hef4Y53C
IrU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCagEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
nubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----`,
        rejectUnauthorized: false
      }
    });
    
    // Get the most recent AI log entries (should be from our test)
    const [recentLogs] = await connection.execute(`
      SELECT 
        content_category,
        prompt_text,
        response_text,
        created_at
      FROM ssnews_ai_response_log
      WHERE generated_article_id = 999
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${recentLogs.length} recent log entries for our test:\n`);
    
    recentLogs.forEach((log, index) => {
      console.log(`🔧 ${log.content_category} - Recent Test Result:`);
      console.log(`   Created: ${log.created_at}`);
      
      // Check for unreplaced placeholders in the prompt
      const hasUnreplacedPlaceholders = log.prompt_text.includes('{article.') || log.prompt_text.includes('{article_');
      
      if (hasUnreplacedPlaceholders) {
        console.log(`   ❌ STILL HAS UNREPLACED PLACEHOLDERS IN PROMPT!`);
        const placeholders = log.prompt_text.match(/\{[^}]+\}/g) || [];
        console.log(`   Found placeholders: ${placeholders.join(', ')}`);
      } else {
        console.log(`   ✅ No unreplaced placeholders in final prompt sent to AI`);
      }
      
      // Check if the prompt actually contains article content
      const hasArticleTitle = log.prompt_text.includes('Why should we maintain Christian bookshops?');
      const hasArticleContent = log.prompt_text.includes('Christian bookshops are facing challenges');
      
      console.log(`   Has article title: ${hasArticleTitle ? '✅' : '❌'}`);
      console.log(`   Has article content: ${hasArticleContent ? '✅' : '❌'}`);
      
      console.log(`   Prompt length: ${log.prompt_text.length} chars`);
      console.log(`   Response length: ${log.response_text?.length || 0} chars`);
      console.log('');
    });
    
    await connection.end();
    
    console.log('\n🎯 TEST COMPLETE!');
    console.log('If you see ✅ marks above, the placeholder substitution is now working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testPlaceholderFix(); 