-- Multi-Tenant Architecture Migration Script
-- Phase 1: Create new tables for organizations and accounts

-- Organizations table (Level 1)
CREATE TABLE IF NOT EXISTS ssnews_organizations (
    organization_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
);

-- Accounts table (Level 2)
CREATE TABLE IF NOT EXISTS ssnews_accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES ssnews_organizations(organization_id) ON DELETE CASCADE,
    UNIQUE KEY unique_org_slug (organization_id, slug),
    INDEX idx_organization (organization_id),
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
);

-- User-Organization associations with roles
CREATE TABLE IF NOT EXISTS ssnews_user_organizations (
    user_org_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL, -- Firebase user ID
    user_email VARCHAR(255) NOT NULL,
    organization_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES ssnews_organizations(organization_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_org (user_id, organization_id),
    INDEX idx_user_id (user_id),
    INDEX idx_organization_id (organization_id),
    INDEX idx_role (role)
);

-- User-Account permissions (optional granular permissions per account)
CREATE TABLE IF NOT EXISTS ssnews_user_accounts (
    user_account_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    account_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member') DEFAULT NULL, -- NULL means inherit from organization
    permissions JSON DEFAULT NULL, -- For future granular permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_account (user_id, account_id),
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id)
);

-- Phase 2: Add account_id columns to all existing tables (without foreign keys first)

-- News Sources
ALTER TABLE ssnews_news_sources 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER source_id;

-- Scraped Articles
ALTER TABLE ssnews_scraped_articles 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER article_id;

-- Generated Articles
ALTER TABLE ssnews_generated_articles 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER gen_article_id;

-- Generated Social Posts
ALTER TABLE ssnews_generated_social_posts 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER gen_social_id;

-- Generated Video Scripts
ALTER TABLE ssnews_generated_video_scripts 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER gen_video_script_id;

-- Prompt Templates
ALTER TABLE ssnews_prompt_templates 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER template_id;

-- User Bookmarks
ALTER TABLE ssnews_user_bookmarks 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER bookmark_id;

-- Jobs
ALTER TABLE ssnews_jobs 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER job_id;

-- Evergreen Content Ideas
ALTER TABLE ssnews_evergreen_content_ideas 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER evergreen_id;

-- Image Assets
ALTER TABLE ssnews_image_assets 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER image_id;

-- System Logs (optional - you might want logs to be global)
ALTER TABLE ssnews_system_logs 
    ADD COLUMN IF NOT EXISTS account_id INT NULL AFTER log_id;

-- Phase 3: Create default organization and account for backward compatibility

-- Insert default organization
INSERT IGNORE INTO ssnews_organizations (name, slug) 
VALUES ('Default Organization', 'default');

-- Insert default account
INSERT IGNORE INTO ssnews_accounts (organization_id, name, slug) 
SELECT organization_id, 'Default Account', 'default' 
FROM ssnews_organizations 
WHERE slug = 'default' 
LIMIT 1;

-- Phase 4: Migrate existing data to default account
SET @default_account_id = (SELECT account_id FROM ssnews_accounts WHERE slug = 'default' LIMIT 1);

-- Update all tables with the default account_id (only where account_id is NULL)
UPDATE ssnews_news_sources SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_scraped_articles SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_generated_articles SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_generated_social_posts SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_generated_video_scripts SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_prompt_templates SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_user_bookmarks SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_jobs SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_evergreen_content_ideas SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_image_assets SET account_id = @default_account_id WHERE account_id IS NULL;
UPDATE ssnews_system_logs SET account_id = @default_account_id WHERE account_id IS NULL;

-- Phase 5: Add indexes after data migration
ALTER TABLE ssnews_news_sources ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_scraped_articles ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_generated_articles ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_generated_social_posts ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_generated_video_scripts ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_prompt_templates ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_user_bookmarks ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_jobs ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_evergreen_content_ideas ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_image_assets ADD INDEX IF NOT EXISTS idx_account_id (account_id);
ALTER TABLE ssnews_system_logs ADD INDEX IF NOT EXISTS idx_account_id (account_id);

-- Phase 6: Add foreign key constraints after data migration and indexes
ALTER TABLE ssnews_news_sources ADD CONSTRAINT IF NOT EXISTS fk_news_sources_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_scraped_articles ADD CONSTRAINT IF NOT EXISTS fk_scraped_articles_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_generated_articles ADD CONSTRAINT IF NOT EXISTS fk_generated_articles_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_generated_social_posts ADD CONSTRAINT IF NOT EXISTS fk_generated_social_posts_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_generated_video_scripts ADD CONSTRAINT IF NOT EXISTS fk_generated_video_scripts_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_prompt_templates ADD CONSTRAINT IF NOT EXISTS fk_prompt_templates_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_user_bookmarks ADD CONSTRAINT IF NOT EXISTS fk_user_bookmarks_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_jobs ADD CONSTRAINT IF NOT EXISTS fk_jobs_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_evergreen_content_ideas ADD CONSTRAINT IF NOT EXISTS fk_evergreen_content_ideas_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_image_assets ADD CONSTRAINT IF NOT EXISTS fk_image_assets_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

ALTER TABLE ssnews_system_logs ADD CONSTRAINT IF NOT EXISTS fk_system_logs_account 
    FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE;

-- Phase 7: Make account_id NOT NULL after migration (except system_logs)
ALTER TABLE ssnews_news_sources MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_scraped_articles MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_generated_articles MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_generated_social_posts MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_generated_video_scripts MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_prompt_templates MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_user_bookmarks MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_jobs MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_evergreen_content_ideas MODIFY account_id INT NOT NULL;
ALTER TABLE ssnews_image_assets MODIFY account_id INT NOT NULL;
-- Keep system_logs account_id as nullable for global logs 