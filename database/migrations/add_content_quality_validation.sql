-- Content Quality Validation Enhancement
-- Adds fields to track and validate article content quality for generation eligibility

-- Add content quality fields to scraped articles
ALTER TABLE ssnews_scraped_articles 
ADD COLUMN IF NOT EXISTS content_quality_score DECIMAL(3,2) DEFAULT 0.0 COMMENT 'Content quality score 0.0-1.0',
ADD COLUMN IF NOT EXISTS min_content_length_met BOOLEAN DEFAULT FALSE COMMENT 'Whether article meets minimum length requirement',
ADD COLUMN IF NOT EXISTS content_generation_eligible BOOLEAN DEFAULT FALSE COMMENT 'Whether article is eligible for content generation',
ADD COLUMN IF NOT EXISTS content_issues TEXT NULL COMMENT 'JSON array of content quality issues identified';

-- Add indexes for content quality filtering
CREATE INDEX idx_content_quality_score ON ssnews_scraped_articles(content_quality_score);
CREATE INDEX idx_content_generation_eligible ON ssnews_scraped_articles(content_generation_eligible);
CREATE INDEX idx_min_content_length_met ON ssnews_scraped_articles(min_content_length_met);

-- Add content quality tracking to generated articles
ALTER TABLE ssnews_generated_articles
ADD COLUMN IF NOT EXISTS source_content_quality_score DECIMAL(3,2) DEFAULT NULL COMMENT 'Quality score of source article when generated',
ADD COLUMN IF NOT EXISTS generation_quality_override BOOLEAN DEFAULT FALSE COMMENT 'Whether generation was forced despite low quality';

-- Create content quality monitoring table
CREATE TABLE IF NOT EXISTS ssnews_content_quality_log (
  quality_log_id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  source_id INT NULL,
  account_id INT NULL,
  content_length INT NOT NULL,
  quality_score DECIMAL(3,2) NOT NULL,
  is_eligible_for_generation BOOLEAN NOT NULL,
  meets_min_length BOOLEAN NOT NULL,
  is_title_only BOOLEAN NOT NULL,
  quality_issues JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_article_id (article_id),
  INDEX idx_source_id (source_id),
  INDEX idx_account_id (account_id),
  INDEX idx_quality_score (quality_score),
  INDEX idx_eligible (is_eligible_for_generation),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (article_id) REFERENCES ssnews_scraped_articles(article_id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE SET NULL
) COMMENT='Tracks content quality assessments for monitoring and analysis';

-- Create source quality monitoring view
CREATE OR REPLACE VIEW ssnews_source_quality_summary AS
SELECT 
  sa.source_id,
  ns.name as source_name,
  ns.url as source_url,
  COUNT(*) as total_articles,
  AVG(CHAR_LENGTH(sa.full_text)) as avg_content_length,
  AVG(sa.content_quality_score) as avg_quality_score,
  COUNT(CASE WHEN sa.content_generation_eligible = TRUE THEN 1 END) as eligible_articles,
  COUNT(CASE WHEN CHAR_LENGTH(sa.full_text) < 500 THEN 1 END) as short_articles,
  COUNT(CASE WHEN CHAR_LENGTH(sa.full_text) < 100 THEN 1 END) as very_short_articles,
  (COUNT(CASE WHEN CHAR_LENGTH(sa.full_text) < 500 THEN 1 END) / COUNT(*)) as short_article_ratio,
  (COUNT(CASE WHEN sa.content_generation_eligible = TRUE THEN 1 END) / COUNT(*)) as eligibility_ratio,
  MAX(sa.created_at) as last_article_date,
  COUNT(CASE WHEN sa.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recent_articles
FROM ssnews_scraped_articles sa
LEFT JOIN ssnews_news_sources ns ON sa.source_id = ns.source_id
WHERE sa.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY sa.source_id, ns.name, ns.url
HAVING total_articles >= 3
ORDER BY short_article_ratio DESC, avg_quality_score ASC;

-- Update existing articles with initial quality assessment (will be refined by the service)
UPDATE ssnews_scraped_articles 
SET 
  min_content_length_met = CASE WHEN CHAR_LENGTH(full_text) >= 500 THEN TRUE ELSE FALSE END,
  content_generation_eligible = CASE 
    WHEN CHAR_LENGTH(full_text) >= 500 AND CHAR_LENGTH(full_text) > CHAR_LENGTH(title) + 50 THEN TRUE 
    ELSE FALSE 
  END,
  content_quality_score = CASE 
    WHEN CHAR_LENGTH(full_text) <= CHAR_LENGTH(title) + 50 THEN 0.0
    WHEN CHAR_LENGTH(full_text) < 500 THEN ROUND(CHAR_LENGTH(full_text) / 500 * 0.3, 2)
    WHEN CHAR_LENGTH(full_text) < 1000 THEN ROUND(0.3 + (CHAR_LENGTH(full_text) / 1000) * 0.4, 2)
    ELSE ROUND(0.7 + LEAST((CHAR_LENGTH(full_text) / 2000) * 0.3, 0.3), 2)
  END
WHERE content_quality_score = 0.0; 