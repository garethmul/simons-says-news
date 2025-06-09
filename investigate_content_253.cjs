const mysql = require('mysql2/promise');

async function investigateContent253() {
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

  try {
    console.log('🔍 INVESTIGATING CONTENT GENERATION ISSUES FOR ID 253\n');
    
    // 1. CHECK ALL AI RESPONSE LOG ENTRIES FOR ARTICLE 253
    console.log('📋 1. ALL AI RESPONSE LOG ENTRIES FOR ARTICLE 253:\n');
    
    const [aiLogs] = await connection.execute(`
      SELECT 
        response_log_id,
        content_category,
        ai_service,
        model_used,
        tokens_used_input,
        tokens_used_output,
        tokens_used_total,
        max_output_tokens,
        stop_reason,
        is_complete,
        is_truncated,
        success,
        LENGTH(prompt_text) as prompt_length,
        LENGTH(response_text) as response_length,
        created_at
      FROM ssnews_ai_response_log
      WHERE generated_article_id = 253
      ORDER BY created_at ASC
    `);
    
    console.log(`Found ${aiLogs.length} AI log entries for article 253:\n`);
    
    const contentTypeCounts = {};
    aiLogs.forEach((log, index) => {
      const category = log.content_category;
      contentTypeCounts[category] = (contentTypeCounts[category] || 0) + 1;
      
      console.log(`${index + 1}. ${category} (${log.ai_service}/${log.model_used})`);
      console.log(`   Success: ${log.success ? '✅' : '❌'}`);
      console.log(`   Tokens: ${log.tokens_used_input}→${log.tokens_used_output} (max: ${log.max_output_tokens})`);
      console.log(`   Complete: ${log.is_complete ? '✅' : '❌'}, Truncated: ${log.is_truncated ? '⚠️' : '✅'}`);
      console.log(`   Stop Reason: ${log.stop_reason}`);
      console.log(`   Response Length: ${log.response_length} chars`);
      console.log(`   Created: ${log.created_at}`);
      
      if (log.is_truncated) {
        console.log(`   ⚠️  TRUNCATED: Hit ${log.max_output_tokens} token limit!`);
      }
      console.log('');
    });
    
    console.log('📊 CONTENT TYPE SUMMARY:');
    Object.keys(contentTypeCounts).forEach(type => {
      console.log(`   ${type}: ${contentTypeCounts[type]} generation(s)`);
    });
    
    // 2. CHECK WHAT'S ACTUALLY IN THE GENERATED CONTENT TABLE
    console.log('\n📋 2. GENERATED CONTENT IN DATABASE:\n');
    
    const [generatedContent] = await connection.execute(`
      SELECT 
        content_id,
        content_category,
        content_value,
        LENGTH(content_value) as content_length,
        created_at
      FROM ssnews_generated_content
      WHERE generated_article_id = 253
      ORDER BY created_at ASC
    `);
    
    console.log(`Found ${generatedContent.length} generated content entries for article 253:\n`);
    
    generatedContent.forEach((content, index) => {
      console.log(`${index + 1}. ${content.content_category}`);
      console.log(`   Content Length: ${content.content_length} chars`);
      console.log(`   Created: ${content.created_at}`);
      console.log(`   Preview: "${content.content_value.substring(0, 100)}..."`);
      console.log('');
    });
    
    // 3. CHECK FOR MISSING CONTENT TYPES
    console.log('\n📋 3. MISSING CONTENT ANALYSIS:\n');
    
    const expectedTypes = ['analysis', 'social_media', 'blog_post', 'video_script', 'prayer', 'email', 'letter', 'image_generation'];
    const actualTypes = Object.keys(contentTypeCounts);
    const missingTypes = expectedTypes.filter(type => !actualTypes.includes(type));
    const extraTypes = actualTypes.filter(type => !expectedTypes.includes(type));
    
    console.log('Expected content types:', expectedTypes.join(', '));
    console.log('Actually generated types:', actualTypes.join(', '));
    
    if (missingTypes.length > 0) {
      console.log(`❌ Missing types: ${missingTypes.join(', ')}`);
    } else {
      console.log('✅ All expected types were generated');
    }
    
    if (extraTypes.length > 0) {
      console.log(`ℹ️  Extra types: ${extraTypes.join(', ')}`);
    }
    
    // 4. CHECK IMAGE GENERATION SPECIFICALLY
    console.log('\n🖼️ 4. IMAGE GENERATION ANALYSIS:\n');
    
    const imageGenerationLogs = aiLogs.filter(log => log.content_category === 'image_generation');
    
    if (imageGenerationLogs.length === 0) {
      console.log('❌ No image generation logs found!');
    } else {
      imageGenerationLogs.forEach((log, index) => {
        console.log(`Image Generation Attempt ${index + 1}:`);
        console.log(`   Service: ${log.ai_service}/${log.model_used}`);
        console.log(`   Success: ${log.success ? '✅' : '❌'}`);
        console.log(`   Response Length: ${log.response_length} chars`);
        console.log('');
      });
      
      // Check if any actual images were created
      const [images] = await connection.execute(`
        SELECT 
          image_id,
          file_name,
          sirv_url,
          alt_text,
          created_at
        FROM ssnews_generated_images
        WHERE generated_article_id = 253
      `);
      
      console.log(`Found ${images.length} actual images for article 253:`);
      images.forEach((image, index) => {
        console.log(`   ${index + 1}. ${image.file_name}`);
        console.log(`      URL: ${image.sirv_url}`);
        console.log(`      Alt: ${image.alt_text}`);
        console.log(`      Created: ${image.created_at}`);
      });
    }
    
    // 5. CHECK TOKEN LIMITS CONFIGURATION
    console.log('\n⚙️ 5. TOKEN LIMITS ANALYSIS:\n');
    
    const tokenLimitSummary = {};
    aiLogs.forEach(log => {
      const category = log.content_category;
      if (!tokenLimitSummary[category]) {
        tokenLimitSummary[category] = {
          maxTokens: log.max_output_tokens,
          actualOutput: log.tokens_used_output,
          truncated: log.is_truncated
        };
      }
    });
    
    console.log('Token limits by content type:');
    Object.keys(tokenLimitSummary).forEach(category => {
      const data = tokenLimitSummary[category];
      console.log(`   ${category}:`);
      console.log(`     Max tokens: ${data.maxTokens}`);
      console.log(`     Used tokens: ${data.actualOutput}`);
      console.log(`     Truncated: ${data.truncated ? '⚠️ YES' : '✅ NO'}`);
      
      if (data.truncated) {
        console.log(`     🔧 RECOMMENDATION: Increase max tokens from ${data.maxTokens} to ${data.maxTokens * 10}`);
      }
    });
    
    await connection.end();
    
    console.log('\n🎯 SUMMARY OF ISSUES FOUND:');
    console.log(`1. Content types generated: ${actualTypes.length}/${expectedTypes.length}`);
    if (missingTypes.length > 0) {
      console.log(`2. Missing content types: ${missingTypes.join(', ')}`);
    }
    console.log(`3. Image generation issues: ${imageGenerationLogs.length === 0 ? 'NO LOGS FOUND' : 'Found logs, checking images...'}`);
    
    const truncatedTypes = Object.keys(tokenLimitSummary).filter(type => tokenLimitSummary[type].truncated);
    if (truncatedTypes.length > 0) {
      console.log(`4. Token limit issues: ${truncatedTypes.join(', ')} were truncated`);
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    await connection.end();
  }
}

investigateContent253(); 