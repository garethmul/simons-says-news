-- Project Eden Database Schema
-- MySQL Database Schema for AI Content Automation System

-- News Sources Table
CREATE TABLE IF NOT EXISTS ssnews_news_sources (
    source_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    url VARCHAR(255) NOT NULL UNIQUE,
    rss_feed_url VARCHAR(255) NULL,
    last_scraped_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active)
);

-- Scraped Articles Table
CREATE TABLE IF NOT EXISTS ssnews_scraped_articles (
    article_id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT NOT NULL,
    title TEXT NOT NULL,
    url VARCHAR(512) UNIQUE NOT NULL,
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
    INDEX idx_relevance_score (relevance_score)
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
    based_on_scraped_article_id INT NULL,
    based_on_evergreen_id INT NULL,
    title TEXT NOT NULL,
    body_draft LONGTEXT NOT NULL,
    body_final LONGTEXT NULL,
    content_type ENUM('blog', 'pr_article', 'social_post_long') NOT NULL,
    word_count INT NULL,
    tone_of_voice_alignment_score_ai FLOAT NULL,
    suggested_eden_product_links TEXT NULL, -- JSON array
    status ENUM('draft', 'review_pending', 'approved', 'published') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    reviewed_by_human_at TIMESTAMP NULL,
    FOREIGN KEY (based_on_scraped_article_id) REFERENCES ssnews_scraped_articles(article_id) ON DELETE SET NULL,
    FOREIGN KEY (based_on_evergreen_id) REFERENCES ssnews_evergreen_content_ideas(evergreen_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_content_type (content_type),
    INDEX idx_created_at (created_at)
);

-- Generated Social Posts Table
CREATE TABLE IF NOT EXISTS ssnews_generated_social_posts (
    gen_social_id INT AUTO_INCREMENT PRIMARY KEY,
    based_on_gen_article_id INT NULL,
    platform ENUM('instagram', 'facebook', 'linkedin') NOT NULL,
    text_draft TEXT NOT NULL,
    text_final TEXT NULL,
    emotional_hook_present_ai_check BOOLEAN NULL,
    status ENUM('draft', 'review_pending', 'approved', 'published') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (based_on_gen_article_id) REFERENCES ssnews_generated_articles(gen_article_id) ON DELETE CASCADE,
    INDEX idx_platform (platform),
    INDEX idx_status (status)
);

-- Generated Video Scripts Table
CREATE TABLE IF NOT EXISTS ssnews_generated_video_scripts (
    gen_video_script_id INT AUTO_INCREMENT PRIMARY KEY,
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
    INDEX idx_duration (duration_target_seconds)
);

-- Image Assets Table
CREATE TABLE IF NOT EXISTS ssnews_image_assets (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    associated_content_type ENUM('gen_article', 'gen_social_post') NOT NULL,
    associated_content_id INT NOT NULL,
    source_api ENUM('pexels', 'sirv_upload', 'eden_library') NOT NULL,
    source_image_id_external VARCHAR(255) NULL,
    sirv_cdn_url VARCHAR(512) UNIQUE NOT NULL,
    alt_text_suggestion_ai VARCHAR(255) NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_approved_human BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_associated_content (associated_content_type, associated_content_id),
    INDEX idx_approved (is_approved_human)
);

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