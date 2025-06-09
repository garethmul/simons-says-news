const mysql = require('mysql2/promise');

async function investigatePlaceholders() {
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
nubhzEFnTIZd+50xx+7LSYEK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
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
    console.log('🔍 INVESTIGATING PLACEHOLDER POPULATION\n');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    
    // 1. CHECK PROMPT TEMPLATES AND THEIR PLACEHOLDERS
    console.log('📋 1. PROMPT TEMPLATES AND PLACEHOLDERS:\n');
    
    const [templates] = await connection.execute(`
      SELECT 
        pt.category,
        pt.name,
        pv.prompt_content,
        pv.system_message
      FROM ssnews_prompt_templates pt
      JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
      WHERE pt.account_id = ? AND pt.is_active = TRUE
      ORDER BY pt.execution_order
    `, [accountId]);
    
    templates.forEach(template => {
      console.log(`🔧 ${template.category} (${template.name}):`);
      
      // Extract placeholders from prompt
      const placeholders = (template.prompt_content.match(/\{[^}]+\}/g) || []).map(p => p.slice(1, -1));
      console.log(`   Placeholders: ${placeholders.join(', ')}`);
      
      // Check for specific content placeholders
      const hasArticleContent = placeholders.includes('article_content');
      const hasArticleText = placeholders.includes('article.content') || placeholders.includes('article.full_text');
      
      if (hasArticleContent) {
        console.log('   ✅ Uses {article_content} placeholder');
      } else if (hasArticleText) {
        console.log('   ✅ Uses article text placeholder');
      } else {
        console.log('   ❓ No obvious article content placeholder');
      }
      
      console.log(`   Prompt preview: "${template.prompt_content.substring(0, 150)}..."`);
      console.log('');
    });
    
    // 2. CHECK ACTUAL ARTICLE 371 DATA
    console.log('\n📰 2. ARTICLE 371 DATA COMPARISON:\n');
    
    const [article371] = await connection.execute(`
      SELECT 
        article_id,
        title,
        CHAR_LENGTH(full_text) as full_text_length,
        LEFT(full_text, 200) as full_text_preview,
        url
      FROM ssnews_scraped_articles 
      WHERE article_id = 371
    `);
    
    if (article371.length > 0) {
      const article = article371[0];
      console.log('📋 Article 371 Database Fields:');
      console.log(`   title: "${article.title}"`);
      console.log(`   full_text: ${article.full_text_length} chars`);
      console.log(`   full_text_preview: "${article.full_text_preview}"`);
      console.log(`   url: "${article.url}"`);
    }
    
    // 3. CHECK HOW VARIABLES ARE BEING PASSED TO AI
    console.log('\n🤖 3. AI PROMPT ANALYSIS FROM LOGS:\n');
    
    const [aiPrompts] = await connection.execute(`
      SELECT 
        content_category,
        prompt_text,
        response_text,
        CHAR_LENGTH(prompt_text) as prompt_length,
        CHAR_LENGTH(response_text) as response_length
      FROM ssnews_ai_response_log
      WHERE generated_article_id = 245
      ORDER BY created_at ASC
    `);
    
    aiPrompts.forEach(log => {
      console.log(`🔧 ${log.content_category}:`);
      console.log(`   Prompt Length: ${log.prompt_length} chars`);
      console.log(`   Response Length: ${log.response_length} chars`);
      
      // Extract the "Content:" section from the prompt
      const contentMatch = log.prompt_text.match(/Content:\s*([^\n\r]*(?:\n[^\n\r]*)*?)(?=\n\n|\nSource:|$)/);
      if (contentMatch) {
        const contentSection = contentMatch[1].trim();
        console.log(`   Content Section: "${contentSection}"`);
        console.log(`   Content Length: ${contentSection.length} chars`);
      } else {
        console.log('   ❓ No "Content:" section found in prompt');
      }
      
      // Check if it contains article_content placeholder (unreplaced)
      if (log.prompt_text.includes('{article_content}')) {
        console.log('   ❌ UNREPLACED PLACEHOLDER: {article_content} found in final prompt!');
      }
      
      console.log('');
    });
    
    // 4. COMPARE WORKING VS FAILING CONTENT SECTIONS
    console.log('\n🔍 4. CONTENT SECTION COMPARISON:\n');
    
    const workingCategories = ['analysis', 'blog_post', 'prayer'];
    const failingCategories = ['video_script', 'email', 'letter'];
    
    console.log('✅ WORKING CATEGORIES:');
    aiPrompts.filter(log => workingCategories.includes(log.content_category)).forEach(log => {
      const contentMatch = log.prompt_text.match(/Content:\s*([^\n\r]*(?:\n[^\n\r]*)*?)(?=\n\n|\nSource:|$)/);
      const content = contentMatch ? contentMatch[1].trim() : 'Not found';
      console.log(`   ${log.content_category}: "${content.substring(0, 100)}..." (${content.length} chars)`);
    });
    
    console.log('\n❌ FAILING CATEGORIES:');
    aiPrompts.filter(log => failingCategories.includes(log.content_category)).forEach(log => {
      const contentMatch = log.prompt_text.match(/Content:\s*([^\n\r]*(?:\n[^\n\r]*)*?)(?=\n\n|\nSource:|$)/);
      const content = contentMatch ? contentMatch[1].trim() : 'Not found';
      console.log(`   ${log.content_category}: "${content.substring(0, 100)}..." (${content.length} chars)`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    await connection.end();
  }
}

investigatePlaceholders(); 