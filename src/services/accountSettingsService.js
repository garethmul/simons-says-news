import db from './database.js';

class AccountSettingsService {
  constructor() {
    this.settingsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get settings for a specific account and setting type
   * @param {string} accountId - Account ID
   * @param {string} settingType - Setting type (content_quality, image_generation, prompt_templates)
   * @param {string} category - Category (default: 'generation')
   * @returns {Promise<Object>} Settings object
   */
  async getAccountSettings(accountId, settingType, category = 'generation') {
    const cacheKey = `${accountId}_${settingType}_${category}`;
    
    // Check cache first
    if (this.settingsCache.has(cacheKey)) {
      const cached = this.settingsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const result = await db.query(`
        SELECT settings_data 
        FROM ssnews_account_settings 
        WHERE account_id = ? 
          AND setting_type = ? 
          AND category = ? 
          AND is_active = TRUE
        LIMIT 1
      `, [accountId, settingType, category]);

      let settings;
      if (result.length > 0) {
        settings = result[0].settings_data;
      } else {
        // Return default settings if none found
        settings = this.getDefaultSettings(settingType);
      }

      // Cache the result
      this.settingsCache.set(cacheKey, {
        data: settings,
        timestamp: Date.now()
      });

      return settings;
    } catch (error) {
      console.error('❌ Error getting account settings:', error);
      // Return defaults on error
      return this.getDefaultSettings(settingType);
    }
  }

  /**
   * Update settings for a specific account
   * @param {string} accountId - Account ID
   * @param {string} settingType - Setting type
   * @param {Object} settingsData - New settings data
   * @param {string} category - Category (default: 'generation')
   * @param {string} updatedBy - User who updated the settings
   * @returns {Promise<boolean>} Success status
   */
  async updateAccountSettings(accountId, settingType, settingsData, category = 'generation', updatedBy = null) {
    try {
      await db.query(`
        INSERT INTO ssnews_account_settings 
        (account_id, setting_type, category, settings_data, is_active, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, TRUE, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
        settings_data = VALUES(settings_data),
        updated_by = VALUES(updated_by),
        updated_at = NOW()
      `, [accountId, settingType, category, JSON.stringify(settingsData), updatedBy]);

      // Clear cache for this setting
      const cacheKey = `${accountId}_${settingType}_${category}`;
      this.settingsCache.delete(cacheKey);

      return true;
    } catch (error) {
      console.error('❌ Error updating account settings:', error);
      return false;
    }
  }

  /**
   * Get content quality settings for an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Content quality settings
   */
  async getContentQualitySettings(accountId) {
    const settings = await this.getAccountSettings(accountId, 'content_quality');
    return {
      thresholds: settings.thresholds || this.getDefaultContentQualityThresholds(),
      scoring: settings.scoring || this.getDefaultContentQualityScoring(),
      generationRules: settings.generation_rules || this.getDefaultGenerationRules(),
      uiDisplay: settings.ui_display || this.getDefaultUIDisplay()
    };
  }

  /**
   * Get image generation settings for an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Image generation settings
   */
  async getImageGenerationSettings(accountId) {
    const settings = await this.getAccountSettings(accountId, 'image_generation');
    return {
      defaults: settings.defaults || this.getDefaultImageSettings(),
      qualityRequirements: settings.quality_requirements || this.getDefaultImageQualityRequirements(),
      promptEnhancement: settings.prompt_enhancement || this.getDefaultPromptEnhancement(),
      brandColors: settings.brandColors || []
    };
  }

  /**
   * Get prompt template settings for an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Prompt template settings
   */
  async getPromptTemplateSettings(accountId) {
    const settings = await this.getAccountSettings(accountId, 'prompt_templates');
    return {
      templatePreferences: settings.template_preferences || this.getDefaultTemplatePreferences(),
      contentRequirements: settings.content_requirements || this.getDefaultContentRequirements(),
      generationLimits: settings.generation_limits || this.getDefaultGenerationLimits()
    };
  }

  /**
   * Get all settings for an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} All account settings
   */
  async getAllAccountSettings(accountId) {
    return {
      contentQuality: await this.getContentQualitySettings(accountId),
      imageGeneration: await this.getImageGenerationSettings(accountId),
      promptTemplates: await this.getPromptTemplateSettings(accountId)
    };
  }

  /**
   * Get default settings for a setting type
   * @param {string} settingType - Setting type
   * @returns {Object} Default settings
   */
  getDefaultSettings(settingType) {
    switch (settingType) {
      case 'content_quality':
        return {
          thresholds: this.getDefaultContentQualityThresholds(),
          scoring: this.getDefaultContentQualityScoring(),
          generation_rules: this.getDefaultGenerationRules(),
          ui_display: this.getDefaultUIDisplay()
        };
      case 'image_generation':
        return {
          defaults: this.getDefaultImageSettings(),
          quality_requirements: this.getDefaultImageQualityRequirements(),
          prompt_enhancement: this.getDefaultPromptEnhancement(),
          brandColors: []
        };
      case 'prompt_templates':
        return {
          template_preferences: this.getDefaultTemplatePreferences(),
          content_requirements: this.getDefaultContentRequirements(),
          generation_limits: this.getDefaultGenerationLimits()
        };
      default:
        return {};
    }
  }

  // Default settings methods
  getDefaultContentQualityThresholds() {
    return {
      min_content_length: 500,
      good_content_length: 1000,
      excellent_content_length: 2000,
      title_only_threshold: 150,
      min_quality_score: 0.3
    };
  }

  getDefaultContentQualityScoring() {
    return {
      content_length_weight: 0.7,
      structure_weight: 0.2,
      uniqueness_weight: 0.1
    };
  }

  getDefaultGenerationRules() {
    return {
      block_title_only: true,
      block_no_content: true,
      warn_short_content: true,
      require_manual_review_below_score: 0.5
    };
  }

  getDefaultUIDisplay() {
    return {
      show_quality_warnings: true,
      show_content_length: true,
      show_quality_score: true,
      disable_regenerate_on_poor_quality: true
    };
  }

  getDefaultImageSettings() {
    return {
      aspectRatio: '16:9',
      styleType: 'GENERAL',
      renderingSpeed: 'DEFAULT',
      magicPrompt: 'AUTO',
      numImages: 1,
      modelVersion: 'v2'
    };
  }

  getDefaultImageQualityRequirements() {
    return {
      min_source_content_length: 200,
      require_content_quality_check: true,
      min_quality_score_for_auto_generation: 0.3
    };
  }

  getDefaultPromptEnhancement() {
    return {
      promptPrefix: '',
      promptSuffix: '',
      enhancePrompts: true,
      useAccountBranding: true
    };
  }

  getDefaultTemplatePreferences() {
    return {
      default_temperature: 0.7,
      default_max_tokens: 2000,
      enable_workflow_chaining: true,
      auto_create_missing_templates: false
    };
  }

  getDefaultContentRequirements() {
    return {
      min_source_quality_for_templates: 0.3,
      require_manual_approval_below_quality: 0.5,
      enable_quality_override: true
    };
  }

  getDefaultGenerationLimits() {
    return {
      max_concurrent_generations: 3,
      daily_generation_limit: 100,
      enable_rate_limiting: true
    };
  }

  /**
   * Clear all cached settings
   */
  clearCache() {
    this.settingsCache.clear();
  }

  /**
   * Clear cache for specific account
   * @param {string} accountId - Account ID
   */
  clearAccountCache(accountId) {
    for (const key of this.settingsCache.keys()) {
      if (key.startsWith(accountId + '_')) {
        this.settingsCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export default new AccountSettingsService(); 