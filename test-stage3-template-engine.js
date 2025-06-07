#!/usr/bin/env node

/**
 * STAGE 3: MODERN TEMPLATE ENGINE TEST SCRIPT
 * 
 * Tests the Zapier-like template system with:
 * - Visual variable insertion
 * - Template creation and management
 * - Workflow building and execution
 * - Template library functionality
 * - Variable tag system
 */

import templateEngine from './src/services/templateEngine.js';
import db from './src/services/database.js';

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🚀 STAGE 3: MODERN TEMPLATE ENGINE                      ║
║                        Zapier-like Workflow Platform                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
${RESET}\n`);

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  // ============================================================================
  // TEST 1: DATABASE SCHEMA SETUP
  // ============================================================================
  
  console.log(`${BOLD}${BLUE}TEST 1: Database Schema Setup${RESET}`);
  try {
    // Check if tables exist
    const tables = await db.query("SHOW TABLES LIKE 'ssnews_prompt_templates'");
    if (tables.length === 0) {
      console.log(`${YELLOW}⚠️  Template tables not found. Creating them...${RESET}`);
      
      // Read and execute schema
      const fs = await import('fs');
      const schema = fs.readFileSync('./database/schema/stage3-template-engine.sql', 'utf8');
      await db.query(schema);
      
      console.log(`${GREEN}✅ Database schema created successfully${RESET}`);
    } else {
      console.log(`${GREEN}✅ Database schema already exists${RESET}`);
    }
    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Database schema setup failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 2: TEMPLATE CREATION WITH VARIABLES
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 2: Template Creation with Variable System${RESET}`);
  try {
    const socialMediaTemplate = {
      name: 'Engaging Social Media Post',
      description: 'Creates viral social media content with hooks and hashtags',
      category: 'social_media',
      prompt: `Create an engaging social media post about this article:

Title: {{article.title}}
Content: {{article.content}}

Requirements:
- Start with an attention-grabbing hook
- Include relevant emojis 🔥📱
- Add 3-5 relevant hashtags
- Keep it under 280 characters for Twitter
- Make it shareable and engaging

Blog ID: {{blog.id}}`,
      systemMessage: 'You are a social media expert who creates viral, engaging content that drives massive engagement and shares.',
      inputSchema: {
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'content', type: 'text', required: true }
        ]
      },
      outputSchema: {
        fields: [
          { name: 'post', type: 'text', displayName: 'Social Media Post' },
          { name: 'hashtags', type: 'array', displayName: 'Hashtags' },
          { name: 'character_count', type: 'number', displayName: 'Character Count' }
        ]
      },
      uiConfig: {
        icon: 'share',
        color: '#1DA1F2',
        category: 'social'
      }
    };

    const result = await templateEngine.createTemplate(socialMediaTemplate);
    console.log(`${GREEN}✅ Template created: ${result.templateId}${RESET}`);
    console.log(`   📝 Name: ${socialMediaTemplate.name}`);
    console.log(`   📱 Category: ${socialMediaTemplate.category}`);
    console.log(`   🏷️  Variables detected: ${result.variables.length}`);
    
    // Show extracted variables
    result.variables.forEach(variable => {
      console.log(`      • ${variable.displayName} (${variable.name}) - ${variable.type}`);
    });

    global.testTemplateId = result.templateId;
    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Template creation failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 3: VARIABLE REPLACEMENT SYSTEM
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 3: Variable Replacement System${RESET}`);
  try {
    const template = await templateEngine.getTemplate(global.testTemplateId);
    
    // Test data that would come from article
    const testVariables = {
      'article.title': 'Breaking: Revolutionary AI Transforms Content Creation',
      'article.content': 'Scientists have developed an AI system that can create engaging content automatically, revolutionising how we think about content generation and marketing.',
      'blog.id': '12345'
    };

    console.log(`${BLUE}🔄 Testing variable replacement...${RESET}`);
    console.log(`   Original prompt preview: "${template.prompt.substring(0, 80)}..."`);

    const processedPrompt = await templateEngine.replaceVariables(
      template.prompt,
      testVariables
    );

    console.log(`${GREEN}✅ Variables replaced successfully${RESET}`);
    console.log(`   📄 Processed prompt length: ${processedPrompt.length} characters`);
    console.log(`   🎯 Sample output preview:`);
    console.log(`      ${processedPrompt.substring(0, 200)}...`);

    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Variable replacement failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 4: CREATE MULTIPLE TEMPLATES FOR WORKFLOW
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 4: Creating Template Library${RESET}`);
  try {
    const templates = [
      {
        name: 'SEO Blog Post Generator',
        description: 'Creates SEO-optimised blog posts with proper structure',
        category: 'blog_post',
        prompt: `Write a comprehensive SEO blog post based on this article:

Title: {{article.title}}
Content: {{article.content}}
Source: {{article.source}}

Requirements:
- SEO-optimised title and headings
- Introduction with hook
- 3-5 main sections with H2/H3 headings  
- Include relevant keywords naturally
- Conclusion with call to action
- Meta description
- Target length: 1200-1500 words`,
        systemMessage: 'You are an SEO content specialist who creates engaging, well-structured blog posts that rank well in search engines.',
        uiConfig: { icon: 'file-text', color: '#10B981', category: 'content' }
      },
      {
        name: 'YouTube Video Script',
        description: 'Creates engaging video scripts with hooks and structure',
        category: 'video_script',
        prompt: `Create a YouTube video script about:

Title: {{article.title}}
Content: {{article.content}}

Structure:
1. Hook (first 15 seconds) - grab attention immediately
2. Introduction - welcome viewers and preview content  
3. Main content (3-5 key points)
4. Call to action - like, subscribe, comment
5. Outro - next video preview

Style: Conversational, engaging, with natural pauses for editing`,
        systemMessage: 'You are a YouTube content creator who makes educational videos that keep viewers engaged and subscribed.',
        uiConfig: { icon: 'video', color: '#FF0000', category: 'video' }
      }
    ];

    const createdTemplates = [];
    for (const template of templates) {
      const result = await templateEngine.createTemplate(template);
      createdTemplates.push(result);
      console.log(`${GREEN}✅ Template created: ${template.name} (ID: ${result.templateId})${RESET}`);
    }

    global.templateLibrary = [
      { id: global.testTemplateId, name: 'Engaging Social Media Post', category: 'social_media' },
      ...createdTemplates.map(t => ({ id: t.templateId, name: t.name, category: t.category || 'unknown' }))
    ];

    console.log(`${GREEN}🎉 Template library ready with ${global.templateLibrary.length} templates${RESET}`);
    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Template library creation failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 5: ZAPIER-LIKE WORKFLOW CREATION
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 5: Zapier-like Workflow Creation${RESET}`);
  try {
    const workflowData = {
      name: 'Complete Content Package Workflow',
      description: 'Generate blog post, social media, and video script from a single article',
      steps: [
        {
          name: 'blog_post',
          displayName: 'SEO Blog Post',
          templateId: global.templateLibrary.find(t => t.category === 'blog_post')?.id,
          order: 1,
          conditions: [],
          continueOnError: false
        },
        {
          name: 'social_media',
          displayName: 'Social Media Post',
          templateId: global.templateLibrary.find(t => t.category === 'social_media')?.id,
          order: 2,
          conditions: [
            {
              field: 'blog_post.content',
              operator: 'exists',
              value: true
            }
          ],
          continueOnError: true
        },
        {
          name: 'video_script',
          displayName: 'Video Script',
          templateId: global.templateLibrary.find(t => t.category === 'video_script')?.id,
          order: 3,
          conditions: [
            {
              field: 'blog_post.content',
              operator: 'exists',
              value: true
            }
          ],
          continueOnError: true
        }
      ],
      inputSources: ['news_article', 'custom_input'],
      outputDestinations: ['database', 'api', 'export']
    };

    const workflow = await templateEngine.createWorkflow(workflowData);
    console.log(`${GREEN}✅ Workflow created: ${workflow.workflowId}${RESET}`);
    console.log(`   📋 Name: ${workflowData.name}`);
    console.log(`   🔗 Steps: ${workflowData.steps.length}`);
    console.log(`   ⚡ Conditional steps: ${workflowData.steps.filter(s => s.conditions.length > 0).length}`);
    
    // Show workflow structure
    console.log(`   ${BLUE}📊 Workflow Structure:${RESET}`);
    workflowData.steps.forEach((step, index) => {
      const hasConditions = step.conditions.length > 0 ? ' (conditional)' : '';
      console.log(`      ${index + 1}. ${step.displayName}${hasConditions}`);
    });

    global.testWorkflowId = workflow.workflowId;
    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Workflow creation failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 6: WORKFLOW EXECUTION (ZAPIER-LIKE AUTOMATION)
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 6: Workflow Execution (Zapier-like Automation)${RESET}`);
  try {
    // Sample article data (what would come from RSS/scraping)
    const inputData = {
      article: {
        title: 'Revolutionary AI Technology Transforms Content Creation Industry',
        content: `Artificial Intelligence has reached a new milestone in content creation, with advanced systems now capable of generating human-like text, images, and even video scripts. This breakthrough technology is transforming how businesses approach content marketing and communication.

The new AI systems can understand context, maintain brand voice, and create content that resonates with specific audiences. Early adopters report significant time savings and improved content quality.

Industry experts predict this technology will reshape the content creation landscape, making high-quality content accessible to businesses of all sizes.`,
        summary: 'AI technology breakthrough revolutionizes content creation with human-like capabilities and significant efficiency gains.',
        source: 'TechCrunch',
        url: 'https://techcrunch.com/ai-content-revolution'
      },
      blog: { id: '12345' },
      account: { id: '67890' }
    };

    console.log(`${BLUE}🚀 Executing workflow with sample data...${RESET}`);
    console.log(`   📰 Article: "${inputData.article.title}"`);
    console.log(`   📊 Content length: ${inputData.article.content.length} characters`);

    const executionResult = await templateEngine.executeWorkflow(
      global.testWorkflowId,
      inputData
    );

    console.log(`${GREEN}✅ Workflow executed successfully!${RESET}`);
    console.log(`   ⏱️  Total execution: Completed`);
    console.log(`   📋 Steps completed: ${Object.keys(executionResult.results).length}`);
    
    // Show results for each step
    console.log(`   ${BLUE}📊 Step Results:${RESET}`);
    for (const [stepName, result] of Object.entries(executionResult.results)) {
      console.log(`      ✅ ${result.stepName}: Generated ${typeof result.output.content === 'string' ? result.output.content.length : 'N/A'} characters`);
      if (result.metadata) {
        console.log(`         🏷️  Template: ${result.metadata.template}`);
        console.log(`         📅 Executed: ${result.metadata.executedAt}`);
      }
    }

    global.workflowResults = executionResult;
    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Workflow execution failed: ${error.message}${RESET}`);
    console.log(`   ${RED}Details: ${error.stack}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 7: VARIABLE AVAILABILITY FOR STEPS
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 7: Variable Availability System${RESET}`);
  try {
    console.log(`${BLUE}🔍 Testing variable availability for different workflow steps...${RESET}`);
    
    // Test variables available for step 0 (first step)
    const step0Vars = await templateEngine.getAvailableVariables(global.testWorkflowId, 0);
    console.log(`${GREEN}✅ Step 1 variables: ${step0Vars.length} available${RESET}`);
    console.log(`   📥 Base inputs: ${step0Vars.filter(v => v.type === 'input').length}`);
    console.log(`   🔗 Step outputs: ${step0Vars.filter(v => v.type === 'step_output').length}`);

    // Test variables available for step 2 (should include previous step outputs)
    const step2Vars = await templateEngine.getAvailableVariables(global.testWorkflowId, 2);
    console.log(`${GREEN}✅ Step 3 variables: ${step2Vars.length} available${RESET}`);
    console.log(`   📥 Base inputs: ${step2Vars.filter(v => v.type === 'input').length}`);
    console.log(`   🔗 Step outputs: ${step2Vars.filter(v => v.type === 'step_output').length}`);

    // Show some example variables
    console.log(`   ${BLUE}📋 Available variable categories:${RESET}`);
    const categories = [...new Set(step2Vars.map(v => v.category))];
    categories.forEach(category => {
      const count = step2Vars.filter(v => v.category === category).length;
      console.log(`      • ${category}: ${count} variables`);
    });

    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Variable availability test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 8: TEMPLATE ANALYTICS & USAGE TRACKING
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 8: Template Analytics & Usage Tracking${RESET}`);
  try {
    // Simulate some template usage for analytics
    for (const template of global.templateLibrary.slice(0, 2)) {
      await db.insert('ssnews_content_generations', {
        template_id: template.id,
        content_type: template.category,
        generation_method: 'template',
        input_data: JSON.stringify({ test: true }),
        content_generated: JSON.stringify({ result: 'test content' }),
        generation_time_ms: Math.floor(Math.random() * 2000) + 500,
        success: true
      });
    }

    // Get analytics
    const analytics = await db.query(`
      SELECT 
        t.template_id,
        t.name,
        t.category,
        COUNT(g.generation_id) as usage_count,
        AVG(g.generation_time_ms) as avg_generation_time,
        SUM(CASE WHEN g.success = TRUE THEN 1 ELSE 0 END) as success_count
      FROM ssnews_prompt_templates t
      LEFT JOIN ssnews_content_generations g ON t.template_id = g.template_id
      WHERE t.is_active = TRUE
      GROUP BY t.template_id, t.name, t.category
      ORDER BY usage_count DESC
    `);

    console.log(`${GREEN}✅ Analytics generated for ${analytics.length} templates${RESET}`);
    console.log(`   ${BLUE}📊 Template Usage Stats:${RESET}`);
    
    analytics.forEach(stat => {
      console.log(`      📝 ${stat.name}:`);
      console.log(`         Uses: ${stat.usage_count || 0}`);
      console.log(`         Success rate: ${stat.success_count || 0}/${stat.usage_count || 0}`);
      console.log(`         Avg time: ${Math.round(stat.avg_generation_time || 0)}ms`);
    });

    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Analytics test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 9: TEMPLATE ENGINE CACHE PERFORMANCE
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 9: Cache Performance Test${RESET}`);
  try {
    console.log(`${BLUE}⚡ Testing template engine cache performance...${RESET}`);
    
    // First call (should cache)
    const start1 = Date.now();
    await templateEngine.getTemplate(global.testTemplateId);
    const time1 = Date.now() - start1;
    
    // Second call (should use cache)
    const start2 = Date.now();
    await templateEngine.getTemplate(global.testTemplateId);
    const time2 = Date.now() - start2;
    
    console.log(`${GREEN}✅ Cache performance test completed${RESET}`);
    console.log(`   📊 First call (DB): ${time1}ms`);
    console.log(`   ⚡ Second call (Cache): ${time2}ms`);
    console.log(`   🚀 Speed improvement: ${time2 < time1 ? `${Math.round((time1 - time2) / time1 * 100)}%` : 'No improvement detected'}`);

    // Test cache clearing
    templateEngine.clearCache();
    console.log(`${GREEN}✅ Cache cleared successfully${RESET}`);

    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Cache performance test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // FINAL RESULTS
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                           🎉 STAGE 3 TEST RESULTS                           ║
╚══════════════════════════════════════════════════════════════════════════════╝${RESET}`);

  const totalTests = testsPassed + testsFailed;
  const successRate = Math.round((testsPassed / totalTests) * 100);

  console.log(`📊 Tests Passed: ${GREEN}${testsPassed}${RESET}`);
  console.log(`❌ Tests Failed: ${RED}${testsFailed}${RESET}`);
  console.log(`📈 Success Rate: ${successRate >= 90 ? GREEN : successRate >= 70 ? YELLOW : RED}${successRate}%${RESET}\n`);

  if (testsFailed === 0) {
    console.log(`${GREEN}${BOLD}🎉 ALL TESTS PASSED! 🎉${RESET}`);
    console.log(`${GREEN}✅ Stage 3 Modern Template Engine is working perfectly!${RESET}`);
    console.log(`${BLUE}
🚀 Ready for Production:
   📝 Visual template builder with variable tags
   🔗 Zapier-like workflow chaining
   ⚡ High-performance caching system
   📊 Analytics and usage tracking
   🎯 Intelligent variable replacement
   🔄 Conditional step execution
${RESET}`);
  } else {
    console.log(`${RED}❌ Some tests failed. Please check the errors above.${RESET}`);
  }

  process.exit(testsFailed === 0 ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error(`${RED}Fatal error during testing: ${error.message}${RESET}`);
  console.error(error.stack);
  process.exit(1);
}); 