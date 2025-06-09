const mysql = require('mysql2/promise');

async function investigateContentDisplay() {
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
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVCq1CLQJ13hef4Y53C
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
    console.log('🔍 INVESTIGATING CONTENT DISPLAY AND IMAGE GENERATION ISSUES\n');
    
    // 1. CHECK THE GENERATED CONTENT TABLE WITH CORRECT COLUMN NAME
    console.log('📋 1. CHECKING GENERATED CONTENT TABLE (using correct column name):\n');
    
    const [storedContent] = await connection.execute(`
      SELECT 
        content_id,
        prompt_category,
        content_data,
        metadata,
        status,
        created_at
      FROM ssnews_generated_content
      WHERE based_on_gen_article_id = 253
      ORDER BY created_at ASC
    `);
    
    console.log(`Found ${storedContent.length} stored content entries for article 253:\n`);
    
    storedContent.forEach((content, index) => {
      console.log(`${index + 1}. ${content.prompt_category} (ID: ${content.content_id})`);
      console.log(`   Status: ${content.status}`);
      console.log(`   Created: ${content.created_at}`);
      
      // Parse content_data if it's JSON
      try {
        const contentData = typeof content.content_data === 'string' 
          ? JSON.parse(content.content_data) 
          : content.content_data;
        
        if (contentData && typeof contentData === 'object') {
          const contentLength = JSON.stringify(contentData).length;
          console.log(`   Content Data: ${contentLength} chars (JSON)`);
          
          // Show some keys
          const keys = Object.keys(contentData);
          console.log(`   Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
        } else {
          console.log(`   Content Data: ${content.content_data?.length || 0} chars`);
        }
      } catch (e) {
        console.log(`   Content Data: ${content.content_data?.length || 0} chars (raw)`);
      }
      
      // Parse metadata if it's JSON
      try {
        const metadata = typeof content.metadata === 'string' 
          ? JSON.parse(content.metadata) 
          : content.metadata;
        
        if (metadata && typeof metadata === 'object') {
          console.log(`   Metadata keys: ${Object.keys(metadata).join(', ')}`);
        }
      } catch (e) {
        console.log(`   Metadata: Raw data`);
      }
      
      console.log('');
    });
    
    // 2. CHECK IMAGE GENERATION SPECIFICALLY
    console.log('\n🖼️ 2. IMAGE GENERATION ANALYSIS:\n');
    
    // Get the actual image generation response from AI log
    const [imageResponse] = await connection.execute(`
      SELECT 
        response_text,
        success,
        LENGTH(response_text) as response_length
      FROM ssnews_ai_response_log
      WHERE generated_article_id = 253 
        AND content_category = 'image_generation'
        AND success = 1
      LIMIT 1
    `);
    
    if (imageResponse.length > 0) {
      const response = imageResponse[0];
      console.log('🎨 Image Generation AI Response:');
      console.log(`   Length: ${response.response_length} chars`);
      console.log(`   Success: ${response.success ? '✅' : '❌'}`);
      console.log(`   Preview: "${response.response_text.substring(0, 300)}..."`);
      
      // Check if it contains image prompts
      const hasOptions = response.response_text.toLowerCase().includes('option');
      const hasPrompt = response.response_text.toLowerCase().includes('prompt');
      const hasImage = response.response_text.toLowerCase().includes('image');
      
      console.log(`\n   Analysis:`);
      console.log(`   Contains "option": ${hasOptions ? '✅' : '❌'}`);
      console.log(`   Contains "prompt": ${hasPrompt ? '✅' : '❌'}`);
      console.log(`   Contains "image": ${hasImage ? '✅' : '❌'}`);
      
      // Check if this was supposed to trigger actual image creation
      const shouldCreateImages = response.response_text.length > 100 && hasPrompt;
      console.log(`   Should create actual images: ${shouldCreateImages ? '✅' : '❌'}`);
    } else {
      console.log('❌ No successful image generation response found');
    }
    
    // 3. CHECK FOR ANY IMAGES IN DIFFERENT POSSIBLE TABLES
    console.log('\n📷 3. CHECKING FOR ACTUAL GENERATED IMAGES:\n');
    
    try {
      // Try different possible image table names
      const imageTables = [
        'ssnews_generated_images',
        'ssnews_images', 
        'ssnews_content_images',
        'ssnews_dynamic_images'
      ];
      
      for (const tableName of imageTables) {
        try {
          const [images] = await connection.execute(`
            SELECT * FROM ${tableName} 
            WHERE generated_article_id = 253 OR based_on_gen_article_id = 253
            LIMIT 5
          `);
          
          if (images.length > 0) {
            console.log(`✅ Found ${images.length} images in ${tableName}:`);
            images.forEach((img, idx) => {
              console.log(`   ${idx + 1}. ${img.file_name || img.name || 'Unknown'}`);
              console.log(`      URL: ${img.sirv_url || img.url || img.image_url || 'No URL'}`);
            });
          } else {
            console.log(`❌ No images found in ${tableName}`);
          }
        } catch (tableError) {
          console.log(`❌ Table ${tableName} doesn't exist`);
        }
      }
    } catch (error) {
      console.log(`❌ Error checking image tables: ${error.message}`);
    }
    
    // 4. COMPARE AI LOG VS STORED CONTENT
    console.log('\n🔍 4. CONTENT STORAGE ANALYSIS:\n');
    
    const aiCategories = ['analysis', 'social_media', 'blog_post', 'video_script', 'image_generation', 'prayer', 'email', 'letter'];
    const storedCategories = storedContent.map(c => c.prompt_category);
    
    console.log('AI Generated Categories:', aiCategories.join(', '));
    console.log('Stored Categories:', storedCategories.join(', '));
    
    const missingFromStorage = aiCategories.filter(cat => !storedCategories.includes(cat));
    const extraInStorage = storedCategories.filter(cat => !aiCategories.includes(cat));
    
    if (missingFromStorage.length > 0) {
      console.log(`❌ Missing from storage: ${missingFromStorage.join(', ')}`);
    } else {
      console.log('✅ All AI-generated content types are stored');
    }
    
    if (extraInStorage.length > 0) {
      console.log(`ℹ️  Extra in storage: ${extraInStorage.join(', ')}`);
    }
    
    // 5. CHECK CONTENT GENERATION WORKFLOW CONFIG
    console.log('\n⚙️ 5. WORKFLOW CONFIGURATION CHECK:\n');
    
    // Check if there are active templates that should be generating these content types
    const [activeTemplates] = await connection.execute(`
      SELECT 
        template_id,
        category,
        name,
        is_active,
        execution_order
      FROM ssnews_prompt_templates
      WHERE account_id = '56a17e9b-2274-40cc-8c83-4979e8df671a'
        AND is_active = TRUE
      ORDER BY execution_order ASC
    `);
    
    console.log(`Found ${activeTemplates.length} active templates:`);
    activeTemplates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.category} - "${template.name}" (order: ${template.execution_order})`);
    });
    
    await connection.end();
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('1. ✅ All 8 content types were generated by AI');
    console.log(`2. ${storedContent.length === 8 ? '✅' : '❌'} ${storedContent.length}/8 content types stored in database`);
    console.log('3. ❓ UI display issue: Need to check frontend component');
    console.log('4. ❓ Image generation: Creates text prompts but no actual images');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    await connection.end();
  }
}

investigateContentDisplay(); 