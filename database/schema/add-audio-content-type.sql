-- Add audio content type to prompt templates category ENUM
-- This completes the text/video/audio/image media type coverage

ALTER TABLE ssnews_prompt_templates 
MODIFY COLUMN category ENUM(
  'blog_post', 
  'social_media', 
  'video_script', 
  'analysis',
  'prayer',
  'image_generation',
  'devotional',
  'newsletter',
  'sermon',
  'audio_script',
  'podcast'
) NOT NULL;

-- Insert sample audio content templates
INSERT IGNORE INTO ssnews_prompt_templates (name, description, category) VALUES
('Audio Script Generator', 'Creates scripts for audio content and podcasts', 'audio_script'),
('Podcast Episode Outline', 'Generates podcast episode outlines and talking points', 'podcast'); 