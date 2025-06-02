-- Project Eden Database Schema
-- MySQL Database Schema for AI Content Automation System

-- System Logs Table
CREATE TABLE IF NOT EXISTS ssnews_system_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level ENUM('info', 'warn', 'error', 'debug') NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'server',
    metadata JSON NULL,
    job_id INT NULL,
    account_id VARCHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_level (level),
    INDEX idx_source (source),
    INDEX idx_job_id (job_id),
    INDEX idx_account_id (account_id),
    FOREIGN KEY (job_id) REFERENCES ssnews_jobs(job_id) ON DELETE CASCADE
);

-- Jobs Queue Table
CREATE TABLE IF NOT EXISTS ssnews_jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(64) NULL,
    account_id VARCHAR(64) NULL,
    job_type ENUM('content_generation', 'full_cycle', 'news_aggregation', 'ai_analysis', 'url_analysis') NOT NULL,
    status ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'queued',
    priority INT DEFAULT 0,
    payload JSON NULL,
    results JSON NULL,
    error_message TEXT NULL,
    progress_percentage INT DEFAULT 0,
    progress_details TEXT NULL,
    worker_id VARCHAR(100) NULL,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system',
    INDEX idx_status (status),
    INDEX idx_job_type (job_type),
    INDEX idx_priority_created (priority DESC, created_at ASC),
    INDEX idx_created_at (created_at),
    INDEX idx_worker (worker_id),
    INDEX idx_account_id (account_id)
);

-- News Sources Table
CREATE TABLE IF NOT EXISTS ssnews_news_sources (
    source_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    rss_feed_url VARCHAR(255) NULL,
    description TEXT NULL,
    last_scraped_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active),
    INDEX idx_account_id (account_id),
    UNIQUE KEY unique_name_per_account (account_id, name),
    UNIQUE KEY unique_url_per_account (account_id, url)
);

-- Scraped Articles Table
CREATE TABLE IF NOT EXISTS ssnews_scraped_articles (
    article_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,
    source_id INT NOT NULL,
    title TEXT NOT NULL,
    url VARCHAR(512) NOT NULL,
    publication_date DATETIME NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    full_text LONGTEXT NULL,
    summary_ai TEXT NULL,
    keywords_ai TEXT NULL,
    social_shares INT NULL,
    relevance_score FLOAT NULL,
    status ENUM('scraped', 'analyzed', 'processed') DEFAULT 'scraped',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES ssnews_news_sources(source_id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_publication_date (publication_date),
    INDEX idx_relevance_score (relevance_score),
    INDEX idx_account_id (account_id),
    UNIQUE KEY unique_url_per_account (account_id, url)
);

-- Eden Content Index Table
CREATE TABLE IF NOT EXISTS ssnews_eden_content_index (
    content_id INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(512) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    type ENUM('blog', 'product', 'social_post', 'newsletter_theme') NOT NULL,
    content_summary TEXT NULL,
    keywords TEXT NULL,
    last_indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_last_indexed (last_indexed_at)
);

-- Evergreen Content Ideas Table
CREATE TABLE IF NOT EXISTS ssnews_evergreen_content_ideas (
    evergreen_id INT AUTO_INCREMENT PRIMARY KEY,
    theme_category VARCHAR(255) NOT NULL,
    title_idea TEXT NOT NULL,
    brief_description TEXT NOT NULL,
    target_keywords TEXT NULL,
    relevant_product_types TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_theme_category (theme_category)
);

-- Evergreen Calendar Table
CREATE TABLE IF NOT EXISTS ssnews_evergreen_calendar (
    calendar_entry_id INT AUTO_INCREMENT PRIMARY KEY,
    month VARCHAR(20) NOT NULL,
    theme VARCHAR(255) NOT NULL,
    blog_article_idea_fk INT NULL,
    social_post_summary_idea TEXT NULL,
    video_idea_summary TEXT NULL,
    suggested_product_link_category VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (blog_article_idea_fk) REFERENCES ssnews_evergreen_content_ideas(evergreen_id) ON DELETE SET NULL,
    INDEX idx_month (month)
);

-- Generated Articles Table
CREATE TABLE IF NOT EXISTS ssnews_generated_articles (
    gen_article_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,
    based_on_scraped_article_id INT NULL,
    based_on_evergreen_id INT NULL,
    title TEXT NOT NULL,
    body_draft LONGTEXT NOT NULL,
    body_final LONGTEXT NULL,
    content_type ENUM('blog', 'pr_article', 'social_post_long') NOT NULL,
    word_count INT NULL,
    tone_of_voice_alignment_score_ai FLOAT NULL,
    suggested_eden_product_links TEXT NULL, -- JSON array
    status ENUM('draft', 'review_pending', 'approved', 'published', 'rejected') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    reviewed_by_human_at TIMESTAMP NULL,
    FOREIGN KEY (based_on_scraped_article_id) REFERENCES ssnews_scraped_articles(article_id) ON DELETE SET NULL,
    FOREIGN KEY (based_on_evergreen_id) REFERENCES ssnews_evergreen_content_ideas(evergreen_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_content_type (content_type),
    INDEX idx_created_at (created_at),
    INDEX idx_account_id (account_id)
);

-- Generated Social Posts Table
CREATE TABLE IF NOT EXISTS ssnews_generated_social_posts (
    gen_social_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,
    based_on_gen_article_id INT NULL,
    platform ENUM('instagram', 'facebook', 'linkedin') NOT NULL,
    text_draft TEXT NOT NULL,
    text_final TEXT NULL,
    emotional_hook_present_ai_check BOOLEAN NULL,
    status ENUM('draft', 'review_pending', 'approved', 'published', 'rejected') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (based_on_gen_article_id) REFERENCES ssnews_generated_articles(gen_article_id) ON DELETE CASCADE,
    INDEX idx_platform (platform),
    INDEX idx_status (status),
    INDEX idx_account_id (account_id)
);

-- Generated Video Scripts Table
CREATE TABLE IF NOT EXISTS ssnews_generated_video_scripts (
    gen_video_script_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,
    based_on_gen_article_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    duration_target_seconds INT NOT NULL,
    script_draft TEXT NOT NULL,
    script_final TEXT NULL,
    visual_suggestions TEXT NULL,
    status ENUM('draft', 'review_pending', 'approved') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (based_on_gen_article_id) REFERENCES ssnews_generated_articles(gen_article_id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_duration (duration_target_seconds),
    INDEX idx_account_id (account_id)
);

-- Image Assets Table
CREATE TABLE IF NOT EXISTS ssnews_image_assets (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,
    associated_content_type ENUM('gen_article', 'gen_social_post') NOT NULL,
    associated_content_id INT NOT NULL,
    source_api ENUM('pexels', 'sirv_upload', 'eden_library', 'ideogram') NOT NULL,
    source_image_id_external VARCHAR(255) NULL,
    sirv_cdn_url VARCHAR(512) NOT NULL,
    alt_text_suggestion_ai VARCHAR(255) NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_approved_human BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_associated_content (associated_content_type, associated_content_id),
    INDEX idx_approved (is_approved_human),
    INDEX idx_account_id (account_id),
    UNIQUE KEY unique_sirv_url_per_account (account_id, sirv_cdn_url)
);

-- User Bookmarks Table
CREATE TABLE IF NOT EXISTS ssnews_user_bookmarks (
    bookmark_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    user_email VARCHAR(255) NULL,
    article_id INT NOT NULL,
    bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES ssnews_scraped_articles(article_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_article_id (article_id),
    UNIQUE KEY unique_user_article (user_id, article_id)
);

-- Generic Content System Tables

-- Prompt Configuration Table - Defines content types and their rules
CREATE TABLE IF NOT EXISTS ssnews_prompt_configuration (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64),
    prompt_category VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    storage_schema JSON NOT NULL,
    ui_config JSON NOT NULL,
    generation_config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_category (account_id, prompt_category),
    INDEX idx_category (prompt_category),
    UNIQUE KEY unique_account_category (account_id, prompt_category)
);

-- Generic Content Storage Table - Stores all generated content as JSON
CREATE TABLE IF NOT EXISTS ssnews_generated_content (
    content_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64),
    based_on_gen_article_id INT NOT NULL,
    prompt_category VARCHAR(50) NOT NULL,
    content_data JSON NOT NULL,
    metadata JSON,
    status ENUM('draft', 'approved', 'rejected', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_article_category (based_on_gen_article_id, prompt_category),
    INDEX idx_account_status (account_id, status),
    INDEX idx_category_status (prompt_category, status),
    FOREIGN KEY (based_on_gen_article_id) REFERENCES ssnews_generated_articles(gen_article_id) ON DELETE CASCADE
);

-- Insert default prayer points configuration for existing accounts
INSERT IGNORE INTO ssnews_prompt_configuration 
(account_id, prompt_category, display_name, storage_schema, ui_config, generation_config) 
VALUES 
('56a17e9b-2274-40cc-8c83-4979e8df671a', 'prayer_points', 'Prayer Points', 
JSON_OBJECT(
    'type', 'array',
    'max_items', 5,
    'items', JSON_OBJECT(
        'order_number', JSON_OBJECT('type', 'integer', 'required', true),
        'prayer_text', JSON_OBJECT('type', 'string', 'max_length', 200, 'required', true),
        'theme', JSON_OBJECT('type', 'string', 'max_length', 50)
    )
),
JSON_OBJECT(
    'tab_name', 'Prayer Points',
    'icon', 'Heart',
    'display_type', 'numbered_list',
    'empty_message', 'No prayer points generated',
    'count_in_tab', true,
    'order', 4
),
JSON_OBJECT(
    'model', 'gemini',
    'max_tokens', 1000,
    'temperature', 0.7,
    'prompt_template', 'prayer',
    'fallback_template', 'prayer',
    'custom_instructions', 'Create 5 prayer points, 15-25 words each, covering different aspects: people affected, healing, guidance, hope, and justice.'
));

-- Insert initial news sources
INSERT IGNORE INTO ssnews_news_sources (name, url, rss_feed_url, is_active) VALUES
('Premier Christian News', 'https://premierchristian.news', 'https://premierchristian.news/rss', TRUE),
('Christian Today UK', 'https://christiantoday.com/uk', 'https://christiantoday.com/rss', TRUE),
('Church Times', 'https://churchtimes.co.uk', 'https://churchtimes.co.uk/rss', TRUE),
('Evangelical Alliance', 'https://eauk.org', 'https://eauk.org/news/rss', TRUE),
('Christian Concern', 'https://christianconcern.com', 'https://christianconcern.com/rss', TRUE),
('Baptist Times', 'https://baptist.org.uk/news', NULL, TRUE),
('Catholic Herald UK', 'https://catholicherald.co.uk', 'https://catholicherald.co.uk/rss', TRUE),
('UCB', 'https://ucb.co.uk/news', 'https://ucb.co.uk/rss', TRUE);

-- Update existing table to include ideogram in source_api enum
ALTER TABLE ssnews_image_assets MODIFY COLUMN source_api ENUM('pexels', 'sirv_upload', 'eden_library', 'ideogram') NOT NULL; 