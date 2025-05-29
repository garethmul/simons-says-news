import db from './database.js';

class PromptManager {
  constructor() {
    this.db = db;
  }

  // Get all prompt templates
  async getAllTemplates() {
    try {
      // Ensure database is initialized
      if (!this.db.pool) {
        await this.db.initialize();
      }
      
      const [rows] = await this.db.pool.execute(`
        SELECT 
          pt.*,
          pv.version_id as current_version_id,
          pv.version_number as current_version,
          pv.prompt_content as current_prompt,
          pv.system_message as current_system_message,
          pv.created_at as current_version_created_at,
          pv.created_by as current_version_created_by
        FROM ssnews_prompt_templates pt
        LEFT JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
        WHERE pt.is_active = TRUE
        ORDER BY pt.category, pt.name
      `);
      return rows;
    } catch (error) {
      console.error('❌ Error fetching prompt templates:', error);
      throw error;
    }
  }

  // Get template by ID with current version
  async getTemplate(templateId) {
    try {
      // Ensure database is initialized
      if (!this.db.pool) {
        await this.db.initialize();
      }
      
      const [rows] = await this.db.pool.execute(`
        SELECT 
          pt.*,
          pv.version_id as current_version_id,
          pv.version_number as current_version,
          pv.prompt_content as current_prompt,
          pv.system_message as current_system_message,
          pv.parameters as current_parameters,
          pv.created_at as current_version_created_at,
          pv.created_by as current_version_created_by,
          pv.notes as current_version_notes
        FROM ssnews_prompt_templates pt
        LEFT JOIN ssnews_prompt_versions pv ON pt.template_id = pv.template_id AND pv.is_current = TRUE
        WHERE pt.template_id = ?
      `, [templateId]);
      
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching prompt template:', error);
      throw error;
    }
  }

  // Get all versions for a template
  async getTemplateVersions(templateId) {
    try {
      const [rows] = await this.db.pool.execute(`
        SELECT 
          pv.*,
          COUNT(cgl.log_id) as usage_count
        FROM ssnews_prompt_versions pv
        LEFT JOIN ssnews_content_generation_log cgl ON pv.version_id = cgl.version_id
        WHERE pv.template_id = ?
        GROUP BY pv.version_id
        ORDER BY pv.version_number DESC
      `, [templateId]);
      return rows;
    } catch (error) {
      console.error('❌ Error fetching template versions:', error);
      throw error;
    }
  }

  // Create new template version
  async createTemplateVersion(templateId, promptContent, systemMessage, parameters = null, createdBy = 'user', notes = '') {
    const connection = await this.db.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get next version number
      const [versionRows] = await connection.execute(`
        SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
        FROM ssnews_prompt_versions 
        WHERE template_id = ?
      `, [templateId]);
      
      const nextVersion = versionRows[0].next_version;

      // Set all existing versions as not current
      await connection.execute(`
        UPDATE ssnews_prompt_versions 
        SET is_current = FALSE 
        WHERE template_id = ?
      `, [templateId]);

      // Insert new version
      const [result] = await connection.execute(`
        INSERT INTO ssnews_prompt_versions 
        (template_id, version_number, prompt_content, system_message, parameters, created_by, is_current, notes)
        VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)
      `, [templateId, nextVersion, promptContent, systemMessage, JSON.stringify(parameters), createdBy, notes]);

      // Update template's updated_at
      await connection.execute(`
        UPDATE ssnews_prompt_templates 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE template_id = ?
      `, [templateId]);

      await connection.commit();
      
      console.log(`✅ Created new version ${nextVersion} for template ${templateId}`);
      return {
        versionId: result.insertId,
        versionNumber: nextVersion
      };
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error creating template version:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Set a specific version as current
  async setCurrentVersion(templateId, versionId) {
    const connection = await this.db.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Set all versions as not current
      await connection.execute(`
        UPDATE ssnews_prompt_versions 
        SET is_current = FALSE 
        WHERE template_id = ?
      `, [templateId]);

      // Set specified version as current
      await connection.execute(`
        UPDATE ssnews_prompt_versions 
        SET is_current = TRUE 
        WHERE version_id = ? AND template_id = ?
      `, [versionId, templateId]);

      await connection.commit();
      console.log(`✅ Set version ${versionId} as current for template ${templateId}`);
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error setting current version:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Log content generation
  async logGeneration(generatedArticleId, templateId, versionId, aiService, modelUsed, tokensUsed, generationTimeMs, success = true, errorMessage = null) {
    try {
      await this.db.pool.execute(`
        INSERT INTO ssnews_content_generation_log 
        (generated_article_id, template_id, version_id, ai_service, model_used, tokens_used, generation_time_ms, success, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [generatedArticleId, templateId, versionId, aiService, modelUsed, tokensUsed, generationTimeMs, success, errorMessage]);
    } catch (error) {
      console.error('❌ Error logging generation:', error);
      // Don't throw - this is just logging
    }
  }

  // Get content generation history for a template
  async getGenerationHistory(templateId, limit = 50) {
    try {
      const limitValue = parseInt(limit) || 50;
      
      const [rows] = await this.db.pool.execute(`
        SELECT 
          cgl.*,
          pv.version_number,
          ga.title as content_title,
          ga.content_type,
          ga.status as content_status
        FROM ssnews_content_generation_log cgl
        JOIN ssnews_prompt_versions pv ON cgl.version_id = pv.version_id
        LEFT JOIN ssnews_generated_articles ga ON cgl.generated_article_id = ga.gen_article_id
        WHERE cgl.template_id = ?
        ORDER BY cgl.created_at DESC
        LIMIT ${limitValue}
      `, [templateId]);
      return rows;
    } catch (error) {
      console.error('❌ Error fetching generation history:', error);
      throw error;
    }
  }

  // Get prompt for content generation (with variable substitution)
  async getPromptForGeneration(category, variables = {}) {
    try {
      const template = await this.getTemplateByCategory(category);
      if (!template) {
        throw new Error(`No active template found for category: ${category}`);
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

  // Get template by category
  async getTemplateByCategory(category) {
    try {
      const [rows] = await this.db.pool.execute(`
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
        LIMIT 1
      `, [category]);
      
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching template by category:', error);
      throw error;
    }
  }

  // Test a prompt (dry run)
  async testPrompt(templateId, versionId, testVariables = {}) {
    try {
      const [rows] = await this.db.pool.execute(`
        SELECT prompt_content, system_message, parameters
        FROM ssnews_prompt_versions 
        WHERE template_id = ? AND version_id = ?
      `, [templateId, versionId]);

      if (!rows[0]) {
        throw new Error('Prompt version not found');
      }

      let prompt = rows[0].prompt_content;
      let systemMessage = rows[0].system_message;

      // Replace test variables
      for (const [key, value] of Object.entries(testVariables)) {
        const placeholder = `{${key}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
        if (systemMessage) {
          systemMessage = systemMessage.replace(new RegExp(placeholder, 'g'), value);
        }
      }

      return {
        prompt,
        systemMessage,
        parameters: rows[0].parameters ? JSON.parse(rows[0].parameters) : null
      };
    } catch (error) {
      console.error('❌ Error testing prompt:', error);
      throw error;
    }
  }

  // Get usage statistics
  async getUsageStats(templateId) {
    try {
      const [rows] = await this.db.pool.execute(`
        SELECT 
          pv.version_number,
          pv.created_at as version_created,
          COUNT(cgl.log_id) as total_uses,
          COUNT(CASE WHEN cgl.success = TRUE THEN 1 END) as successful_uses,
          AVG(cgl.generation_time_ms) as avg_generation_time,
          AVG(cgl.tokens_used) as avg_tokens_used
        FROM ssnews_prompt_versions pv
        LEFT JOIN ssnews_content_generation_log cgl ON pv.version_id = cgl.version_id
        WHERE pv.template_id = ?
        GROUP BY pv.version_id, pv.version_number, pv.created_at
        ORDER BY pv.version_number DESC
      `, [templateId]);
      return rows;
    } catch (error) {
      console.error('❌ Error fetching usage stats:', error);
      throw error;
    }
  }

  // Create new prompt template
  async createTemplate({ name, category, description, promptContent, systemMessage, createdBy }) {
    const connection = await this.db.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert new template
      const [templateResult] = await connection.execute(`
        INSERT INTO ssnews_prompt_templates 
        (name, category, description, is_active)
        VALUES (?, ?, ?, TRUE)
      `, [name, category, description]);

      const templateId = templateResult.insertId;

      // Create initial version
      const [versionResult] = await connection.execute(`
        INSERT INTO ssnews_prompt_versions 
        (template_id, version_number, prompt_content, system_message, created_by, is_current, notes)
        VALUES (?, 1, ?, ?, ?, TRUE, 'Initial version')
      `, [templateId, promptContent, systemMessage, createdBy]);

      await connection.commit();
      
      console.log(`✅ Created new template "${name}" with ID ${templateId}`);
      return templateId;
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error creating template:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Legacy method name for backward compatibility
  async getTemplates() {
    return this.getAllTemplates();
  }
}

export default PromptManager; 