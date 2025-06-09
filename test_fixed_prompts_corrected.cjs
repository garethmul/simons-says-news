const mysql = require('mysql2/promise');

async function testFixedPromptsCorrect() {
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
    console.log('🧪 TESTING FIXED PROMPTS FOR ARTICLE 371\n');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    const articleId = 371;
    
    // 1. CHECK EXISTING CONTENT FIRST
    console.log('📋 1. CHECKING EXISTING CONTENT\n');
    
    const [existingContent] = await connection.execute(`
      SELECT 
        content_type,
        LENGTH(content) as content_length,
        created_at
      FROM ssnews_generated_content 
      WHERE generated_article_id = ? AND account_id = ?
      ORDER BY created_at
    `, [articleId, accountId]);
    
    console.log(`Found ${existingContent.length} existing content records`);
    
    // 2. CLEAR PREVIOUS CONTENT FOR FRESH TEST
    console.log('\n🧹 2. CLEARING PREVIOUS CONTENT FOR FRESH TEST\n');
    
    const [deleteResult] = await connection.execute(`
      DELETE FROM ssnews_generated_content 
      WHERE generated_article_id = ? AND account_id = ?
    `, [articleId, accountId]);
    
    console.log(`Deleted ${deleteResult.affectedRows} previous content records`);
    
    // 3. INSERT NEW JOB TO TEST ALL CONTENT TYPES
    console.log('\n🚀 3. TRIGGERING COMPLETE CONTENT GENERATION\n');
    
    const [jobResult] = await connection.execute(`
      INSERT INTO ssnews_content_generation_jobs 
      (article_id, account_id, status, content_types, priority, created_at)
      VALUES (?, ?, 'pending', ?, 'high', NOW())
    `, [
      articleId, 
      accountId, 
      JSON.stringify(['analysis', 'social_media', 'blog_post', 'video_script', 'image_generation', 'prayer', 'email', 'letter'])
    ]);
    
    const jobId = jobResult.insertId;
    console.log(`✅ Created job ${jobId} for Article ${articleId}`);
    console.log(`🎯 Testing ALL 8 content types with fixed prompts`);
    
    // 4. MONITOR JOB PROGRESS
    console.log('\n⏱️  4. MONITORING JOB PROGRESS\n');
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (attempts < maxAttempts) {
      const [jobStatus] = await connection.execute(`
        SELECT status, processed_content_types, error_message, updated_at
        FROM ssnews_content_generation_jobs 
        WHERE job_id = ?
      `, [jobId]);
      
      if (jobStatus.length > 0) {
        const job = jobStatus[0];
        const processedTypes = job.processed_content_types ? JSON.parse(job.processed_content_types) : [];
        
        console.log(`Status: ${job.status} | Processed: ${processedTypes.length}/8 | ${processedTypes.join(', ')}`);
        
        if (job.status === 'completed') {
          console.log(`\n🎉 JOB COMPLETED! Processing took ${attempts + 1} seconds`);
          break;
        } else if (job.status === 'failed') {
          console.log(`\n❌ JOB FAILED: ${job.error_message}`);
          break;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log(`\n⏰ TIMEOUT: Job still running after ${maxAttempts} seconds`);
    }
    
    // 5. FINAL RESULTS CHECK
    console.log('\n📊 5. FINAL RESULTS VERIFICATION\n');
    
    const [finalContent] = await connection.execute(`
      SELECT 
        content_type,
        LENGTH(content) as content_length,
        created_at
      FROM ssnews_generated_content 
      WHERE generated_article_id = ? AND account_id = ?
      ORDER BY created_at
    `, [articleId, accountId]);
    
    console.log(`🎯 FINAL SCORE: ${finalContent.length}/8 CONTENT TYPES GENERATED\n`);
    
    const expectedTypes = ['analysis', 'social_media', 'blog_post', 'video_script', 'image_generation', 'prayer', 'email', 'letter'];
    const generatedTypes = finalContent.map(c => c.content_type);
    
    expectedTypes.forEach(type => {
      const generated = generatedTypes.includes(type);
      const content = finalContent.find(c => c.content_type === type);
      
      console.log(`${type}: ${generated ? '✅' : '❌'}${generated ? ` (${content.content_length} chars)` : ''}`);
    });
    
    console.log(`\n🏆 SUCCESS RATE: ${finalContent.length}/8 = ${Math.round(finalContent.length/8*100)}%`);
    
    if (finalContent.length === 8) {
      console.log('\n🎉 PERFECT! ALL 8 CONTENT TYPES GENERATED SUCCESSFULLY!');
      console.log('✅ PLACEHOLDER STANDARDIZATION FIXES CONFIRMED');
      console.log('🎯 END-TO-END CONTENT GENERATION PROCESS PROVEN COMPLETE AND REPEATABLE');
    } else {
      console.log('\n🔍 Still missing some content types. Let me check specific failures...');
      
      const missingTypes = expectedTypes.filter(type => !generatedTypes.includes(type));
      console.log(`❌ Missing: ${missingTypes.join(', ')}`);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await connection.end();
  }
}

testFixedPromptsCorrect(); 