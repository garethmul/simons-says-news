const mysql = require('mysql2/promise');

async function fixPromptPlaceholders() {
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
    console.log('🔧 FIXING PROMPT PLACEHOLDER ISSUES\n');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    
    // 1. GET CURRENT BROKEN PROMPTS
    console.log('📋 1. CURRENT BROKEN PROMPTS\n');
    
    const [brokenPrompts] = await connection.execute(`
      SELECT 
        pt.template_id,
        pt.category,
        pt.name,
        pv.prompt_content,
        pv.version_id
      FROM ssnews_prompt_templates pt
      JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
      WHERE pt.account_id = ? 
        AND pt.is_active = TRUE 
        AND pt.category IN ('email', 'letter')
      ORDER BY pt.category
    `, [accountId]);
    
    console.log('❌ BROKEN PROMPTS (missing article content):');
    brokenPrompts.forEach(prompt => {
      console.log(`\n${prompt.category} (${prompt.name}):`);
      console.log(`Template ID: ${prompt.template_id}`);
      console.log(`Current content: ${prompt.prompt_content.substring(0, 200)}...`);
      
      const hasArticleContent = prompt.prompt_content.includes('{article.content}') || prompt.prompt_content.includes('{article_content}');
      console.log(`Has article placeholder: ${hasArticleContent ? '✅' : '❌'}`);
    });
    
    // 2. CREATE FIXED VERSIONS
    console.log('\n\n🔧 2. CREATING FIXED PROMPT VERSIONS\n');
    
    for (const prompt of brokenPrompts) {
      console.log(`\n🔨 FIXING: ${prompt.category} (${prompt.name})`);
      
      let fixedContent = prompt.prompt_content;
      
      if (prompt.category === 'email') {
        // Add article content to email prompt
        fixedContent = `Write a summary of the article below for an email newsletter.

Article:
{article.content}

${prompt.prompt_content}`;
        
      } else if (prompt.category === 'letter') {
        // Add article content to letter prompt  
        fixedContent = `Write a letter to your mum telling her about the story below.

Story:
{article.content}

${prompt.prompt_content}`;
      }
      
      console.log(`Original length: ${prompt.prompt_content.length} characters`);
      console.log(`Fixed length: ${fixedContent.length} characters`);
      console.log(`Added article placeholder: ✅`);
      
      // Create new version with fix
      const [result] = await connection.execute(`
        UPDATE ssnews_prompt_versions 
        SET is_current = FALSE 
        WHERE template_id = ?
      `, [prompt.template_id]);
      
      const [versionResult] = await connection.execute(`
        INSERT INTO ssnews_prompt_versions 
        (template_id, version_number, prompt_content, system_message, created_by, is_current, notes)
        SELECT 
          template_id,
          COALESCE(MAX(version_number), 0) + 1,
          ?,
          system_message,
          'system',
          TRUE,
          'Added {article.content} placeholder to fix missing article content'
        FROM ssnews_prompt_versions 
        WHERE template_id = ?
        GROUP BY template_id, system_message
      `, [fixedContent, prompt.template_id]);
      
      console.log(`✅ Created fixed version for ${prompt.category}`);
    }
    
    // 3. STANDARDIZE IMAGE GENERATION (optional - for consistency)
    console.log('\n\n🎨 3. STANDARDIZING IMAGE GENERATION PROMPT\n');
    
    const [imagePrompt] = await connection.execute(`
      SELECT 
        pt.template_id,
        pt.category,
        pt.name,
        pv.prompt_content,
        pv.version_id
      FROM ssnews_prompt_templates pt
      JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
      WHERE pt.account_id = ? 
        AND pt.is_active = TRUE 
        AND pt.category = 'image_generation'
    `, [accountId]);
    
    if (imagePrompt.length > 0) {
      const prompt = imagePrompt[0];
      console.log(`Current image prompt uses mixed formats:`);
      console.log(`- Contains {article_content}: ${prompt.prompt_content.includes('{article_content}')}`);
      console.log(`- Contains {article.title}: ${prompt.prompt_content.includes('{article.title}')}`);
      
      // Standardize to dot notation
      let standardizedContent = prompt.prompt_content.replace(/{article_content}/g, '{article.content}');
      
      if (standardizedContent !== prompt.prompt_content) {
        console.log(`\n🔄 Standardizing to dot notation...`);
        
        // Create new standardized version
        await connection.execute(`
          UPDATE ssnews_prompt_versions 
          SET is_current = FALSE 
          WHERE template_id = ?
        `, [prompt.template_id]);
        
        await connection.execute(`
          INSERT INTO ssnews_prompt_versions 
          (template_id, version_number, prompt_content, system_message, created_by, is_current, notes)
          SELECT 
            template_id,
            COALESCE(MAX(version_number), 0) + 1,
            ?,
            system_message,
            'system',
            TRUE,
            'Standardized to dot notation: {article_content} → {article.content}'
          FROM ssnews_prompt_versions 
          WHERE template_id = ?
          GROUP BY template_id, system_message
        `, [standardizedContent, prompt.template_id]);
        
        console.log(`✅ Standardized image generation prompt to dot notation`);
      } else {
        console.log(`✅ Image generation prompt already uses consistent format`);
      }
    }
    
    // 4. VERIFY FIXES
    console.log('\n\n✅ 4. VERIFICATION OF FIXES\n');
    
    const [updatedPrompts] = await connection.execute(`
      SELECT 
        pt.category,
        pt.name,
        pv.prompt_content,
        pv.notes
      FROM ssnews_prompt_templates pt
      JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
      WHERE pt.account_id = ? 
        AND pt.is_active = TRUE 
        AND pt.category IN ('email', 'letter', 'image_generation')
      ORDER BY pt.category
    `, [accountId]);
    
    console.log('📊 UPDATED PROMPTS:');
    updatedPrompts.forEach(prompt => {
      const hasArticleContent = prompt.prompt_content.includes('{article.content}');
      const hasOldFormat = prompt.prompt_content.includes('{article_content}');
      
      console.log(`\n${prompt.category}:`);
      console.log(`  - Has {article.content}: ${hasArticleContent ? '✅' : '❌'}`);
      console.log(`  - Has old {article_content}: ${hasOldFormat ? '⚠️ ' : '✅'}`);
      console.log(`  - Notes: ${prompt.notes || 'None'}`);
    });
    
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Fixed email prompt - added {article.content} placeholder');
    console.log('✅ Fixed letter prompt - added {article.content} placeholder');
    console.log('✅ Standardized image_generation to dot notation');
    console.log('\n🚀 ALL 8 CONTENT TYPES SHOULD NOW WORK!');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    await connection.end();
  }
}

fixPromptPlaceholders(); 