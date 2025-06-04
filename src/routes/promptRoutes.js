import express from 'express';
import PromptManager from '../services/promptManager.js';
import { accountContext, requireRole } from '../middleware/accountContext.js';

const router = express.Router();
const promptManager = new PromptManager();

// Get all prompt templates for the current account
router.get('/prompts/templates', accountContext, async (req, res) => {
  try {
    const accountId = req.accountContext.accountId;
    const templates = await promptManager.getAllTemplates(accountId);
    
    res.json({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update template execution order
router.put('/prompts/templates/reorder', accountContext, async (req, res) => {
  try {
    const accountId = req.accountContext.accountId;
    const { order } = req.body;
    
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array' });
    }
    
    await promptManager.updateTemplateOrder(accountId, order);
    
    res.json({
      success: true,
      message: 'Template order updated successfully'
    });
  } catch (error) {
    console.error('Error updating template order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific prompt template by ID
router.get('/prompts/templates/:templateId', accountContext, async (req, res) => {
  try {
    const { templateId } = req.params;
    const accountId = req.accountContext.accountId;
    
    const template = await promptManager.getTemplate(templateId, accountId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching prompt template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all versions for a template
router.get('/prompts/templates/:templateId/versions', accountContext, async (req, res) => {
  try {
    const { templateId } = req.params;
    const accountId = req.accountContext.accountId;
    
    const versions = await promptManager.getTemplateVersions(templateId, accountId);
    
    res.json({
      success: true,
      versions,
      count: versions.length
    });
  } catch (error) {
    console.error('Error fetching template versions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new prompt template
router.post('/prompts/templates', accountContext, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { name, category, description, promptContent, systemMessage } = req.body;
    const accountId = req.accountContext.accountId;
    const createdBy = req.headers['x-user-id'] || 'unknown';
    
    if (!name || !category || !promptContent) {
      return res.status(400).json({ 
        error: 'Name, category, and prompt content are required' 
      });
    }
    
    const templateId = await promptManager.createTemplate({
      name,
      category,
      description,
      promptContent,
      systemMessage,
      createdBy,
      accountId
    });
    
    res.status(201).json({
      success: true,
      templateId,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating prompt template:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create a new version for an existing template
router.post('/prompts/templates/:templateId/versions', accountContext, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const { promptContent, systemMessage, parameters, notes } = req.body;
    const accountId = req.accountContext.accountId;
    const createdBy = req.headers['x-user-id'] || 'unknown';
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }
    
    const result = await promptManager.createTemplateVersion(
      templateId,
      promptContent,
      systemMessage,
      parameters,
      createdBy,
      notes,
      accountId
    );
    
    res.status(201).json({
      success: true,
      versionId: result.versionId,
      versionNumber: result.versionNumber,
      message: 'Template version created successfully'
    });
  } catch (error) {
    console.error('Error creating template version:', error);
    res.status(400).json({ error: error.message });
  }
});

// Set a specific version as current
router.put('/prompts/templates/:templateId/versions/:versionId/current', accountContext, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { templateId, versionId } = req.params;
    const accountId = req.accountContext.accountId;
    
    await promptManager.setCurrentVersion(templateId, versionId, accountId);
    
    res.json({
      success: true,
      message: 'Current version updated successfully'
    });
  } catch (error) {
    console.error('Error setting current version:', error);
    res.status(400).json({ error: error.message });
  }
});

// Test a prompt with variables
router.post('/prompts/templates/:templateId/versions/:versionId/test', accountContext, async (req, res) => {
  try {
    const { templateId, versionId } = req.params;
    const { testVariables = {} } = req.body;
    const accountId = req.accountContext.accountId;
    
    const result = await promptManager.testPrompt(templateId, versionId, testVariables, accountId);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error testing prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get generation history for a template
router.get('/prompts/templates/:templateId/history', accountContext, async (req, res) => {
  try {
    const { templateId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const accountId = req.accountContext.accountId;
    
    const history = await promptManager.getGenerationHistory(templateId, limit, accountId);
    
    res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching generation history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get usage statistics for a template
router.get('/prompts/templates/:templateId/stats', accountContext, async (req, res) => {
  try {
    const { templateId } = req.params;
    const accountId = req.accountContext.accountId;
    
    const stats = await promptManager.getUsageStats(templateId, accountId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get prompt for content generation by category
router.get('/prompts/generation/:category', accountContext, async (req, res) => {
  try {
    const { category } = req.params;
    const accountId = req.accountContext.accountId;
    const variables = req.query;
    
    const prompt = await promptManager.getPromptForGeneration(category, variables, accountId);
    
    res.json({
      success: true,
      prompt
    });
  } catch (error) {
    console.error('Error getting prompt for generation:', error);
    res.status(404).json({ error: error.message });
  }
});

export default router; 