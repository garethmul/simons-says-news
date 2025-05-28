-- Prompt Templates Table
CREATE TABLE IF NOT EXISTS ssnews_prompt_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category ENUM('blog_post', 'social_media', 'video_script', 'analysis') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);

-- Prompt Versions Table
CREATE TABLE IF NOT EXISTS ssnews_prompt_versions (
    version_id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    version_number INT NOT NULL,
    prompt_content TEXT NOT NULL,
    system_message TEXT,
    parameters JSON,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE,
    notes TEXT,
    FOREIGN KEY (template_id) REFERENCES ssnews_prompt_templates(template_id) ON DELETE CASCADE,
    UNIQUE KEY unique_template_version (template_id, version_number),
    INDEX idx_template_current (template_id, is_current),
    INDEX idx_created_at (created_at)
);

-- Content Generation Log Table (links content to prompts)
CREATE TABLE IF NOT EXISTS ssnews_content_generation_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    generated_article_id INT,
    template_id INT NOT NULL,
    version_id INT NOT NULL,
    ai_service ENUM('openai', 'gemini') NOT NULL,
    model_used VARCHAR(100),
    tokens_used INT,
    generation_time_ms INT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_article_id) REFERENCES ssnews_generated_articles(gen_article_id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES ssnews_prompt_templates(template_id) ON DELETE CASCADE,
    FOREIGN KEY (version_id) REFERENCES ssnews_prompt_versions(version_id) ON DELETE CASCADE,
    INDEX idx_generated_article (generated_article_id),
    INDEX idx_template (template_id),
    INDEX idx_created_at (created_at)
);

-- Insert default prompt templates
INSERT IGNORE INTO ssnews_prompt_templates (name, description, category) VALUES
('Blog Post Generator', 'Generates engaging blog posts from news articles', 'blog_post'),
('Social Media Post', 'Creates social media content for various platforms', 'social_media'),
('Video Script Creator', 'Generates video scripts for different durations', 'video_script'),
('Article Analyzer', 'Analyzes articles for relevance and generates summaries', 'analysis');

-- Insert default prompt versions
INSERT IGNORE INTO ssnews_prompt_versions (template_id, version_number, prompt_content, system_message, is_current, notes) VALUES
(1, 1, 'Create an engaging blog post based on this news article. The blog post should be warm, encouraging, and reflect Christian values. Include relevant Bible verses where appropriate and maintain a hopeful tone throughout.\n\nNews Article:\n{article_content}\n\nPlease write a blog post that:\n- Has an engaging title\n- Is 800-1200 words long\n- Includes 2-3 relevant Bible verses\n- Maintains Eden.co.uk''s warm, encouraging tone\n- Ends with a call to action or reflection question', 'You are a Christian content writer for Eden.co.uk, a platform that shares encouraging Christian content. Your writing should be warm, hopeful, and biblically grounded.', TRUE, 'Initial blog post generation prompt'),
(2, 1, 'Create social media content based on this news article. Generate posts for different platforms that are engaging and reflect Christian values.\n\nNews Article:\n{article_content}\n\nGenerate:\n1. Facebook post (150-200 words)\n2. Twitter/X post (under 280 characters)\n3. Instagram caption (100-150 words with hashtags)\n\nEach post should be encouraging, include relevant scripture if appropriate, and maintain Eden.co.uk''s hopeful tone.', 'You are a social media manager for Eden.co.uk. Create engaging, encouraging Christian content that inspires and uplifts followers.', TRUE, 'Initial social media generation prompt'),
(3, 1, 'Create a video script based on this news article. The script should be engaging, encouraging, and suitable for Christian audiences.\n\nNews Article:\n{article_content}\n\nScript Requirements:\n- Duration: {duration} seconds\n- Include introduction, main content, and conclusion\n- Maintain conversational, warm tone\n- Include relevant Bible verses where appropriate\n- End with encouragement or call to action\n\nFormat as: [Scene descriptions] and spoken content.', 'You are a video script writer for Eden.co.uk. Create engaging, biblically-grounded content that encourages and inspires viewers.', TRUE, 'Initial video script generation prompt'),
(4, 1, 'Analyze this news article for relevance to Christian audiences and Eden.co.uk''s mission. Provide a relevance score and detailed analysis.\n\nNews Article:\n{article_content}\n\nPlease provide:\n1. Relevance score (0.0 to 1.0)\n2. Summary (2-3 sentences)\n3. Key themes\n4. Potential Christian perspectives\n5. Recommended content approach\n\nFocus on stories that relate to faith, values, social issues, or topics that would interest Christian readers.', 'You are an AI analyst specializing in Christian content curation. Evaluate content for its relevance and potential impact on Christian audiences.', TRUE, 'Initial article analysis prompt'); 