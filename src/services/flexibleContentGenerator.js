/**
 * FLEXIBLE CONTENT GENERATOR
 * Routes by media type instead of restrictive categories
 * Supports unlimited user-defined content types while maintaining functionality
 */

import aiService from './aiService.js';

class FlexibleContentGenerator {
  constructor() {
    this.supportedMediaTypes = ['text', 'video', 'audio', 'image'];
    this.supportedParsingMethods = ['generic', 'social_media', 'video_script', 'prayer_points', 'json', 'structured'];
  }

  // ============================================================================
  // MAIN GENERATION METHODS - ROUTE BY MEDIA TYPE
  // ============================================================================

  /**
   * Generate content based on media type instead of specific category
   * This preserves functionality while removing category restrictions
   */
  async generateContent(template, article, blogId, accountId = null) {
    console.log(`🎨 Generating content: ${template.category} (${template.media_type})`);
    
    try {
      const { media_type, parsing_method, category } = template;
      
      // Route by media type for AI generation
      let rawContent;
      switch (media_type) {
        case 'text':
          rawContent = await this.generateTextContent(template, article, blogId);
          break;
        case 'video':
          rawContent = await this.generateVideoContent(template, article, blogId);
          break;
        case 'audio':
          rawContent = await this.generateAudioContent(template, article, blogId);
          break;
        case 'image':
          rawContent = await this.generateImageContent(template, article, blogId);
          break;
        default:
          throw new Error(`Unsupported media type: ${media_type}`);
      }

      // Parse based on parsing method, not category
      const parsedContent = this.parseContent(rawContent, parsing_method, category);
      
      console.log(`✅ Generated and parsed ${category} content (${media_type})`);
      return parsedContent;
      
    } catch (error) {
      console.error(`❌ Error generating ${template.category} content:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // MEDIA TYPE GENERATION - FUNCTIONAL ROUTING
  // ============================================================================

  /**
   * Generate text content - handles all text-based categories
   */
  async generateTextContent(template, article, blogId) {
    console.log(`📝 Generating text content for: ${template.category}`);
    
    // Use the existing prompt and system message from template
    const prompt = this.populatePromptVariables(template.prompt_content, article);
    const systemMessage = template.system_message || `You are an AI assistant generating ${template.category} content.`;
    
    return await aiService.generateWithPrompt(prompt, systemMessage, template.category, blogId);
  }

  /**
   * Generate video content - handles all video-based categories
   */
  async generateVideoContent(template, article, blogId) {
    console.log(`🎥 Generating video content for: ${template.category}`);
    
    const prompt = this.populatePromptVariables(template.prompt_content, article);
    const systemMessage = template.system_message || `You are an AI assistant creating video content for ${template.category}.`;
    
    // Use specialized video generation if available, otherwise generic
    if (template.parsing_method === 'video_script') {
      return await aiService.generateVideoScriptWithPrompt(prompt, systemMessage, blogId);
    } else {
      return await aiService.generateWithPrompt(prompt, systemMessage, template.category, blogId);
    }
  }

  /**
   * Generate audio content - handles all audio-based categories
   */
  async generateAudioContent(template, article, blogId) {
    console.log(`🎵 Generating audio content for: ${template.category}`);
    
    const prompt = this.populatePromptVariables(template.prompt_content, article);
    const systemMessage = template.system_message || `You are an AI assistant creating audio content for ${template.category}.`;
    
    return await aiService.generateWithPrompt(prompt, systemMessage, template.category, blogId);
  }

  /**
   * Generate image content - handles all image-based categories
   */
  async generateImageContent(template, article, blogId, accountId = null) {
    console.log(`🖼️ Generating image content for: ${template.category}`);
    
    // Special handling for image generation (same as existing system)
    const prompt = this.populatePromptVariables(template.prompt_content, article);
    const systemMessage = template.system_message || `You are an AI assistant creating image descriptions for ${template.category}.`;
    
    // First generate the image prompt, then create the actual image (now with account settings!)
    const visualDescription = await aiService.generateWithPrompt(prompt, systemMessage, template.category, blogId);
    return await aiService.generateImageWithIdeogram(visualDescription, blogId, accountId);
  }

  // ============================================================================
  // CONTENT PARSING - BY PARSING METHOD, NOT CATEGORY
  // ============================================================================

  /**
   * Parse content based on parsing method, preserving specialized functionality
   */
  parseContent(rawContent, parsingMethod, contentType) {
    console.log(`🔧 Parsing content using method: ${parsingMethod} for type: ${contentType}`);
    
    try {
      switch (parsingMethod) {
        case 'social_media':
          return this.parseSocialMediaContent(rawContent);
        case 'video_script':
          return this.parseVideoScriptContent(rawContent);
        case 'prayer_points':
          return this.parsePrayerPointsContent(rawContent);
        case 'json':
          return this.parseJSONContent(rawContent);
        case 'structured':
          return this.parseStructuredContent(rawContent, contentType);
        case 'generic':
        default:
          return this.parseGenericContent(rawContent, contentType);
      }
    } catch (error) {
      console.warn(`⚠️ Parsing failed for ${parsingMethod}, falling back to generic:`, error.message);
      return this.parseGenericContent(rawContent, contentType);
    }
  }

  /**
   * Existing specialized parsers (preserved functionality)
   */
  parseSocialMediaContent(content) {
    try {
      const parsed = JSON.parse(content);
      const platforms = ['facebook', 'instagram', 'linkedin', 'twitter'];
      const socialPosts = [];
      
      platforms.forEach((platform, index) => {
        if (parsed[platform]) {
          socialPosts.push({
            platform,
            text: parsed[platform].text || parsed[platform],
            hashtags: parsed[platform].hashtags || [],
            order_number: index + 1
          });
        }
      });
      return socialPosts;
    } catch (error) {
      // Fallback to generic posts
      return [{ platform: 'general', text: content.substring(0, 300) }];
    }
  }

  parseVideoScriptContent(content) {
    try {
      const parsed = JSON.parse(content);
      return [{
        title: parsed.title || 'Video Script',
        script: parsed.script || content,
        duration: parsed.duration || 60,
        visual_suggestions: parsed.visualSuggestions || [],
        order_number: 1
      }];
    } catch (error) {
      return [{
        title: 'Video Script',
        script: content,
        duration: 60,
        visual_suggestions: [],
        order_number: 1
      }];
    }
  }

  parsePrayerPointsContent(content) {
    const prayerPoints = [];
    const lines = content.split('\n\n').filter(line => line.trim().length > 0);
    
    lines.forEach((line, index) => {
      const cleanLine = line.trim();
      if (cleanLine.length > 10) {
        prayerPoints.push({
          order_number: index + 1,
          prayer_text: cleanLine,
          theme: this.extractThemeFromPrayer(cleanLine)
        });
      }
    });
    return prayerPoints;
  }

  parseJSONContent(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      return { content: content, parsed: false };
    }
  }

  parseStructuredContent(content, contentType) {
    // For structured content, try to extract sections/headings
    const sections = content.split('\n\n').filter(section => section.trim());
    return sections.map((section, index) => ({
      order_number: index + 1,
      content: section.trim(),
      type: contentType
    }));
  }

  parseGenericContent(content, contentType) {
    // Generic parsing for any content type
    return [{
      order_number: 1,
      content: content,
      type: contentType,
      generated_at: new Date().toISOString()
    }];
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Populate prompt variables with article data
   */
  populatePromptVariables(promptTemplate, article) {
    let populatedPrompt = promptTemplate;
    
    const variables = {
      'article_content': `Title: ${article.title}\n\nContent: ${article.body_final || article.body_draft || 'No content available'}\n\nSource: ${article.source_name || 'Unknown'}`,
      'article.title': article.title || 'No title',
      'article.content': article.body_final || article.body_draft || 'No content available',
      'article.summary': (article.body_final || article.body_draft || 'No content available').substring(0, 300) || 'No summary available',
      'article.source': article.source_name || 'Unknown',
      'article.url': article.url || ''
    };

    // Replace all variable patterns
    for (const [key, value] of Object.entries(variables)) {
      const patterns = [
        new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),  // {{variable}}
        new RegExp(`\\{${key}\\}`, 'g')                  // {variable}
      ];
      
      patterns.forEach(pattern => {
        populatedPrompt = populatedPrompt.replace(pattern, value);
      });
    }

    return populatedPrompt;
  }

  /**
   * Extract theme from prayer text (helper for prayer points)
   */
  extractThemeFromPrayer(prayerText) {
    const themes = {
      'healing': ['heal', 'health', 'recovery', 'restore'],
      'guidance': ['guide', 'direction', 'wisdom', 'lead'],
      'peace': ['peace', 'calm', 'comfort', 'rest'],
      'provision': ['provide', 'supply', 'need', 'provision'],
      'protection': ['protect', 'safe', 'security', 'guard'],
      'justice': ['justice', 'fair', 'right', 'truth'],
      'hope': ['hope', 'future', 'tomorrow', 'better']
    };

    const lowerText = prayerText.toLowerCase();
    for (const [theme, keywords] of Object.entries(themes)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return theme;
      }
    }
    return 'general';
  }

  /**
   * Validate media type
   */
  isValidMediaType(mediaType) {
    return this.supportedMediaTypes.includes(mediaType);
  }

  /**
   * Validate parsing method
   */
  isValidParsingMethod(parsingMethod) {
    return this.supportedParsingMethods.includes(parsingMethod);
  }

  /**
   * Get default configuration for a content type
   */
  getDefaultConfig(contentType, mediaType = 'text') {
    return {
      media_type: mediaType,
      parsing_method: 'generic',
      ui_config: {
        icon: 'FileText',
        color: '#6B7280',
        displayName: contentType.split(/[-_]/).map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      }
    };
  }
}

export default new FlexibleContentGenerator(); 