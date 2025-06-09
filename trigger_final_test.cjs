const mysql = require('mysql2/promise');

async function triggerFinalTest() {
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
    console.log('🚀 Final Test: Triggering content generation for article 371 with all fixes applied\n');
    
    // Insert a new job for article 371
    const jobPayload = {
      specificStoryId: 371,
      accountId: '56a17e9b-2274-40cc-8c83-4979e8df671a'
    };
    
    const [insertResult] = await connection.execute(`
      INSERT INTO ssnews_jobs (account_id, job_type, status, payload, created_at, updated_at)
      VALUES (?, 'content_generation', 'queued', ?, NOW(), NOW())
    `, ['56a17e9b-2274-40cc-8c83-4979e8df671a', JSON.stringify(jobPayload)]);
    
    const jobId = insertResult.insertId;
    console.log(`✅ Created Job ${jobId} for article 371`);
    
    // Wait a moment for the job to be picked up
    console.log('⏳ Waiting 30 seconds for job to complete...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Check job status
    const [jobStatus] = await connection.execute(`
      SELECT job_id, status, completed_at, error_message 
      FROM ssnews_jobs 
      WHERE job_id = ?
    `, [jobId]);
    
    if (jobStatus.length > 0) {
      const job = jobStatus[0];
      console.log(`📊 Job ${jobId} Status: ${job.status}`);
      if (job.completed_at) {
        console.log(`✅ Completed at: ${job.completed_at}`);
      }
      if (job.error_message) {
        console.log(`❌ Error: ${job.error_message}`);
      }
    }
    
    // Check generated content
    const [generatedContent] = await connection.execute(`
      SELECT prompt_category, status, 
             JSON_LENGTH(content_data) as item_count,
             CHAR_LENGTH(JSON_EXTRACT(content_data, '$')) as content_size
      FROM ssnews_generated_content 
      WHERE based_on_gen_article_id = (
        SELECT gen_article_id FROM ssnews_generated_articles 
        WHERE based_on_scraped_article_id = 371 
        ORDER BY created_at DESC LIMIT 1
      )
      ORDER BY created_at ASC
    `);
    
    console.log('\n📋 Generated Content Summary:');
    if (generatedContent.length > 0) {
      generatedContent.forEach(content => {
        console.log(`✅ ${content.prompt_category}: ${content.item_count} items, ${content.content_size} chars (${content.status})`);
      });
      console.log(`\n🎉 Total content types generated: ${generatedContent.length}/8`);
      
      const expectedTypes = ['analysis', 'blog_post', 'social_media', 'video_script', 'prayer', 'email', 'image_generation', 'letter'];
      const generatedTypes = generatedContent.map(c => c.prompt_category);
      const missingTypes = expectedTypes.filter(type => !generatedTypes.includes(type));
      
      if (missingTypes.length > 0) {
        console.log(`❌ Missing types: ${missingTypes.join(', ')}`);
      } else {
        console.log('🎉 ALL 8 CONTENT TYPES GENERATED SUCCESSFULLY!');
      }
    } else {
      console.log('❌ No content generated');
    }
    
    // Check AI response logs for this generation
    const [aiLogs] = await connection.execute(`
      SELECT content_category, success, 
             CHAR_LENGTH(response_text) as response_length,
             warning_message
      FROM ssnews_ai_response_log
      WHERE generated_article_id = (
        SELECT gen_article_id FROM ssnews_generated_articles 
        WHERE based_on_scraped_article_id = 371 
        ORDER BY created_at DESC LIMIT 1
      )
      ORDER BY created_at ASC
    `);
    
    console.log('\n🤖 AI Generation Results:');
    if (aiLogs.length > 0) {
      aiLogs.forEach(log => {
        const status = log.success ? '✅' : '❌';
        console.log(`${status} ${log.content_category}: ${log.response_length} chars${log.warning_message ? ` (${log.warning_message})` : ''}`);
      });
    } else {
      console.log('❌ No AI logs found');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Final test failed:', error.message);
    await connection.end();
  }
}

triggerFinalTest(); 