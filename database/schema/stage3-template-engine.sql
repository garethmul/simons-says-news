-- =============================================================================
-- STAGE 3: MODERN TEMPLATE ENGINE DATABASE SCHEMA
-- Zapier-like workflow system with visual template builder
-- =============================================================================

-- Templates table for storing reusable prompt templates
CREATE TABLE IF NOT EXISTS ssnews_prompt_templates (
  template_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL, -- NULL for global templates
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- social_media, video_script, blog_post, etc.
  prompt TEXT NOT NULL,
  system_message TEXT,
  variables JSON, -- Array of variable definitions with types
  input_schema JSON, -- Schema for required inputs
  output_schema JSON, -- Schema for expected outputs
  ui_config JSON, -- Configuration for UI display (icons, colors, etc.)
  workflow_config JSON, -- Workflow-specific settings
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_by VARCHAR(100) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_account_active (account_id, is_active),
  INDEX idx_name (name),
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE
);

-- Workflows table for chaining templates together
CREATE TABLE IF NOT EXISTS ssnews_workflows (
  workflow_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL, -- NULL for global workflows
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSON NOT NULL, -- Array of workflow steps with template references
  input_sources JSON, -- Types of inputs this workflow accepts
  output_destinations JSON, -- Where outputs should go
  conditional_logic JSON, -- Rules for step execution
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(100) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_account_active (account_id, is_active),
  INDEX idx_name (name),
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE
);

-- Workflow executions for tracking runs and results
CREATE TABLE IF NOT EXISTS ssnews_workflow_executions (
  execution_id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_id INT NOT NULL,
  account_id INT NULL,
  blog_id INT NULL,
  article_id INT NULL,
  input_data JSON, -- The input data for this execution
  step_results JSON, -- Results from each step
  final_output JSON, -- Final combined output
  status ENUM('running', 'completed', 'failed', 'cancelled') DEFAULT 'running',
  error_message TEXT,
  execution_time_ms INT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  
  INDEX idx_workflow (workflow_id),
  INDEX idx_account_blog (account_id, blog_id),
  INDEX idx_status (status),
  INDEX idx_article (article_id),
  INDEX idx_started_at (started_at),
  FOREIGN KEY (workflow_id) REFERENCES ssnews_workflows(workflow_id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (blog_id) REFERENCES ssnews_blogs(blog_id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES ssnews_scraped_articles(article_id) ON DELETE SET NULL
);

-- Template library for pre-built templates
CREATE TABLE IF NOT EXISTS ssnews_template_library (
  library_id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags JSON, -- Array of searchable tags
  difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  use_case_description TEXT,
  example_input JSON, -- Sample input data
  example_output JSON, -- Sample expected output
  rating DECIMAL(3,2) DEFAULT 0.00,
  usage_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_category_featured (category, is_featured),
  INDEX idx_tags (tags),
  INDEX idx_difficulty (difficulty_level),
  INDEX idx_rating (rating DESC),
  INDEX idx_usage (usage_count DESC),
  FOREIGN KEY (template_id) REFERENCES ssnews_prompt_templates(template_id) ON DELETE CASCADE
);

-- Enhanced content generations tracking
CREATE TABLE IF NOT EXISTS ssnews_content_generations (
  generation_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL,
  blog_id INT NULL,
  article_id INT NULL,
  template_id INT NULL, -- Reference to template used
  workflow_id INT NULL, -- Reference to workflow used
  execution_id INT NULL, -- Reference to workflow execution
  content_type VARCHAR(100) NOT NULL,
  generation_method ENUM('legacy', 'template', 'workflow') DEFAULT 'template',
  input_data JSON, -- Original input data
  prompt_used TEXT, -- Final processed prompt
  content_generated JSON, -- Generated content
  metadata JSON, -- Generation metadata (model, tokens, etc.)
  generation_time_ms INT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_account_blog (account_id, blog_id),
  INDEX idx_template (template_id),
  INDEX idx_workflow (workflow_id),
  INDEX idx_execution (execution_id),
  INDEX idx_content_type (content_type),
  INDEX idx_method (generation_method),
  INDEX idx_success (success),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (blog_id) REFERENCES ssnews_blogs(blog_id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES ssnews_scraped_articles(article_id) ON DELETE SET NULL,
  FOREIGN KEY (template_id) REFERENCES ssnews_prompt_templates(template_id) ON DELETE SET NULL,
  FOREIGN KEY (workflow_id) REFERENCES ssnews_workflows(workflow_id) ON DELETE SET NULL,
  FOREIGN KEY (execution_id) REFERENCES ssnews_workflow_executions(execution_id) ON DELETE SET NULL
);

-- Variable definitions for reusable variables
CREATE TABLE IF NOT EXISTS ssnews_template_variables (
  variable_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL, -- NULL for global variables
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  data_type ENUM('text', 'number', 'boolean', 'array', 'object', 'step_output') DEFAULT 'text',
  default_value TEXT,
  validation_rules JSON, -- Validation rules for the variable
  is_required BOOLEAN DEFAULT FALSE,
  category VARCHAR(100), -- For grouping in UI
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_account_name (account_id, name),
  INDEX idx_category (category),
  INDEX idx_data_type (data_type),
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE
);

-- =============================================================================
-- SAMPLE DATA - PRE-BUILT TEMPLATES
-- =============================================================================

-- Social Media Templates
INSERT IGNORE INTO ssnews_prompt_templates (name, description, category, prompt, system_message, variables, input_schema, output_schema, ui_config) VALUES
(
  'Engaging Social Media Post',
  'Create engaging social media posts with hooks, emojis, and hashtags',
  'social_media',
  'Create an engaging social media post about this article:\n\nTitle: {{article.title}}\nContent: {{article.content}}\n\nRequirements:\n- Start with an attention-grabbing hook\n- Include relevant emojis\n- Add 3-5 relevant hashtags\n- Keep it under 280 characters for Twitter\n- Make it shareable and engaging',
  'You are a social media expert who creates viral, engaging content that drives engagement and shares.',
  '[{"name": "article.title", "displayName": "Article Title", "type": "input", "required": true}, {"name": "article.content", "displayName": "Article Content", "type": "input", "required": true}]',
  '{"fields": [{"name": "title", "type": "text", "required": true}, {"name": "content", "type": "text", "required": true}]}',
  '{"fields": [{"name": "post", "type": "text", "displayName": "Social Media Post"}, {"name": "hashtags", "type": "array", "displayName": "Hashtags"}, {"name": "character_count", "type": "number", "displayName": "Character Count"}]}',
  '{"icon": "share", "color": "#1DA1F2", "category": "social"}'
),
(
  'YouTube Video Script',
  'Create engaging YouTube video scripts with hooks and clear structure',
  'video_script',
  'Create a YouTube video script about this topic:\n\nTitle: {{article.title}}\nContent: {{article.content}}\n\nStructure:\n1. Hook (first 15 seconds)\n2. Introduction\n3. Main content (3-5 key points)\n4. Call to action\n5. Outro\n\nStyle: Conversational, engaging, with natural pauses for editing',
  'You are a YouTube content creator who makes educational videos that keep viewers engaged and subscribed.',
  '[{"name": "article.title", "displayName": "Article Title", "type": "input", "required": true}, {"name": "article.content", "displayName": "Article Content", "type": "input", "required": true}]',
  '{"fields": [{"name": "title", "type": "text", "required": true}, {"name": "content", "type": "text", "required": true}]}',
  '{"fields": [{"name": "script", "type": "text", "displayName": "Video Script"}, {"name": "hooks", "type": "array", "displayName": "Hook Options"}, {"name": "key_points", "type": "array", "displayName": "Key Points"}, {"name": "estimated_duration", "type": "text", "displayName": "Estimated Duration"}]}',
  '{"icon": "video", "color": "#FF0000", "category": "video"}'
),
(
  'SEO Blog Post',
  'Create SEO-optimised blog posts with proper structure and keywords',
  'blog_post',
  'Write a comprehensive blog post based on this article:\n\nTitle: {{article.title}}\nContent: {{article.content}}\n\nRequirements:\n- SEO-optimised title and headings\n- Introduction with hook\n- 3-5 main sections with H2/H3 headings\n- Include relevant keywords naturally\n- Conclusion with call to action\n- Meta description\n- Target length: 1200-1500 words',
  'You are an SEO content specialist who creates engaging, well-structured blog posts that rank well in search engines.',
  '[{"name": "article.title", "displayName": "Article Title", "type": "input", "required": true}, {"name": "article.content", "displayName": "Article Content", "type": "input", "required": true}]',
  '{"fields": [{"name": "title", "type": "text", "required": true}, {"name": "content", "type": "text", "required": true}]}',
  '{"fields": [{"name": "title", "type": "text", "displayName": "Blog Title"}, {"name": "meta_description", "type": "text", "displayName": "Meta Description"}, {"name": "content", "type": "text", "displayName": "Blog Content"}, {"name": "headings", "type": "array", "displayName": "Headings Structure"}, {"name": "keywords", "type": "array", "displayName": "Target Keywords"}]}',
  '{"icon": "file-text", "color": "#10B981", "category": "content"}'
);

-- Video Script Templates
INSERT IGNORE INTO ssnews_prompt_templates (name, description, category, prompt, system_message, variables, input_schema, output_schema, ui_config) VALUES
(
  'YouTube Explainer Script',
  'Create engaging YouTube video scripts with hooks and clear structure',
  'video_script',
  'Create a YouTube video script about this topic:\n\nTitle: {{article.title}}\nContent: {{article.content}}\n\nStructure:\n1. Hook (first 15 seconds)\n2. Introduction\n3. Main content (3-5 key points)\n4. Call to action\n5. Outro\n\nStyle: Conversational, engaging, with natural pauses for editing',
  'You are a YouTube content creator who makes educational videos that keep viewers engaged and subscribed.',
  '[{"name": "article.title", "displayName": "Article Title", "type": "input", "required": true}, {"name": "article.content", "displayName": "Article Content", "type": "input", "required": true}]',
  '{"fields": [{"name": "title", "type": "text", "required": true}, {"name": "content", "type": "text", "required": true}]}',
  '{"fields": [{"name": "script", "type": "text", "displayName": "Video Script"}, {"name": "hooks", "type": "array", "displayName": "Hook Options"}, {"name": "key_points", "type": "array", "displayName": "Key Points"}, {"name": "estimated_duration", "type": "text", "displayName": "Estimated Duration"}]}',
  '{"icon": "video", "color": "#FF0000", "category": "video"}'
);

-- Blog Post Templates
INSERT IGNORE INTO ssnews_prompt_templates (name, description, category, prompt, system_message, variables, input_schema, output_schema, ui_config) VALUES
(
  'SEO Blog Post',
  'Create SEO-optimised blog posts with proper structure and keywords',
  'blog_post',
  'Write a comprehensive blog post based on this article:\n\nTitle: {{article.title}}\nContent: {{article.content}}\n\nRequirements:\n- SEO-optimised title and headings\n- Introduction with hook\n- 3-5 main sections with H2/H3 headings\n- Include relevant keywords naturally\n- Conclusion with call to action\n- Meta description\n- Target length: 1200-1500 words',
  'You are an SEO content specialist who creates engaging, well-structured blog posts that rank well in search engines.',
  '[{"name": "article.title", "displayName": "Article Title", "type": "input", "required": true}, {"name": "article.content", "displayName": "Article Content", "type": "input", "required": true}]',
  '{"fields": [{"name": "title", "type": "text", "required": true}, {"name": "content", "type": "text", "required": true}]}',
  '{"fields": [{"name": "title", "type": "text", "displayName": "Blog Title"}, {"name": "meta_description", "type": "text", "displayName": "Meta Description"}, {"name": "content", "type": "text", "displayName": "Blog Content"}, {"name": "headings", "type": "array", "displayName": "Headings Structure"}, {"name": "keywords", "type": "array", "displayName": "Target Keywords"}]}',
  '{"icon": "file-text", "color": "#10B981", "category": "content"}'
);

-- =============================================================================
-- SAMPLE WORKFLOW
-- =============================================================================

-- Multi-step content creation workflow
INSERT IGNORE INTO ssnews_workflows (name, description, steps, input_sources, output_destinations) VALUES
(
  'Complete Content Package',
  'Generate a complete content package from a single article: blog post, social media, and video script',
  '[
    {
      "name": "blog_post",
      "displayName": "Blog Post",
      "templateId": 3,
      "order": 1,
      "conditions": [],
      "continueOnError": false
    },
    {
      "name": "social_media",
      "displayName": "Social Media Post",
      "templateId": 1,
      "order": 2,
      "conditions": [],
      "continueOnError": true
    },
    {
      "name": "video_script",
      "displayName": "Video Script",
      "templateId": 3,
      "order": 3,
      "conditions": [
        {
          "field": "blog_post.content",
          "operator": "exists",
          "value": true
        }
      ],
      "continueOnError": true
    }
  ]',
  '["news_article", "custom_input"]',
  '["database", "api", "export"]'
);

-- Add templates to library
INSERT IGNORE INTO ssnews_template_library (template_id, category, tags, difficulty_level, use_case_description, rating, is_featured) VALUES
(1, 'social_media', '["social", "twitter", "engagement", "viral"]', 'beginner', 'Perfect for creating engaging social media posts that drive shares and comments', 4.8, TRUE),
(2, 'social_media', '["linkedin", "professional", "b2b", "thought-leadership"]', 'intermediate', 'Create professional LinkedIn content that positions you as a thought leader', 4.6, FALSE),
(3, 'video_script', '["youtube", "explainer", "educational", "engagement"]', 'intermediate', 'Structure engaging YouTube videos that keep viewers watching until the end', 4.7, TRUE),
(4, 'blog_post', '["seo", "ranking", "keywords", "traffic"]', 'advanced', 'Create SEO-optimised blog posts that rank well and drive organic traffic', 4.9, TRUE);

COMMIT; 