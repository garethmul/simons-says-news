const mysql = require('mysql2/promise');

async function diagnosticAnalysis() {
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
    console.log('🚨 COMPREHENSIVE DIAGNOSTIC ANALYSIS\n');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    const failingTypes = ['video_script', 'email', 'letter'];
    
    // 1. COMPARE PROMPT TEMPLATES - Working vs Failing
    console.log('🔍 1. PROMPT TEMPLATE COMPARISON\n');
    
    const [allTemplates] = await connection.execute(`
      SELECT 
        pt.category,
        pt.name, 
        pt.template_output_type,
        pt.execution_order,
        pv.prompt_content,
        pv.system_message,
        pv.version_number,
        CHAR_LENGTH(pv.prompt_content) as prompt_length
      FROM ssnews_prompt_templates pt
      JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
      WHERE pt.account_id = ? AND pt.is_active = TRUE
      ORDER BY pt.execution_order
    `, [accountId]);
    
    const workingTypes = ['analysis', 'social_media', 'blog_post', 'image_generation', 'prayer'];
    
    console.log('✅ WORKING TEMPLATES:');
    allTemplates.filter(t => workingTypes.includes(t.category)).forEach(template => {
      console.log(`   ${template.category}: ${template.prompt_length} chars, output_type: ${template.template_output_type}`);
    });
    
    console.log('\n❌ FAILING TEMPLATES:');
    allTemplates.filter(t => failingTypes.includes(t.category)).forEach(template => {
      console.log(`   ${template.category}: ${template.prompt_length} chars, output_type: ${template.template_output_type}`);
      console.log(`   Prompt preview: "${template.prompt_content.substring(0, 100)}..."`);
    });
    
    // 2. AI RESPONSE LOG ANALYSIS
    console.log('\n🤖 2. AI RESPONSE LOG ANALYSIS\n');
    
    const [aiLogs] = await connection.execute(`
      SELECT 
        content_category,
        success,
        CHAR_LENGTH(prompt_text) as prompt_length,
        CHAR_LENGTH(response_text) as response_length,
        generation_time_ms,
        warning_message,
        prompt_text,
        response_text,
        system_message,
        stop_reason,
        is_truncated
      FROM ssnews_ai_response_log
      WHERE generated_article_id = 245
      ORDER BY created_at ASC
    `);
    
    aiLogs.forEach(log => {
      const status = log.success ? '✅' : '❌';
      console.log(`${status} ${log.content_category}:`);
      console.log(`   Prompt: ${log.prompt_length} chars`);
      console.log(`   Response: ${log.response_length} chars`);
      console.log(`   Time: ${log.generation_time_ms}ms`);
      console.log(`   Stop Reason: ${log.stop_reason || 'N/A'}`);
      console.log(`   Truncated: ${log.is_truncated}`);
      if (log.warning_message) {
        console.log(`   Warning: ${log.warning_message}`);
      }
      
      // Show full prompt and response for failing ones
      if (failingTypes.includes(log.content_category)) {
        console.log(`   📝 FULL PROMPT:`);
        console.log(`   "${log.prompt_text}"`);
        console.log(`   🤖 FULL RESPONSE:`);
        console.log(`   "${log.response_text}"`);
        console.log(`   💬 SYSTEM MESSAGE:`);
        console.log(`   "${log.system_message}"`);
      }
      console.log('');
    });
    
    // 3. JOB EXECUTION STATUS
    console.log('\n📊 3. JOB EXECUTION STATUS\n');
    
    const [jobStatus] = await connection.execute(`
      SELECT 
        status, 
        progress_percentage, 
        progress_details,
        error_message,
        started_at,
        completed_at,
        worker_id
      FROM ssnews_jobs 
      WHERE job_id = 180
    `);
    
    if (jobStatus.length > 0) {
      const job = jobStatus[0];
      console.log(`Status: ${job.status}`);
      console.log(`Progress: ${job.progress_percentage}%`);
      console.log(`Details: ${job.progress_details || 'None'}`);
      console.log(`Error: ${job.error_message || 'None'}`);
      console.log(`Worker: ${job.worker_id || 'None'}`);
      console.log(`Started: ${job.started_at}`);
      console.log(`Completed: ${job.completed_at || 'Still running'}`);
    }
    
    // 4. RECENT SYSTEM ERRORS
    console.log('\n🚨 4. RECENT SYSTEM ERRORS\n');
    
    const [recentErrors] = await connection.execute(`
      SELECT timestamp, level, message, source
      FROM ssnews_system_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      AND level IN ('error', 'warn')
      AND message LIKE '%video_script%' OR message LIKE '%email%' OR message LIKE '%letter%'
      ORDER BY timestamp DESC
      LIMIT 20
    `);
    
    if (recentErrors.length > 0) {
      recentErrors.forEach(error => {
        console.log(`[${error.level}] ${error.timestamp}: ${error.message}`);
      });
    } else {
      console.log('No specific errors found for failing content types');
    }
    
    // 5. TEMPLATE OUTPUT TYPE ANALYSIS
    console.log('\n📋 5. TEMPLATE OUTPUT TYPE ANALYSIS\n');
    
    const outputTypes = {};
    allTemplates.forEach(t => {
      const type = t.template_output_type || 'text';
      if (!outputTypes[type]) outputTypes[type] = [];
      outputTypes[type].push({
        category: t.category,
        working: workingTypes.includes(t.category)
      });
    });
    
    Object.keys(outputTypes).forEach(outputType => {
      console.log(`Output Type: ${outputType}`);
      outputTypes[outputType].forEach(template => {
        const status = template.working ? '✅' : '❌';
        console.log(`   ${status} ${template.category}`);
      });
      console.log('');
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    await connection.end();
  }
}

diagnosticAnalysis(); 