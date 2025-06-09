const mysql = require('mysql2/promise');

async function testPromptManager() {
  // Create a minimal database connection
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

  // Create a minimal database service mock
  const db = {
    pool: connection,
    async initialize() {}
  };

  // Mock PromptManager with the database
  class TestPromptManager {
    constructor() {
      this.db = db;
    }

    async getTemplateByCategory(category, accountId = null) {
      try {
        let query = `
          SELECT 
            pt.*,
            pv.version_id as current_version_id,
            pv.version_number as current_version,
            pv.prompt_content as current_prompt,
            pv.system_message as current_system_message,
            pv.parameters as current_parameters
          FROM ssnews_prompt_templates pt
          JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
          WHERE pt.category = ? AND pt.is_active = TRUE
        `;
        
        const params = [category];
        
        if (accountId) {
          query += ` AND pt.account_id = ?`;
          params.push(accountId);
        }
        
        query += ` LIMIT 1`;
        
        const [rows] = await this.db.pool.execute(query, params);
        
        return rows[0] || null;
      } catch (error) {
        console.error('❌ Error fetching template by category:', error);
        throw error;
      }
    }

    async getPromptForGeneration(category, variables = {}, accountId = null) {
      try {
        const template = await this.getTemplateByCategory(category, accountId);
        if (!template) {
          throw new Error(`No active template found for category: ${category}${accountId ? ` in account ${accountId}` : ''}`);
        }

        let prompt = template.current_prompt;
        let systemMessage = template.current_system_message;

        // Replace variables in prompt
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = `{${key}}`;
          prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
          if (systemMessage) {
            systemMessage = systemMessage.replace(new RegExp(placeholder, 'g'), value);
          }
        }

        return {
          templateId: template.template_id,
          versionId: template.current_version_id,
          prompt,
          systemMessage,
          parameters: template.current_parameters ? JSON.parse(template.current_parameters) : null
        };
      } catch (error) {
        console.error('❌ Error getting prompt for generation:', error);
        throw error;
      }
    }
  }

  try {
    console.log('🧪 Testing PromptManager.getPromptForGeneration...\n');
    
    const accountId = '56a17e9b-2274-40cc-8c83-4979e8df671a';
    const promptManager = new TestPromptManager();
    
    // Test all content categories
    const categories = ['analysis', 'blog_post', 'social_media', 'video_script', 'prayer', 'email', 'image_generation', 'letter'];
    
    console.log('📋 Testing each category:\n');
    
    for (const category of categories) {
      try {
        console.log(`🔍 Testing category: ${category}`);
        
        const promptData = await promptManager.getPromptForGeneration(category, {
          article_content: 'Test article content for prompt generation'
        }, accountId);
        
        console.log(`✅ ${category}: SUCCESS`);
        console.log(`   Template ID: ${promptData.templateId}`);
        console.log(`   Version ID: ${promptData.versionId}`);
        console.log(`   Prompt length: ${promptData.prompt.length} chars`);
        console.log(`   Has system message: ${!!promptData.systemMessage}`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ ${category}: FAILED - ${error.message}`);
        console.log('');
      }
    }
    
    // Test the specific one that might be failing
    console.log('🎯 Testing a specific category in detail (analysis):');
    try {
      const template = await promptManager.getTemplateByCategory('analysis', accountId);
      console.log('Raw template data:', {
        template_id: template?.template_id,
        category: template?.category,
        name: template?.name,
        current_version_id: template?.current_version_id,
        has_current_prompt: !!template?.current_prompt,
        has_current_system_message: !!template?.current_system_message
      });
      
    } catch (error) {
      console.log('❌ Failed to get template details:', error.message);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await connection.end();
  }
}

testPromptManager(); 