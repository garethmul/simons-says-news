import express from 'express';
import accountSettingsService from '../services/accountSettingsService.js';

const router = express.Router();

/**
 * GET /api/account-settings/:accountId
 * Get all settings for an account
 */
router.get('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    if (!accountId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Account ID is required' 
      });
    }

    const settings = await accountSettingsService.getAllAccountSettings(accountId);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ Error fetching account settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account settings'
    });
  }
});

/**
 * GET /api/account-settings/:accountId/:settingType
 * Get specific setting type for an account
 */
router.get('/:accountId/:settingType', async (req, res) => {
  try {
    const { accountId, settingType } = req.params;
    
    if (!accountId || !settingType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Account ID and setting type are required' 
      });
    }

    let settings;
    switch (settingType) {
      case 'content-quality':
      case 'contentQuality':
        settings = await accountSettingsService.getContentQualitySettings(accountId);
        break;
      case 'image-generation':
      case 'imageGeneration':
        settings = await accountSettingsService.getImageGenerationSettings(accountId);
        break;
      case 'prompt-templates':
      case 'promptTemplates':
        settings = await accountSettingsService.getPromptTemplateSettings(accountId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Invalid setting type: ${settingType}`
        });
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ Error fetching account setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account setting'
    });
  }
});

/**
 * PUT /api/account-settings/:accountId/:settingType
 * Update specific setting type for an account
 */
router.put('/:accountId/:settingType', async (req, res) => {
  try {
    const { accountId, settingType } = req.params;
    const { settings: newSettings } = req.body;
    
    if (!accountId || !settingType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Account ID and setting type are required' 
      });
    }

    if (!newSettings) {
      return res.status(400).json({ 
        success: false, 
        error: 'Settings data is required' 
      });
    }

    // Convert frontend setting type to backend format
    const backendSettingType = settingType
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');

    const success = await accountSettingsService.updateAccountSettings(
      accountId,
      backendSettingType,
      newSettings,
      'generation',
      req.user?.email || 'system'
    );

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update account settings'
      });
    }

    // Return updated settings
    let updatedSettings;
    switch (settingType) {
      case 'content-quality':
      case 'contentQuality':
        updatedSettings = await accountSettingsService.getContentQualitySettings(accountId);
        break;
      case 'image-generation':
      case 'imageGeneration':
        updatedSettings = await accountSettingsService.getImageGenerationSettings(accountId);
        break;
      case 'prompt-templates':
      case 'promptTemplates':
        updatedSettings = await accountSettingsService.getPromptTemplateSettings(accountId);
        break;
    }
    
    res.json({
      success: true,
      data: updatedSettings,
      message: 'Account settings updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating account settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update account settings'
    });
  }
});

/**
 * POST /api/account-settings/:accountId/reset/:settingType
 * Reset specific setting type to defaults
 */
router.post('/:accountId/reset/:settingType', async (req, res) => {
  try {
    const { accountId, settingType } = req.params;
    
    if (!accountId || !settingType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Account ID and setting type are required' 
      });
    }

    // Convert frontend setting type to backend format
    const backendSettingType = settingType
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');

    // Get default settings
    const defaultSettings = accountSettingsService.getDefaultSettings(backendSettingType);

    const success = await accountSettingsService.updateAccountSettings(
      accountId,
      backendSettingType,
      defaultSettings,
      'generation',
      req.user?.email || 'system'
    );

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to reset account settings'
      });
    }

    // Return reset settings
    let resetSettings;
    switch (settingType) {
      case 'content-quality':
      case 'contentQuality':
        resetSettings = await accountSettingsService.getContentQualitySettings(accountId);
        break;
      case 'image-generation':
      case 'imageGeneration':
        resetSettings = await accountSettingsService.getImageGenerationSettings(accountId);
        break;
      case 'prompt-templates':
      case 'promptTemplates':
        resetSettings = await accountSettingsService.getPromptTemplateSettings(accountId);
        break;
    }
    
    res.json({
      success: true,
      data: resetSettings,
      message: 'Account settings reset to defaults'
    });
  } catch (error) {
    console.error('❌ Error resetting account settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset account settings'
    });
  }
});

/**
 * GET /api/account-settings/:accountId/defaults/:settingType
 * Get default settings for a setting type
 */
router.get('/:accountId/defaults/:settingType', async (req, res) => {
  try {
    const { settingType } = req.params;
    
    // Convert frontend setting type to backend format
    const backendSettingType = settingType
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');

    const defaultSettings = accountSettingsService.getDefaultSettings(backendSettingType);
    
    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error('❌ Error fetching default settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default settings'
    });
  }
});

export default router; 