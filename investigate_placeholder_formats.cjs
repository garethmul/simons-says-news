const mysql = require('mysql2/promise');

async function investigatePlaceholderFormats() {
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
    console.log('🔍 INVESTIGATING PLACEHOLDER FORMAT INCONSISTENCIES\n');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    
    // 1. GET ALL PROMPTS AND ANALYZE PLACEHOLDER FORMATS
    console.log('📋 1. PLACEHOLDER FORMAT ANALYSIS\n');
    
    const [allPrompts] = await connection.execute(`
      SELECT 
        pt.category,
        pt.name,
        pv.prompt_content,
        pv.version_number
      FROM ssnews_prompt_templates pt
      JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
      WHERE pt.account_id = ? AND pt.is_active = TRUE
      ORDER BY pt.execution_order
    `, [accountId]);
    
    console.log('🔧 PLACEHOLDER FORMAT USAGE:\n');
    
    const formatAnalysis = {};
    
    allPrompts.forEach(prompt => {
      const placeholders = prompt.prompt_content.match(/\{[^}]+\}/g) || [];
      
      console.log(`${prompt.category} (${prompt.name}):`);
      
      // Categorize placeholders
      const underscoreFormats = [];
      const dotFormats = [];
      const otherFormats = [];
      
      placeholders.forEach(ph => {
        const cleanPh = ph.slice(1, -1); // Remove { }
        if (cleanPh.includes('.')) {
          dotFormats.push(ph);
        } else if (cleanPh.includes('_')) {
          underscoreFormats.push(ph);
        } else {
          otherFormats.push(ph);
        }
      });
      
      console.log(`   Underscore: ${underscoreFormats.join(', ') || 'None'}`);
      console.log(`   Dot notation: ${dotFormats.join(', ') || 'None'}`);
      console.log(`   Other: ${otherFormats.join(', ') || 'None'}`);
      
      // Track for summary
      if (!formatAnalysis[prompt.category]) {
        formatAnalysis[prompt.category] = {
          underscore: underscoreFormats,
          dot: dotFormats,
          other: otherFormats
        };
      }
      console.log('');
    });
    
    // 2. CHECK WHAT THE SYSTEM ACTUALLY PROVIDES
    console.log('\n🤖 2. WHAT THE SYSTEM ACTUALLY PASSES TO AI\n');
    
    // Look at actual AI prompts to see what variables are available
    const [aiPrompts] = await connection.execute(`
      SELECT 
        content_category,
        prompt_text
      FROM ssnews_ai_response_log
      WHERE generated_article_id = 245
      ORDER BY created_at ASC
      LIMIT 3
    `);
    
    aiPrompts.forEach(log => {
      console.log(`🔧 ${log.content_category} - Final AI Prompt Analysis:`);
      
      // Look for evidence of both formats
      const hasUnderscoreContent = log.prompt_text.includes('article_content');
      const hasDotContent = log.prompt_text.includes('article.content');
      const hasUnreplacedUnderscore = log.prompt_text.includes('{article_content}');
      const hasUnreplacedDot = log.prompt_text.includes('{article.content}');
      
      console.log(`   Contains "article_content": ${hasUnderscoreContent}`);
      console.log(`   Contains "article.content": ${hasDotContent}`);
      console.log(`   Unreplaced {article_content}: ${hasUnreplacedUnderscore}`);
      console.log(`   Unreplaced {article.content}: ${hasUnreplacedDot}`);
      
      if (hasUnreplacedUnderscore || hasUnreplacedDot) {
        console.log(`   ❌ FOUND UNREPLACED PLACEHOLDERS!`);
      }
      console.log('');
    });
    
    // 3. CHECK THE PROMPT MANAGER CODE
    console.log('\n💻 3. SUMMARY AND RECOMMENDATIONS\n');
    
    console.log('📊 PLACEHOLDER FORMAT USAGE BY CONTENT TYPE:');
    Object.keys(formatAnalysis).forEach(category => {
      const analysis = formatAnalysis[category];
      console.log(`   ${category}:`);
      console.log(`     - Underscore formats: ${analysis.underscore.length}`);
      console.log(`     - Dot formats: ${analysis.dot.length}`);
      console.log(`     - Mixed usage: ${(analysis.underscore.length > 0 && analysis.dot.length > 0) ? 'YES ❌' : 'NO ✅'}`);
    });
    
    console.log('\n🔧 STANDARDIZATION NEEDED:');
    console.log('The system should use ONE consistent format. Based on common practices:');
    console.log('✅ RECOMMENDED: Dot notation (article.content, article.title, etc.)');
    console.log('❌ INCONSISTENT: Mixed underscore and dot notation');
    
    console.log('\n📝 REQUIRED ACTIONS:');
    console.log('1. Standardize ALL prompts to use dot notation');
    console.log('2. Update PromptManager to handle dot notation properly');
    console.log('3. Test with standardized placeholders');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    await connection.end();
  }
}

investigatePlaceholderFormats(); 