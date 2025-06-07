-- Enhanced AI Response Logging Table
-- This table captures the full AI prompt, response, and metadata including stop reasons
CREATE TABLE IF NOT EXISTS ssnews_ai_response_log (
    response_log_id INT AUTO_INCREMENT PRIMARY KEY,
    generated_article_id INT,
    template_id INT,
    version_id INT,
    content_category VARCHAR(50) NOT NULL,
    ai_service ENUM('openai', 'gemini', 'ideogram') NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    
    -- Full prompt and response data
    prompt_text LONGTEXT NOT NULL,
    system_message TEXT,
    response_text LONGTEXT,
    
    -- Detailed metadata from AI service
    tokens_used_input INT,
    tokens_used_output INT,
    tokens_used_total INT,
    generation_time_ms INT,
    temperature DECIMAL(3,2),
    max_output_tokens INT,
    
    -- Stop reason and completion details
    stop_reason VARCHAR(100),  -- e.g., 'STOP', 'MAX_TOKENS', 'SAFETY', 'ERROR'
    finish_reason VARCHAR(100), -- OpenAI specific finish reason
    is_complete BOOLEAN DEFAULT FALSE,
    is_truncated BOOLEAN DEFAULT FALSE,
    
    -- Safety and filtering
    safety_ratings JSON,
    content_filter_applied BOOLEAN DEFAULT FALSE,
    
    -- Status tracking
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    warning_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_article_category (generated_article_id, content_category),
    INDEX idx_template (template_id),
    INDEX idx_service_model (ai_service, model_used),
    INDEX idx_stop_reason (stop_reason),
    INDEX idx_truncated (is_truncated),
    INDEX idx_created_at (created_at),
    
    -- Foreign keys
    FOREIGN KEY (generated_article_id) REFERENCES ssnews_generated_articles(gen_article_id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES ssnews_prompt_templates(template_id) ON DELETE SET NULL,
    FOREIGN KEY (version_id) REFERENCES ssnews_prompt_versions(version_id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_response_analysis ON ssnews_ai_response_log 
(ai_service, stop_reason, is_truncated, created_at);

-- View for quick truncation analysis
CREATE OR REPLACE VIEW v_truncated_responses AS
SELECT 
    response_log_id,
    generated_article_id,
    content_category,
    ai_service,
    model_used,
    stop_reason,
    tokens_used_output,
    max_output_tokens,
    CASE 
        WHEN tokens_used_output >= max_output_tokens THEN 'TOKEN_LIMIT_HIT'
        WHEN stop_reason != 'STOP' THEN 'ABNORMAL_STOP'
        ELSE 'NORMAL_COMPLETION'
    END as completion_analysis,
    LEFT(response_text, 100) as response_preview,
    created_at
FROM ssnews_ai_response_log
WHERE is_truncated = TRUE OR stop_reason != 'STOP'
ORDER BY created_at DESC;

-- View for generation summary
CREATE OR REPLACE VIEW v_generation_summary AS
SELECT 
    DATE(created_at) as generation_date,
    content_category,
    ai_service,
    COUNT(*) as total_generations,
    SUM(CASE WHEN is_truncated = TRUE THEN 1 ELSE 0 END) as truncated_count,
    SUM(CASE WHEN stop_reason != 'STOP' THEN 1 ELSE 0 END) as abnormal_stops,
    AVG(tokens_used_output) as avg_output_tokens,
    AVG(generation_time_ms) as avg_generation_time_ms
FROM ssnews_ai_response_log
GROUP BY DATE(created_at), content_category, ai_service
ORDER BY generation_date DESC, content_category; 