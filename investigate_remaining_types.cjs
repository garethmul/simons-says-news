const mysql = require('mysql2/promise');

async function investigateRemainingTypes() {
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
    console.log('🔍 Investigating failures for remaining content types...\n');
    
    // Get the latest job execution details
    const [latestJob] = await connection.execute(`
      SELECT job_id, completed_at FROM ssnews_jobs 
      WHERE JSON_EXTRACT(payload, '$.specificStoryId') = 371
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (latestJob.length === 0) {
      console.log('❌ No jobs found for article 371');
      return;
    }
    
    const jobId = latestJob[0].job_id;
    const completedAt = latestJob[0].completed_at;
    
    console.log(`📊 Analyzing Job ${jobId} (completed: ${completedAt})\n`);
    
    // Check AI response logs for each content type
    const [aiLogs] = await connection.execute(`
      SELECT content_category, success, response_text, warning_message, created_at
      FROM ssnews_ai_response_log
      WHERE generated_article_id = (
        SELECT gen_article_id FROM ssnews_generated_articles 
        WHERE based_on_scraped_article_id = 371 
        ORDER BY created_at DESC LIMIT 1
      )
      ORDER BY created_at ASC
    `);
    
    console.log('🤖 AI Generation Results:');
    const missingTypes = ['social_media', 'video_script', 'email', 'image_generation', 'letter'];
    
    for (const type of missingTypes) {
      const log = aiLogs.find(l => l.content_category === type);
      if (log) {
        console.log(`✅ ${type}: AI generated content (${log.response_text.length} chars)`);
        if (!log.success && log.warning_message) {
          console.log(`   ⚠️ Warning: ${log.warning_message}`);
        }
        // Show first 100 chars of generated content
        console.log(`   📝 Content: "${log.response_text.substring(0, 100)}..."`);
      } else {
        console.log(`❌ ${type}: No AI generation attempt found`);
      }
    }
    
    // Check what's stored in the database
    console.log('\n💾 Database Storage Results:');
    const [storedContent] = await connection.execute(`
      SELECT prompt_category, status, JSON_EXTRACT(content_data, '$') as content_preview
      FROM ssnews_generated_content 
      WHERE based_on_gen_article_id = (
        SELECT gen_article_id FROM ssnews_generated_articles 
        WHERE based_on_scraped_article_id = 371 
        ORDER BY created_at DESC LIMIT 1
      )
      ORDER BY created_at ASC
    `);
    
    const storedTypes = storedContent.map(c => c.prompt_category);
    console.log(`✅ Stored: ${storedTypes.join(', ')}`);
    console.log(`❌ Missing from storage: ${missingTypes.filter(t => !storedTypes.includes(t)).join(', ')}`);
    
    // Check system logs for errors during this job
    console.log('\n🚨 System Errors During Job:');
    const [errorLogs] = await connection.execute(`
      SELECT timestamp, level, message, source
      FROM ssnews_system_logs
      WHERE timestamp BETWEEN DATE_SUB(?, INTERVAL 5 MINUTE) AND DATE_ADD(?, INTERVAL 5 MINUTE)
      AND level IN ('error', 'warn')
      ORDER BY timestamp ASC
    `, [completedAt, completedAt]);
    
    if (errorLogs.length > 0) {
      errorLogs.forEach(log => {
        console.log(`   [${log.level}] ${log.message.substring(0, 150)}${log.message.length > 150 ? '...' : ''}`);
      });
    } else {
      console.log('   ✅ No system errors found during job execution');
    }
    
    // Sample one of the AI responses to understand the parsing issue
    const sampleLog = aiLogs.find(l => missingTypes.includes(l.content_category));
    if (sampleLog) {
      console.log(`\n🔬 Sample AI Response (${sampleLog.content_category}):`);
      console.log(`Content Type: ${sampleLog.content_category}`);
      console.log(`Success: ${sampleLog.success}`);
      console.log(`Response Length: ${sampleLog.response_text.length} characters`);
      console.log(`Full Response: ${sampleLog.response_text}`);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    await connection.end();
  }
}

investigateRemainingTypes(); 