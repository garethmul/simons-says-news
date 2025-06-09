-- =============================================================================
-- REMOVE CATEGORY RESTRICTIONS - IMPLEMENT FLEXIBLE CONTENT TYPES
-- =============================================================================

-- Step 1: Convert category ENUM to VARCHAR for unlimited user-defined types
-- This migration already exists in server.js but we're making it explicit

ALTER TABLE ssnews_prompt_templates 
MODIFY COLUMN category VARCHAR(100) NOT NULL 
COMMENT 'User-defined content type (unlimited flexibility)';

-- Step 2: Add media type system for functional routing
ALTER TABLE ssnews_prompt_templates 
ADD COLUMN media_type ENUM('text', 'video', 'audio', 'image') NOT NULL DEFAULT 'text'
COMMENT 'Functional media type for AI generation routing';

-- Step 3: Add parsing method for specialized content handling
ALTER TABLE ssnews_prompt_templates 
ADD COLUMN parsing_method ENUM('generic', 'social_media', 'video_script', 'prayer_points', 'json', 'structured') DEFAULT 'generic'
COMMENT 'How to parse AI-generated content';

-- Step 4: Add optional tags for organization (JSON array)
ALTER TABLE ssnews_prompt_templates 
ADD COLUMN tags JSON DEFAULT NULL
COMMENT 'Optional tags for organization and searching';

-- Step 5: Add UI configuration for icons and display
ALTER TABLE ssnews_prompt_templates 
ADD COLUMN ui_config JSON DEFAULT NULL
COMMENT 'UI configuration: icon, color, display preferences';

-- Step 6: Update existing templates to use new system
-- Migrate existing ENUM categories to the new flexible system

-- Map old categories to media types and parsing methods
UPDATE ssnews_prompt_templates 
SET 
  media_type = CASE category
    WHEN 'video_script' THEN 'video'
    WHEN 'image_generation' THEN 'image'
    WHEN 'audio_script' THEN 'audio'
    WHEN 'podcast' THEN 'audio'
    ELSE 'text'
  END,
  parsing_method = CASE category
    WHEN 'social_media' THEN 'social_media'
    WHEN 'video_script' THEN 'video_script'
    WHEN 'prayer' THEN 'prayer_points'
    WHEN 'prayer_points' THEN 'prayer_points'
    ELSE 'generic'
  END,
  ui_config = JSON_OBJECT(
    'icon', CASE category
      WHEN 'blog_post' THEN 'FileText'
      WHEN 'social_media' THEN 'MessageSquare'
      WHEN 'video_script' THEN 'Film'
      WHEN 'audio_script' THEN 'Mic'
      WHEN 'podcast' THEN 'Radio'
      WHEN 'prayer' THEN 'Heart'
      WHEN 'image_generation' THEN 'Image'
      WHEN 'analysis' THEN 'BarChart3'
      WHEN 'devotional' THEN 'Book'
      WHEN 'newsletter' THEN 'Mail'
      WHEN 'sermon' THEN 'BookOpen'
      ELSE 'FileText'
    END,
    'color', CASE category
      WHEN 'social_media' THEN '#1DA1F2'
      WHEN 'video_script' THEN '#FF0000'
      WHEN 'audio_script' THEN '#FF6B6B'
      WHEN 'podcast' THEN '#9C88FF'
      WHEN 'prayer' THEN '#10B981'
      WHEN 'image_generation' THEN '#F59E0B'
      ELSE '#6B7280'
    END,
    'displayName', CASE category
      WHEN 'blog_post' THEN 'Blog Post'
      WHEN 'social_media' THEN 'Social Media'
      WHEN 'video_script' THEN 'Video Script'
      WHEN 'audio_script' THEN 'Audio Script'
      WHEN 'prayer' THEN 'Prayer Points'
      WHEN 'image_generation' THEN 'Images'
      WHEN 'analysis' THEN 'Analysis'
      WHEN 'devotional' THEN 'Devotional'
      WHEN 'newsletter' THEN 'Newsletter'
      WHEN 'sermon' THEN 'Sermon'
      WHEN 'podcast' THEN 'Podcast'
      ELSE CONCAT(UPPER(SUBSTRING(category, 1, 1)), SUBSTRING(category, 2))
    END
  );

-- Step 7: Add indexes for new columns
CREATE INDEX idx_prompt_templates_media_type ON ssnews_prompt_templates(media_type);
CREATE INDEX idx_prompt_templates_parsing_method ON ssnews_prompt_templates(parsing_method);
CREATE INDEX idx_prompt_templates_tags ON ssnews_prompt_templates((CAST(tags AS CHAR(255) ARRAY)));

-- Step 8: Update content generation tables to use flexible categories
ALTER TABLE ssnews_generated_content 
MODIFY COLUMN prompt_category VARCHAR(100) NOT NULL
COMMENT 'User-defined content type (matches template category)';

-- Add media type tracking to content generation log
ALTER TABLE ssnews_content_generation_log 
ADD COLUMN content_media_type ENUM('text', 'video', 'audio', 'image') DEFAULT 'text'
COMMENT 'Media type of generated content';

-- Step 9: Create view for backward compatibility
CREATE OR REPLACE VIEW prompt_templates_with_legacy_categories AS
SELECT 
  template_id,
  account_id,
  name,
  description,
  category,
  media_type,
  parsing_method,
  tags,
  JSON_UNQUOTE(JSON_EXTRACT(ui_config, '$.displayName')) as display_name,
  JSON_UNQUOTE(JSON_EXTRACT(ui_config, '$.icon')) as icon,
  JSON_UNQUOTE(JSON_EXTRACT(ui_config, '$.color')) as color,
  execution_order,
  is_active,
  created_at,
  updated_at
FROM ssnews_prompt_templates;

-- Step 10: Insert example flexible templates to show the new system
INSERT IGNORE INTO ssnews_prompt_templates 
(account_id, name, description, category, media_type, parsing_method, ui_config) VALUES
(NULL, 'Thank You Letter Generator', 'Creates professional thank you letters', 'thank-you-letter', 'text', 'generic', 
 JSON_OBJECT('icon', 'Mail', 'color', '#10B981', 'displayName', 'Thank You Letter')),
(NULL, 'Product Description Writer', 'Generates compelling product descriptions', 'product-description', 'text', 'structured',
 JSON_OBJECT('icon', 'Package', 'color', '#F59E0B', 'displayName', 'Product Description')),
(NULL, 'Meeting Agenda Creator', 'Creates structured meeting agendas', 'meeting-agenda', 'text', 'structured',
 JSON_OBJECT('icon', 'Calendar', 'color', '#6366F1', 'displayName', 'Meeting Agenda')),
(NULL, 'Recipe Instructions', 'Formats cooking recipes with steps', 'recipe', 'text', 'structured',
 JSON_OBJECT('icon', 'ChefHat', 'color', '#EF4444', 'displayName', 'Recipe')),
(NULL, 'Technical Documentation', 'Creates technical documentation and guides', 'tech-docs', 'text', 'structured',
 JSON_OBJECT('icon', 'FileCode', 'color', '#8B5CF6', 'displayName', 'Technical Docs'));

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify the migration worked
SELECT 
  COUNT(*) as total_templates,
  COUNT(DISTINCT category) as unique_categories,
  COUNT(DISTINCT media_type) as unique_media_types,
  COUNT(DISTINCT parsing_method) as unique_parsing_methods
FROM ssnews_prompt_templates;

-- Show sample of migrated data
SELECT 
  name,
  category,
  media_type,
  parsing_method,
  JSON_UNQUOTE(JSON_EXTRACT(ui_config, '$.displayName')) as display_name,
  JSON_UNQUOTE(JSON_EXTRACT(ui_config, '$.icon')) as icon
FROM ssnews_prompt_templates 
ORDER BY media_type, category
LIMIT 10; 