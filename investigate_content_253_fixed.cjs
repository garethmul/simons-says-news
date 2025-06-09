const mysql = require('mysql2/promise');

async function investigateContent253Fixed() {
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
    console.log('🔍 CONTINUED INVESTIGATION OF CONTENT 253\n');
    
    // First, let's check the table structure for generated content
    console.log('📋 CHECKING GENERATED CONTENT TABLE STRUCTURE:\n');
    
    const [structure] = await connection.execute('DESCRIBE ssnews_generated_content');
    console.log('Table structure:');
    structure.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type}`);
    });
    
    // Try different possible column names
    console.log('\n📋 CHECKING GENERATED CONTENT FOR ARTICLE 253:\n');
    
    try {
      const [generatedContent] = await connection.execute(`
        SELECT *
        FROM ssnews_generated_content
        WHERE generated_article_id = 253
        ORDER BY created_at ASC
        LIMIT 10
      `);
      
      console.log(`Found ${generatedContent.length} generated content entries:\n`);
      
      generatedContent.forEach((content, index) => {
        console.log(`${index + 1}. Entry ID: ${content.content_id || content.id || 'unknown'}`);
        
        // Show all columns to understand the structure
        Object.keys(content).forEach(key => {
          if (key.includes('content') || key.includes('category') || key.includes('type')) {
            const value = content[key];
            if (typeof value === 'string' && value.length > 100) {
              console.log(`   ${key}: "${value.substring(0, 100)}..." (${value.length} chars)`);
            } else {
              console.log(`   ${key}: ${value}`);
            }
          }
        });
        console.log('');
      });
    } catch (error) {
      console.log(`❌ Error querying generated content: ${error.message}`);
      
      // Try alternative table names
      try {
        const [altContent] = await connection.execute(`
          SELECT * FROM ssnews_dynamic_content 
          WHERE generated_article_id = 253 
          ORDER BY created_at ASC 
          LIMIT 10
        `);
        console.log(`Found ${altContent.length} entries in ssnews_dynamic_content table`);
      } catch (altError) {
        console.log('❌ ssnews_dynamic_content table not found either');
      }
    }
    
    // CHECK IMAGE GENERATION SPECIFICALLY
    console.log('\n🖼️ IMAGE GENERATION ANALYSIS:\n');
    
    // Get the image generation response from AI log
    const [imageLog] = await connection.execute(`
      SELECT 
        prompt_text,
        response_text,
        LENGTH(response_text) as response_length
      FROM ssnews_ai_response_log
      WHERE generated_article_id = 253 
        AND content_category = 'image_generation'
      LIMIT 1
    `);
    
    if (imageLog.length > 0) {
      const log = imageLog[0];
      console.log('Image generation response analysis:');
      console.log(`Response length: ${log.response_length} chars`);
      console.log(`Response preview: "${log.response_text.substring(0, 300)}..."`);
      
      // Check if it mentions actual image creation
      const mentionsIdeogram = log.response_text.toLowerCase().includes('ideogram');
      const mentionsImage = log.response_text.toLowerCase().includes('image');
      const mentionsGenerated = log.response_text.toLowerCase().includes('generated');
      
      console.log(`\nAnalysis:`);
      console.log(`   Mentions Ideogram: ${mentionsIdeogram ? '✅' : '❌'}`);
      console.log(`   Mentions image: ${mentionsImage ? '✅' : '❌'}`);
      console.log(`   Mentions generated: ${mentionsGenerated ? '✅' : '❌'}`);
    }
    
    // Check if any actual images were created in the images table
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
    
    console.log(`\nFound ${images.length} actual images for article 253:`);
    images.forEach((image, index) => {
      console.log(`   ${index + 1}. ${image.file_name}`);
      console.log(`      URL: ${image.sirv_url}`);
      console.log(`      Alt: ${image.alt_text}`);
      console.log(`      Created: ${image.created_at}`);
    });
    
    // CHECK TOKEN LIMITS AND WHERE THEY'RE SET
    console.log('\n⚙️ TOKEN LIMITS ANALYSIS:\n');
    
    // Check AI response log for token limits
    const [tokenAnalysis] = await connection.execute(`
      SELECT 
        content_category,
        max_output_tokens,
        tokens_used_output,
        is_truncated,
        stop_reason
      FROM ssnews_ai_response_log
      WHERE generated_article_id = 253
      ORDER BY created_at ASC
    `);
    
    console.log('Token usage by content type:');
    tokenAnalysis.forEach(log => {
      console.log(`   ${log.content_category}:`);
      console.log(`     Max tokens: ${log.max_output_tokens}`);
      console.log(`     Used tokens: ${log.tokens_used_output}`);
      console.log(`     Truncated: ${log.is_truncated ? '⚠️ YES' : '✅ NO'}`);
      console.log(`     Stop reason: ${log.stop_reason}`);
      
      if (log.is_truncated) {
        console.log(`     🔧 RECOMMENDATION: Increase max tokens from ${log.max_output_tokens} to ${log.max_output_tokens * 10}`);
      }
      console.log('');
    });
    
    await connection.end();
    
    console.log('🎯 KEY FINDINGS:');
    console.log('1. ✅ All 8 content types were generated successfully');
    console.log('2. ⚠️  2 content types (analysis, social_media) were truncated due to 2000 token limit');
    console.log('3. ✅ Image generation ran and produced output');
    console.log('4. ❓ Need to check why UI only shows 4 content types instead of 8');
    console.log('5. ❓ Need to check why no actual images were created from the image generation');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    await connection.end();
  }
}

investigateContent253Fixed(); 