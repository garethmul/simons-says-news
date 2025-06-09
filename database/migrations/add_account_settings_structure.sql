-- Account Settings Structure Enhancement
-- Moves all configurable thresholds and settings into account-specific configuration

-- Create account settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS ssnews_account_settings (
  setting_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL,
  setting_type VARCHAR(100) NOT NULL COMMENT 'Type of setting (content_quality, image_generation, prompt_templates)',
  category VARCHAR(100) NOT NULL DEFAULT 'general' COMMENT 'Settings category (content_quality, image_generation, prompts, etc.)',
  settings_data JSON NOT NULL COMMENT 'JSON structure containing the actual settings',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this setting configuration is active',
  created_by VARCHAR(255) NULL COMMENT 'User who created this setting',
  updated_by VARCHAR(255) NULL COMMENT 'User who last updated this setting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_account_setting_type (account_id, setting_type, category),
  INDEX idx_account_settings_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Account-specific settings for content generation and system behavior';

-- Add indexes for efficient account settings queries
CREATE INDEX idx_account_settings_category ON ssnews_account_settings(account_id, category, is_active);
CREATE INDEX idx_account_settings_type ON ssnews_account_settings(account_id, setting_type, is_active);

-- Insert default content quality settings for existing accounts
INSERT IGNORE INTO ssnews_account_settings (account_id, setting_type, category, settings_data, is_active, created_at, updated_at)
SELECT DISTINCT 
  account_id,
  'content_quality' as setting_type,
  'generation' as category,
  JSON_OBJECT(
    'thresholds', JSON_OBJECT(
      'min_content_length', 500,
      'good_content_length', 1000,
      'excellent_content_length', 2000,
      'title_only_threshold', 150,
      'min_quality_score', 0.3
    ),
    'scoring', JSON_OBJECT(
      'content_length_weight', 0.7,
      'structure_weight', 0.2,
      'uniqueness_weight', 0.1
    ),
    'generation_rules', JSON_OBJECT(
      'block_title_only', true,
      'block_no_content', true,
      'warn_short_content', true,
      'require_manual_review_below_score', 0.5
    ),
    'ui_display', JSON_OBJECT(
      'show_quality_warnings', true,
      'show_content_length', true,
      'show_quality_score', true,
      'disable_regenerate_on_poor_quality', true
    )
  ) as settings_data,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM ssnews_accounts;

-- Insert default image generation settings (move from hardcoded)
INSERT IGNORE INTO ssnews_account_settings (account_id, setting_type, category, settings_data, is_active, created_at, updated_at)
SELECT DISTINCT 
  account_id,
  'image_generation' as setting_type,
  'generation' as category,
  JSON_OBJECT(
    'defaults', JSON_OBJECT(
      'aspectRatio', '16:9',
      'styleType', 'GENERAL',
      'renderingSpeed', 'DEFAULT',
      'magicPrompt', 'AUTO',
      'numImages', 1,
      'modelVersion', 'v2'
    ),
    'quality_requirements', JSON_OBJECT(
      'min_source_content_length', 200,
      'require_content_quality_check', true,
      'min_quality_score_for_auto_generation', 0.3
    ),
    'prompt_enhancement', JSON_OBJECT(
      'promptPrefix', '',
      'promptSuffix', '',
      'enhancePrompts', true,
      'useAccountBranding', true
    ),
    'brandColors', JSON_ARRAY()
  ) as settings_data,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM ssnews_accounts;

-- Insert default prompt template settings
INSERT IGNORE INTO ssnews_account_settings (account_id, setting_type, category, settings_data, is_active, created_at, updated_at)
SELECT DISTINCT 
  account_id,
  'prompt_templates' as setting_type,
  'generation' as category,
  JSON_OBJECT(
    'template_preferences', JSON_OBJECT(
      'default_temperature', 0.7,
      'default_max_tokens', 2000,
      'enable_workflow_chaining', true,
      'auto_create_missing_templates', false
    ),
    'content_requirements', JSON_OBJECT(
      'min_source_quality_for_templates', 0.3,
      'require_manual_approval_below_quality', 0.5,
      'enable_quality_override', true
    ),
    'generation_limits', JSON_OBJECT(
      'max_concurrent_generations', 3,
      'daily_generation_limit', 100,
      'enable_rate_limiting', true
    )
  ) as settings_data,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM ssnews_accounts;

-- Create account settings categories view for easy management
CREATE OR REPLACE VIEW ssnews_account_settings_by_category AS
SELECT 
  a.account_id,
  a.name as account_name,
  GROUP_CONCAT(DISTINCT aset.category ORDER BY aset.category) as available_categories,
  COUNT(aset.setting_id) as total_settings,
  COUNT(CASE WHEN aset.is_active = TRUE THEN 1 END) as active_settings,
  MAX(aset.updated_at) as last_updated
FROM ssnews_accounts a
LEFT JOIN ssnews_account_settings aset ON a.account_id = aset.account_id
GROUP BY a.account_id, a.name
ORDER BY a.name; 