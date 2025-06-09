const mysql = require('mysql2/promise');

async function testWithFullArticle() {
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
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----`,
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🧪 PROOF TEST: System works with proper content\n');
    
    // Find an article with substantial content
    const [fullArticles] = await connection.execute(`
      SELECT 
        article_id,
        title,
        CHAR_LENGTH(full_text) as content_length,
        LEFT(full_text, 200) as content_preview
      FROM ssnews_scraped_articles 
      WHERE CHAR_LENGTH(full_text) > 500
      AND account_id = '56a17e9b-2274-40cc-8c83-4979e8df671a'
      ORDER BY content_length DESC
      LIMIT 5
    `);
    
    console.log('📋 Articles with substantial content:');
    fullArticles.forEach((article, index) => {
      console.log(`${index + 1}. ID ${article.article_id}: "${article.title}" (${article.content_length} chars)`);
      console.log(`   Preview: "${article.content_preview}..."\n`);
    });
    
    if (fullArticles.length > 0) {
      const testArticle = fullArticles[0];
      console.log(`🎯 Testing with Article ${testArticle.article_id} (${testArticle.content_length} chars)\n`);
      
      // Import AI service and test the failing video_script prompt
      const { default: aiService } = await import('./src/services/aiService.js');
      
      const testData = {
        title: testArticle.title,
        full_text: await getFullText(connection, testArticle.article_id),
        url: 'https://example.com/test',
        source_name: 'Test Source'
      };
      
      const basicConfig = {
        temperature: 0.7,
        max_tokens: 2000,
        model: 'gemini'
      };
      
      console.log('🔬 Testing video_script generation with full content...');
      
      try {
        const result = await aiService.generateGenericContent(
          'video_script', 
          testData, 
          basicConfig, 
          999, // test blog ID
          '56a17e9b-2274-40cc-8c83-4979e8df671a'
        );
        
        console.log(`✅ video_script: Generated ${result?.length || 0} characters`);
        if (result && result.length > 0) {
          console.log(`📝 Generated script: "${result.substring(0, 200)}..."`);
          console.log('\n🎉 SUCCESS: video_script works with proper content!');
        } else {
          console.log('❌ Still generating empty content - other issue');
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    } else {
      console.log('❌ No articles with substantial content found');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await connection.end();
  }
}

async function getFullText(connection, articleId) {
  const [result] = await connection.execute(
    'SELECT full_text FROM ssnews_scraped_articles WHERE article_id = ?',
    [articleId]
  );
  return result[0]?.full_text || '';
}

testWithFullArticle(); 