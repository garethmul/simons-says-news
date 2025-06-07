import express from 'express';
import templateEngine from '../services/templateEngine.js';
import db from '../services/database.js';

const router = express.Router();

// ============================================================================
// TEMPLATE ROUTES
// ============================================================================

/**
 * GET /api/templates
 * Get all templates for account
 */
router.get('/', async (req, res) => {
  try {
    const { account_id } = req.query;
    
    const templates = await db.query(`
      SELECT * FROM ssnews_prompt_templates 
      WHERE (account_id = ? OR account_id IS NULL) AND is_active = TRUE
      ORDER BY created_at DESC
    `, [account_id]);

    // Parse JSON fields
    const processedTemplates = templates.map(template => ({
      ...template,
      variables: JSON.parse(template.variables || '[]'),
      input_schema: JSON.parse(template.input_schema || '{}'),
      output_schema: JSON.parse(template.output_schema || '{}'),
      ui_config: JSON.parse(template.ui_config || '{}')
    }));

    res.json({
      success: true,
      templates: processedTemplates,
      count: processedTemplates.length
    });

  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
});

/**
 * GET /api/templates/:id
 * Get specific template by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.query;
    
    const template = await templateEngine.getTemplate(id, account_id);
    
    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('❌ Error fetching template:', error);
    res.status(404).json({
      success: false,
      error: 'Template not found',
      message: error.message
    });
  }
});

/**
 * POST /api/templates
 * Create new template
 */
router.post('/', async (req, res) => {
  try {
    const { account_id } = req.query;
    const templateData = req.body;
    
    const result = await templateEngine.createTemplate(templateData, account_id);
    
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: result
    });

  } catch (error) {
    console.error('❌ Error creating template:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create template',
      message: error.message
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update existing template
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.query;
    const templateData = req.body;
    
    const result = await templateEngine.updateTemplate(id, templateData, account_id);
    
    res.json({
      success: true,
      message: 'Template updated successfully',
      template: result
    });

  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update template',
      message: error.message
    });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete template (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.query;
    
    const whereClause = account_id ? 'template_id = ? AND account_id = ?' : 'template_id = ?';
    const whereParams = account_id ? [id, account_id] : [id];

    await db.update(
      'ssnews_prompt_templates',
      { is_active: false, updated_at: new Date() },
      whereClause,
      whereParams
    );
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      message: error.message
    });
  }
});

/**
 * POST /api/templates/:id/test
 * Test template with sample data
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.query;
    const { testData = {} } = req.body;
    
    const template = await templateEngine.getTemplate(id, account_id);
    
    // Prepare test context
    const testContext = {
      article: {
        title: testData.title || 'Sample Article Title',
        content: testData.content || 'This is sample article content for testing the template.',
        summary: testData.summary || 'Sample article summary',
        source: testData.source || 'Test Source',
        url: testData.url || 'https://example.com/article'
      },
      blog: { id: testData.blog_id || '123' },
      account: { id: account_id || '456' }
    };

    // Process prompt with variables
    const processedPrompt = await templateEngine.replaceVariables(
      template.prompt,
      {
        'article.title': testContext.article.title,
        'article.content': testContext.article.content,
        'article.summary': testContext.article.summary,
        'article.source': testContext.article.source,
        'article.url': testContext.article.url,
        'blog.id': testContext.blog.id,
        'account.id': testContext.account.id
      },
      testContext
    );

    res.json({
      success: true,
      test_result: {
        template_name: template.name,
        processed_prompt: processedPrompt,
        test_context: testContext,
        variables_used: template.variables
      }
    });

  } catch (error) {
    console.error('❌ Error testing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test template',
      message: error.message
    });
  }
});

/**
 * GET /api/templates/:id/variables
 * Get available variables for template
 */
router.get('/:id/variables', async (req, res) => {
  try {
    const { id } = req.params;
    const { workflow_id, step_index } = req.query;
    
    let availableVariables = [];
    
    if (workflow_id && step_index !== undefined) {
      // Get variables for specific workflow step
      availableVariables = await templateEngine.getAvailableVariables(
        workflow_id,
        parseInt(step_index),
        req.query.account_id
      );
    } else {
      // Get default variables
      availableVariables = [
        { name: 'article.title', displayName: 'Article Title', type: 'input', category: 'Article' },
        { name: 'article.content', displayName: 'Article Content', type: 'input', category: 'Article' },
        { name: 'article.summary', displayName: 'Article Summary', type: 'input', category: 'Article' },
        { name: 'article.source', displayName: 'Article Source', type: 'input', category: 'Article' },
        { name: 'article.url', displayName: 'Article URL', type: 'input', category: 'Article' },
        { name: 'blog.id', displayName: 'Blog ID', type: 'input', category: 'Blog' },
        { name: 'account.id', displayName: 'Account ID', type: 'input', category: 'Account' }
      ];
    }

    res.json({
      success: true,
      variables: availableVariables
    });

  } catch (error) {
    console.error('❌ Error fetching variables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch variables',
      message: error.message
    });
  }
});

// ============================================================================
// WORKFLOW ROUTES
// ============================================================================

/**
 * GET /api/workflows
 * Get all workflows for account
 */
router.get('/workflows', async (req, res) => {
  try {
    const { account_id } = req.query;
    
    const workflows = await db.query(`
      SELECT * FROM ssnews_workflows 
      WHERE (account_id = ? OR account_id IS NULL) AND is_active = TRUE
      ORDER BY created_at DESC
    `, [account_id]);

    // Parse JSON fields
    const processedWorkflows = workflows.map(workflow => ({
      ...workflow,
      steps: JSON.parse(workflow.steps || '[]'),
      input_sources: JSON.parse(workflow.input_sources || '[]'),
      output_destinations: JSON.parse(workflow.output_destinations || '[]'),
      conditional_logic: JSON.parse(workflow.conditional_logic || '{}')
    }));

    res.json({
      success: true,
      workflows: processedWorkflows,
      count: processedWorkflows.length
    });

  } catch (error) {
    console.error('❌ Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
      message: error.message
    });
  }
});

/**
 * GET /api/workflows/:id
 * Get specific workflow by ID
 */
router.get('/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.query;
    
    const workflow = await templateEngine.getWorkflow(id, account_id);
    
    res.json({
      success: true,
      workflow
    });

  } catch (error) {
    console.error('❌ Error fetching workflow:', error);
    res.status(404).json({
      success: false,
      error: 'Workflow not found',
      message: error.message
    });
  }
});

/**
 * POST /api/workflows
 * Create new workflow
 */
router.post('/workflows', async (req, res) => {
  try {
    const { account_id } = req.query;
    const workflowData = req.body;
    
    const result = await templateEngine.createWorkflow(workflowData, account_id);
    
    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      workflow: result
    });

  } catch (error) {
    console.error('❌ Error creating workflow:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create workflow',
      message: error.message
    });
  }
});

/**
 * POST /api/workflows/:id/execute
 * Execute workflow with input data
 */
router.post('/workflows/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.query;
    const { inputData, blog_id, article_id } = req.body;
    
    const startTime = Date.now();
    
    try {
      const result = await templateEngine.executeWorkflow(id, inputData, account_id);
      const executionTime = Date.now() - startTime;

      // Log execution to database
      await db.insert('ssnews_workflow_executions', {
        workflow_id: id,
        account_id,
        blog_id,
        article_id,
        input_data: JSON.stringify(inputData),
        step_results: JSON.stringify(result.results),
        final_output: JSON.stringify(result.context),
        status: 'completed',
        execution_time_ms: executionTime,
        completed_at: new Date()
      });
      
      res.json({
        success: true,
        execution_result: result,
        execution_time_ms: executionTime
      });

    } catch (executionError) {
      const executionTime = Date.now() - startTime;
      
      // Log failed execution
      await db.insert('ssnews_workflow_executions', {
        workflow_id: id,
        account_id,
        blog_id,
        article_id,
        input_data: JSON.stringify(inputData),
        status: 'failed',
        error_message: executionError.message,
        execution_time_ms: executionTime,
        completed_at: new Date()
      });
      
      throw executionError;
    }

  } catch (error) {
    console.error('❌ Error executing workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute workflow',
      message: error.message
    });
  }
});

// ============================================================================
// GENERATION ROUTES
// ============================================================================

/**
 * POST /api/generate/template/:id
 * Generate content using specific template
 */
router.post('/generate/template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.query;
    const { inputData, blog_id, article_id } = req.body;
    
    const startTime = Date.now();
    
    // Get template
    const template = await templateEngine.getTemplate(id, account_id);
    
    // Prepare variables
    const variables = {
      'article.title': inputData.article?.title || '',
      'article.content': inputData.article?.content || '',
      'article.summary': inputData.article?.summary || '',
      'article.source': inputData.article?.source || '',
      'article.url': inputData.article?.url || '',
      'blog.id': blog_id || '',
      'account.id': account_id || ''
    };
    
    // Process prompt
    const processedPrompt = await templateEngine.replaceVariables(template.prompt, variables);
    const processedSystemMessage = await templateEngine.replaceVariables(template.system_message || '', variables);
    
    // Execute AI generation
    const context = { blog: { id: blog_id }, _accountId: account_id };
    const aiResponse = await templateEngine.executeAIGeneration(
      template.category,
      processedPrompt,
      processedSystemMessage,
      template,
      context
    );
    
    const executionTime = Date.now() - startTime;
    
    // Log generation
    await db.insert('ssnews_content_generations', {
      account_id,
      blog_id,
      article_id,
      template_id: id,
      content_type: template.category,
      generation_method: 'template',
      input_data: JSON.stringify(inputData),
      prompt_used: processedPrompt,
      content_generated: JSON.stringify(aiResponse),
      generation_time_ms: executionTime,
      success: true
    });
    
    res.json({
      success: true,
      result: {
        template_name: template.name,
        category: template.category,
        content: aiResponse,
        prompt_used: processedPrompt,
        system_message_used: processedSystemMessage,
        generation_time_ms: executionTime
      }
    });

  } catch (error) {
    console.error('❌ Error generating content:', error);
    
    // Log failed generation
    try {
      await db.insert('ssnews_content_generations', {
        account_id: req.query.account_id,
        blog_id: req.body.blog_id,
        article_id: req.body.article_id,
        template_id: req.params.id,
        content_type: 'unknown',
        generation_method: 'template',
        success: false,
        error_message: error.message
      });
    } catch (logError) {
      console.error('Failed to log generation error:', logError);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate content',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/templates
 * Get template usage analytics
 */
router.get('/analytics/templates', async (req, res) => {
  try {
    const { account_id } = req.query;
    
    const analytics = await db.query(`
      SELECT 
        t.template_id,
        t.name,
        t.category,
        COUNT(g.generation_id) as usage_count,
        AVG(g.generation_time_ms) as avg_generation_time,
        SUM(CASE WHEN g.success = TRUE THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN g.success = FALSE THEN 1 ELSE 0 END) as error_count,
        MAX(g.created_at) as last_used
      FROM ssnews_prompt_templates t
      LEFT JOIN ssnews_content_generations g ON t.template_id = g.template_id
      WHERE (t.account_id = ? OR t.account_id IS NULL) AND t.is_active = TRUE
      GROUP BY t.template_id, t.name, t.category
      ORDER BY usage_count DESC
    `, [account_id]);

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

export default router; 