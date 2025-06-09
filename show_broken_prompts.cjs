const mysql = require('mysql2/promise');

async function showBrokenPrompts() {
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
    console.log('🔍 BROKEN PROMPT CONTENT ANALYSIS\n');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    
    // Get the full prompt content for email and letter
    const [brokenPrompts] = await connection.execute(`
      SELECT 
        pt.category,
        pt.name,
        pv.prompt_content,
        pv.system_message,
        pv.version_number
      FROM ssnews_prompt_templates pt
      JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
      WHERE pt.account_id = ? AND pt.category IN ('email', 'letter')
      ORDER BY pt.category
    `, [accountId]);
    
    brokenPrompts.forEach(prompt => {
      console.log(`🔧 ${prompt.category.toUpperCase()} (${prompt.name}) - v${prompt.version_number}:`);
      console.log(`📝 FULL PROMPT CONTENT:`);
      console.log(`"${prompt.prompt_content}"`);
      console.log(`\n💬 SYSTEM MESSAGE:`);
      console.log(`"${prompt.system_message}"`);
      
      // Analyze what's missing
      console.log(`\n🔍 ANALYSIS:`);
      console.log(`   - References "the article" or "the story": ${prompt.prompt_content.includes('article') || prompt.prompt_content.includes('story') ? 'YES' : 'NO'}`);
      console.log(`   - Has {article_content} placeholder: ${prompt.prompt_content.includes('{article_content}') ? 'YES' : 'NO'}`);
      console.log(`   - Has any {} placeholders: ${prompt.prompt_content.includes('{') ? 'YES' : 'NO'}`);
      
      // Suggest fix
      console.log(`\n✅ SUGGESTED FIX:`);
      const fixedPrompt = addArticleContentPlaceholder(prompt.prompt_content, prompt.category);
      console.log(`"${fixedPrompt}"`);
      
      console.log('\n' + '='.repeat(80) + '\n');
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    await connection.end();
  }
}

function addArticleContentPlaceholder(prompt, category) {
  if (category === 'email') {
    // Add article content at the beginning
    return `Based on this news article:

{article_content}

${prompt}`;
  } else if (category === 'letter') {
    // Add article content reference
    return prompt.replace(
      'telling her about the story', 
      'telling her about the story below:\n\n{article_content}\n\nWhat you learned:'
    );
  }
  return prompt;
}

showBrokenPrompts(); 