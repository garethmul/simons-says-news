import db from './database.js';
import aiService from './aiService.js';

/**
 * MODERN TEMPLATE ENGINE - STAGE 3
 * 
 * Zapier-like template system with visual variable insertion,
 * workflow chaining, and conditional logic.
 * 
 * Features:
 * - Visual variable tags (can't be partially deleted)
 * - Workflow step dependencies
 * - Conditional branching
 * - Data transformation
 * - Multi-input support (beyond news articles)
 */
class TemplateEngine {
  constructor() {
    this.variablePattern = /\{\{([^}]+)\}\}/g;
    this.templateCache = new Map();
    this.workflowCache = new Map();
  }

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  /**
   * Create a new template with variable support
   */
  async createTemplate(templateData, accountId = null) {
    console.log(`📝 Creating new template: ${templateData.name}`);
    
    try {
      // Validate template structure
      this.validateTemplate(templateData);
      
      // Parse and validate variables
      const variables = this.extractVariables(templateData.prompt);
      
      // Prepare template for storage
      const template = {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        prompt: templateData.prompt,
        system_message: templateData.systemMessage || '',
        variables: JSON.stringify(variables),
        input_schema: JSON.stringify(templateData.inputSchema || {}),
        output_schema: JSON.stringify(templateData.outputSchema || {}),
        ui_config: JSON.stringify(templateData.uiConfig || {}),
        workflow_config: JSON.stringify(templateData.workflowConfig || {}),
        is_active: true,
        version: 1,
        created_by: templateData.createdBy || 'system'
      };

      const templateId = accountId 
        ? await db.insertWithAccount('ssnews_prompt_templates', template, accountId)
        : await db.insert('ssnews_prompt_templates', template);

      console.log(`✅ Template created: ${templateData.name} (ID: ${templateId})`);
      return {
        templateId,
        variables,
        ...template
      };

    } catch (error) {
      console.error(`❌ Error creating template:`, error.message);
      throw error;
    }
  }

  /**
   * Update existing template
   */
  async updateTemplate(templateId, templateData, accountId = null) {
    console.log(`📝 Updating template: ${templateId}`);
    
    try {
      // Validate template structure
      this.validateTemplate(templateData);
      
      // Parse variables
      const variables = this.extractVariables(templateData.prompt);
      
      // Prepare update data
      const updateData = {
        name: templateData.name,
        description: templateData.description,
        prompt: templateData.prompt,
        system_message: templateData.systemMessage || '',
        variables: JSON.stringify(variables),
        input_schema: JSON.stringify(templateData.inputSchema || {}),
        output_schema: JSON.stringify(templateData.outputSchema || {}),
        ui_config: JSON.stringify(templateData.uiConfig || {}),
        workflow_config: JSON.stringify(templateData.workflowConfig || {}),
        updated_at: new Date()
      };

      const whereClause = accountId ? 'template_id = ? AND account_id = ?' : 'template_id = ?';
      const whereParams = accountId ? [templateId, accountId] : [templateId];

      await db.update('ssnews_prompt_templates', updateData, whereClause, whereParams);
      
      // Clear cache
      this.templateCache.delete(`${templateId}_${accountId}`);
      
      console.log(`✅ Template updated: ${templateId}`);
      return { templateId, variables, ...updateData };

    } catch (error) {
      console.error(`❌ Error updating template ${templateId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get template with variable information
   */
  async getTemplate(templateId, accountId = null) {
    const cacheKey = `${templateId}_${accountId}`;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    try {
      const whereClause = accountId ? 'template_id = ? AND account_id = ?' : 'template_id = ?';
      const whereParams = accountId ? [templateId, accountId] : [templateId];

      const templates = await db.query(`
        SELECT * FROM ssnews_prompt_templates 
        WHERE ${whereClause} AND is_active = TRUE
      `, whereParams);

      if (templates.length === 0) {
        throw new Error(`Template ${templateId} not found`);
      }

      const template = templates[0];
      
      // Parse JSON fields
      template.variables = JSON.parse(template.variables || '[]');
      template.input_schema = JSON.parse(template.input_schema || '{}');
      template.output_schema = JSON.parse(template.output_schema || '{}');
      template.ui_config = JSON.parse(template.ui_config || '{}');
      template.workflow_config = JSON.parse(template.workflow_config || '{}');

      // Cache the result
      this.templateCache.set(cacheKey, template);
      
      return template;

    } catch (error) {
      console.error(`❌ Error getting template ${templateId}:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // VARIABLE SYSTEM
  // ============================================================================

  /**
   * Extract variables from template prompt
   * Variables are in format: {{variable_name}} or {{step_name.output_field}}
   */
  extractVariables(prompt) {
    const variables = [];
    const matches = prompt.matchAll(this.variablePattern);
    
    for (const match of matches) {
      const variableName = match[1].trim();
      
      // Parse variable (could be simple or step.field format)
      const parts = variableName.split('.');
      const variable = {
        name: variableName,
        displayName: this.formatVariableName(variableName),
        type: this.inferVariableType(variableName),
        required: true
      };

      if (parts.length === 2) {
        variable.sourceStep = parts[0];
        variable.sourceField = parts[1];
        variable.type = 'step_output';
      }

      // Avoid duplicates
      if (!variables.find(v => v.name === variableName)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Get available variables for a specific step in workflow
   */
  async getAvailableVariables(workflowId, stepIndex, accountId = null) {
    try {
      const workflow = await this.getWorkflow(workflowId, accountId);
      const availableVars = [];

      // Base input variables (always available)
      availableVars.push(
        { name: 'article.title', displayName: 'Article Title', type: 'input', category: 'Article' },
        { name: 'article.content', displayName: 'Article Content', type: 'input', category: 'Article' },
        { name: 'article.summary', displayName: 'Article Summary', type: 'input', category: 'Article' },
        { name: 'article.source', displayName: 'Article Source', type: 'input', category: 'Article' },
        { name: 'article.url', displayName: 'Article URL', type: 'input', category: 'Article' },
        { name: 'blog.id', displayName: 'Blog ID', type: 'input', category: 'Blog' },
        { name: 'account.id', displayName: 'Account ID', type: 'input', category: 'Account' }
      );

      // Variables from previous steps
      for (let i = 0; i < stepIndex; i++) {
        const step = workflow.steps[i];
        const stepTemplate = await this.getTemplate(step.templateId, accountId);
        
        // Add outputs from this step
        if (stepTemplate.output_schema && stepTemplate.output_schema.fields) {
          for (const field of stepTemplate.output_schema.fields) {
            availableVars.push({
              name: `${step.name}.${field.name}`,
              displayName: `${step.displayName} - ${field.displayName}`,
              type: 'step_output',
              category: step.displayName,
              dataType: field.type
            });
          }
        }
      }

      return availableVars;

    } catch (error) {
      console.error(`❌ Error getting available variables:`, error.message);
      return [];
    }
  }

  /**
   * Replace variables in prompt with actual values
   */
  async replaceVariables(prompt, variables, context = {}) {
    let processedPrompt = prompt;

    try {
      // Replace each variable
      for (const [key, value] of Object.entries(variables)) {
        const variablePattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        const replacement = this.formatVariableValue(value);
        processedPrompt = processedPrompt.replace(variablePattern, replacement);
      }

      // Handle any remaining unresolved variables
      const unresolvedVars = processedPrompt.match(this.variablePattern);
      if (unresolvedVars) {
        console.warn('⚠️ Unresolved variables found:', unresolvedVars);
        
        // Replace with placeholders or default values
        for (const unresolvedVar of unresolvedVars) {
          const varName = unresolvedVar.replace(/[{}]/g, '');
          processedPrompt = processedPrompt.replace(
            unresolvedVar, 
            `[Missing: ${varName}]`
          );
        }
      }

      return processedPrompt;

    } catch (error) {
      console.error(`❌ Error replacing variables:`, error.message);
      return prompt; // Return original on error
    }
  }

  // ============================================================================
  // WORKFLOW SYSTEM (ZAPIER-LIKE)
  // ============================================================================

  /**
   * Create a new workflow with multiple steps
   */
  async createWorkflow(workflowData, accountId = null) {
    console.log(`🔗 Creating workflow: ${workflowData.name}`);
    
    try {
      const workflow = {
        name: workflowData.name,
        description: workflowData.description,
        steps: JSON.stringify(workflowData.steps || []),
        input_sources: JSON.stringify(workflowData.inputSources || ['news_article']),
        output_destinations: JSON.stringify(workflowData.outputDestinations || []),
        conditional_logic: JSON.stringify(workflowData.conditionalLogic || {}),
        is_active: true,
        created_by: workflowData.createdBy || 'system'
      };

      const workflowId = accountId 
        ? await db.insertWithAccount('ssnews_workflows', workflow, accountId)
        : await db.insert('ssnews_workflows', workflowId);

      console.log(`✅ Workflow created: ${workflowData.name} (ID: ${workflowId})`);
      return { workflowId, ...workflow };

    } catch (error) {
      console.error(`❌ Error creating workflow:`, error.message);
      throw error;
    }
  }

  /**
   * Execute a workflow with Zapier-like step chaining
   */
  async executeWorkflow(workflowId, inputData, accountId = null) {
    console.log(`🚀 Executing workflow: ${workflowId}`);
    
    try {
      const workflow = await this.getWorkflow(workflowId, accountId);
      const context = { 
        ...inputData,
        _workflow: workflow,
        _accountId: accountId 
      };
      const results = {};

      // Execute steps in order
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`📍 Executing step ${i + 1}: ${step.name}`);

        try {
          // Check if step should be executed (conditional logic)
          if (!this.shouldExecuteStep(step, context, results)) {
            console.log(`⏭️ Skipping step ${step.name} due to conditions`);
            continue;
          }

          // Execute the step
          const stepResult = await this.executeWorkflowStep(step, context, results);
          results[step.name] = stepResult;

          // Update context with step output for next steps
          context[step.name] = stepResult;

          console.log(`✅ Step ${step.name} completed`);

        } catch (error) {
          console.error(`❌ Step ${step.name} failed:`, error.message);
          
          // Handle error based on step configuration
          if (step.continueOnError) {
            results[step.name] = { error: error.message };
            context[step.name] = { error: error.message };
          } else {
            throw new Error(`Workflow failed at step ${step.name}: ${error.message}`);
          }
        }
      }

      console.log(`🎉 Workflow ${workflowId} completed successfully`);
      return {
        workflowId,
        success: true,
        results,
        context: this.sanitizeContext(context)
      };

    } catch (error) {
      console.error(`❌ Workflow ${workflowId} execution failed:`, error.message);
      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeWorkflowStep(step, context, previousResults) {
    try {
      const template = await this.getTemplate(step.templateId, context._accountId);
      
      // Prepare variables for this step
      const stepVariables = await this.prepareStepVariables(step, context, previousResults);
      
      // Replace variables in prompt
      const processedPrompt = await this.replaceVariables(template.prompt, stepVariables, context);
      const processedSystemMessage = await this.replaceVariables(template.system_message || '', stepVariables, context);

      // Execute AI generation
      const aiResponse = await this.executeAIGeneration(
        template.category,
        processedPrompt,
        processedSystemMessage,
        template,
        context
      );

      // Parse and structure the response
      const structuredResult = this.parseStepOutput(aiResponse, template.output_schema, step);

      return {
        stepName: step.name,
        templateId: step.templateId,
        input: { prompt: processedPrompt, systemMessage: processedSystemMessage },
        output: structuredResult,
        metadata: {
          executedAt: new Date().toISOString(),
          template: template.name,
          category: template.category
        }
      };

    } catch (error) {
      console.error(`❌ Error executing workflow step ${step.name}:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // AI GENERATION
  // ============================================================================

  /**
   * Execute AI generation for a template
   */
  async executeAIGeneration(category, prompt, systemMessage, template, context) {
    try {
      // Route to appropriate AI service method
      switch (category) {
        case 'social_media':
          return await aiService.generateSocialMediaPostsWithPrompt(prompt, systemMessage, context.blog?.id);
          
        case 'video_script':
          return await aiService.generateVideoScriptWithPrompt(prompt, systemMessage, context.blog?.id);
          
        case 'blog_post':
          return await aiService.generateBlogPostWithPrompt(prompt, systemMessage, context.blog?.id);
          
        case 'prayer_points':
          return await aiService.generatePrayerPointsWithPrompt(prompt, systemMessage, context.blog?.id);
          
        default:
          // Generic generation for custom categories
          return await aiService.generateGenericContentWithPrompt(prompt, systemMessage, category, context.blog?.id);
      }

    } catch (error) {
      console.error(`❌ AI generation failed for category ${category}:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Validate template structure
   */
  validateTemplate(template) {
    const required = ['name', 'category', 'prompt'];
    for (const field of required) {
      if (!template[field]) {
        throw new Error(`Template missing required field: ${field}`);
      }
    }

    // Validate variable syntax
    const variables = this.extractVariables(template.prompt);
    for (const variable of variables) {
      if (!this.isValidVariableName(variable.name)) {
        throw new Error(`Invalid variable name: ${variable.name}`);
      }
    }
  }

  /**
   * Format variable name for display
   */
  formatVariableName(variableName) {
    return variableName
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Infer variable type from name
   */
  inferVariableType(variableName) {
    if (variableName.includes('.')) return 'step_output';
    if (variableName.startsWith('article.')) return 'input';
    if (variableName.startsWith('blog.')) return 'input';
    if (variableName.startsWith('account.')) return 'input';
    return 'custom';
  }

  /**
   * Validate variable name
   */
  isValidVariableName(name) {
    return /^[a-zA-Z][a-zA-Z0-9._]*$/.test(name);
  }

  /**
   * Format variable value for replacement
   */
  formatVariableValue(value) {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value || '');
  }

  /**
   * Check if step should be executed based on conditions
   */
  shouldExecuteStep(step, context, results) {
    if (!step.conditions || step.conditions.length === 0) {
      return true;
    }

    // Evaluate conditions
    for (const condition of step.conditions) {
      if (!this.evaluateCondition(condition, context, results)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition, context, results) {
    try {
      const { field, operator, value } = condition;
      const actualValue = this.getNestedValue(context, field) || this.getNestedValue(results, field);

      switch (operator) {
        case 'equals':
          return actualValue === value;
        case 'not_equals':
          return actualValue !== value;
        case 'contains':
          return String(actualValue).includes(value);
        case 'not_contains':
          return !String(actualValue).includes(value);
        case 'exists':
          return actualValue !== undefined && actualValue !== null;
        case 'not_exists':
          return actualValue === undefined || actualValue === null;
        default:
          console.warn(`Unknown condition operator: ${operator}`);
          return true;
      }
    } catch (error) {
      console.warn(`Error evaluating condition:`, error.message);
      return true; // Default to true on error
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Parse step output according to schema
   */
  parseStepOutput(rawOutput, outputSchema, step) {
    try {
      // If we have a schema, try to parse according to it
      if (outputSchema && outputSchema.fields) {
        return this.parseStructuredOutput(rawOutput, outputSchema);
      }

      // Default parsing based on step type
      return this.parseGenericOutput(rawOutput, step);

    } catch (error) {
      console.warn(`Warning: Could not parse step output, using raw output`);
      return { raw: rawOutput, parsed: false };
    }
  }

  /**
   * Parse structured output according to schema
   */
  parseStructuredOutput(rawOutput, schema) {
    // Try JSON parsing first
    try {
      let parsed = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
      
      // Validate against schema
      const result = {};
      for (const field of schema.fields) {
        if (parsed[field.name] !== undefined) {
          result[field.name] = parsed[field.name];
        }
      }
      
      return result;
    } catch (error) {
      // Fallback to text parsing
      return { text: rawOutput, parsed: false };
    }
  }

  /**
   * Parse generic output
   */
  parseGenericOutput(rawOutput, step) {
    return {
      content: rawOutput,
      type: step.category || 'generic',
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Prepare variables for step execution
   */
  async prepareStepVariables(step, context, previousResults) {
    const variables = {};

    // Add base context variables
    if (context.article) {
      variables['article.title'] = context.article.title;
      variables['article.content'] = context.article.full_text || context.article.content;
      variables['article.summary'] = context.article.summary_ai || context.article.summary;
      variables['article.source'] = context.article.source_name || context.article.source;
      variables['article.url'] = context.article.url;
    }

    if (context.blog) {
      variables['blog.id'] = context.blog.id;
    }

    if (context._accountId) {
      variables['account.id'] = context._accountId;
    }

    // Add previous step results
    for (const [stepName, result] of Object.entries(previousResults)) {
      if (result.output) {
        for (const [key, value] of Object.entries(result.output)) {
          variables[`${stepName}.${key}`] = value;
        }
      }
    }

    return variables;
  }

  /**
   * Sanitize context for return (remove internal fields)
   */
  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized._workflow;
    delete sanitized._accountId;
    return sanitized;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId, accountId = null) {
    const cacheKey = `workflow_${workflowId}_${accountId}`;
    
    if (this.workflowCache.has(cacheKey)) {
      return this.workflowCache.get(cacheKey);
    }

    try {
      const whereClause = accountId ? 'workflow_id = ? AND account_id = ?' : 'workflow_id = ?';
      const whereParams = accountId ? [workflowId, accountId] : [workflowId];

      const workflows = await db.query(`
        SELECT * FROM ssnews_workflows 
        WHERE ${whereClause} AND is_active = TRUE
      `, whereParams);

      if (workflows.length === 0) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const workflow = workflows[0];
      
      // Parse JSON fields
      workflow.steps = JSON.parse(workflow.steps || '[]');
      workflow.input_sources = JSON.parse(workflow.input_sources || '[]');
      workflow.output_destinations = JSON.parse(workflow.output_destinations || '[]');
      workflow.conditional_logic = JSON.parse(workflow.conditional_logic || '{}');

      // Cache the result
      this.workflowCache.set(cacheKey, workflow);
      
      return workflow;

    } catch (error) {
      console.error(`❌ Error getting workflow ${workflowId}:`, error.message);
      throw error;
    }
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.templateCache.clear();
    this.workflowCache.clear();
    console.log('🗑️ Template and workflow caches cleared');
  }
}

// Create singleton instance
const templateEngine = new TemplateEngine();

export default templateEngine; 