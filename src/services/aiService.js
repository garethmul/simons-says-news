import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

class AIService {
  constructor() {
    // Force load environment variables
    if (!process.env.OPENAI_API_KEY || !process.env.GEMINI_API_KEY) {
      console.log('🔄 Reloading environment variables...');
      dotenv.config({ override: true });
    }

    // Check for required API keys with better validation
    this.hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10 && !process.env.OPENAI_API_KEY.includes('your-key-here');
    this.hasGemini = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10 && !process.env.GEMINI_API_KEY.includes('your-key-here');
    
    // Never use demo mode - always require real API keys
    this.demoMode = false;

    console.log(`🔑 API Key Status: OpenAI=${this.hasOpenAI ? '✅' : '❌'}, Gemini=${this.hasGemini ? '✅' : '❌'}`);
    
    if (!this.hasOpenAI) {
      console.error('❌ OPENAI_API_KEY is missing or invalid. Please check your .env file.');
      console.log('Current OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
    }
    
    if (!this.hasGemini) {
      console.error('❌ GEMINI_API_KEY is missing or invalid. Please check your .env file.');
      console.log('Current GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0);
    }

    // Initialize OpenAI - REQUIRED
    if (this.hasOpenAI) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI service initialized');
      } catch (error) {
        console.error('❌ OpenAI initialization failed:', error.message);
        throw new Error('OpenAI initialization failed - cannot proceed without API access');
      }
    } else {
      throw new Error('OpenAI API key is required - please set OPENAI_API_KEY in your .env file');
    }

    // Initialize Gemini - REQUIRED
    if (this.hasGemini) {
      try {
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.geminiModel = this.gemini.getGenerativeModel({ 
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
          generationConfig: {
            maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS) || 32000,
            temperature: 0.7,
          }
        });
        console.log('✅ Gemini service initialized');
      } catch (error) {
        console.error('❌ Gemini initialization failed:', error.message);
        throw new Error('Gemini initialization failed - cannot proceed without API access');
      }
    } else {
      throw new Error('Gemini API key is required - please set GEMINI_API_KEY in your .env file');
    }

    console.log('🤖 AI Service ready with live API access - NO DEMO MODE');

    // Eden brand guidelines
    this.edenToneOfVoice = `
      Tone: Warm, encouraging, hopeful, and rooted in Christian faith
      Style: Empathetic, understanding, and supportive
      Avoid: Overly academic, judgmental, or exclusive language
      Focus: Practical application of faith and scripture
      Target: UK-based Christians across various denominations
    `;

    this.contentGuidelines = `
      HIGH-ENGAGEMENT THEMES TO COMMENT ON:
      - Persecution & global Christianity
      - Celebrity faith journeys
      - Church trends (revival, deconstruction, growth patterns)
      - Faith and culture (Christianity in media/entertainment)
      - Christian events calendar (Lent, Easter, Advent, Christmas)
      - Bible literacy and discipleship
      - Christian mental health news
      - Faith-based parenting

      TOPICS TO AVOID:
      - Highly political or partisan content
      - Theological controversies & Church splits
      - Scandal-based stories
      - Unverified prophetic claims
      - Interfaith conflict narratives
      - Deaths and tragedies without clear pastoral context
    `;
  }

  // Helper method to check if AI services are available
  isAvailable() {
    return this.hasOpenAI || this.hasGemini || this.demoMode;
  }

  // Helper method to get available services
  getAvailableServices() {
    return {
      openai: this.hasOpenAI,
      gemini: this.hasGemini,
      demo: this.demoMode,
      total: (this.hasOpenAI ? 1 : 0) + (this.hasGemini ? 1 : 0) + (this.demoMode ? 1 : 0)
    };
  }

  async summarizeArticle(articleText, title) {
    if (!this.hasGemini) {
      throw new Error('Gemini API not available for article summarization');
    }

    try {
      const prompt = `
        Summarize this Christian news article in 2-3 sentences, focusing on the key message and its relevance to the Christian community:
        
        Title: ${title}
        Article: ${articleText}
        
        Provide a clear, concise summary that captures the essence and significance of the story.
      `;

      const response = await this.geminiModel.generateContent(prompt);
      return response.response.text().trim();
    } catch (error) {
      console.error('❌ AI summarization failed:', error.message);
      throw error;
    }
  }

  async extractKeywords(articleText, title) {
    if (!this.hasGemini) {
      throw new Error('Gemini API not available for keyword extraction');
    }

    try {
      const prompt = `
        Extract 5-8 relevant keywords from this Christian news article that would be useful for content categorization and SEO:
        
        Title: ${title}
        Article: ${articleText}
        
        Return only the keywords separated by commas, focusing on themes, topics, and concepts relevant to Christian audiences.
      `;

      const response = await this.geminiModel.generateContent(prompt);
      return response.response.text().trim();
    } catch (error) {
      console.error('❌ AI keyword extraction failed:', error.message);
      throw error;
    }
  }

  async analyzeRelevance(articleSummary, keywords) {
    if (!this.hasGemini) {
      throw new Error('Gemini API not available for relevance analysis');
    }

    try {
      const prompt = `
        Rate the relevance of this Christian news story for Eden.co.uk's content strategy on a scale of 0.0 to 1.0.
        
        Consider these factors:
        ${this.contentGuidelines}
        
        Article Summary: ${articleSummary}
        Keywords: ${keywords}
        
        Eden sells Christian books, Bibles, devotionals, and study guides to UK Christians.
        
        Return only a decimal number between 0.0 and 1.0, where:
        - 0.8-1.0: Highly relevant, strong content opportunity
        - 0.6-0.7: Moderately relevant, good content potential
        - 0.4-0.5: Somewhat relevant, consider if news is slow
        - 0.0-0.3: Low relevance or should be avoided
      `;

      const response = await this.geminiModel.generateContent(prompt);
      const score = parseFloat(response.response.text().trim());
      return isNaN(score) ? 0.0 : Math.max(0.0, Math.min(1.0, score));
    } catch (error) {
      console.error('❌ AI relevance analysis failed:', error.message);
      return 0.0;
    }
  }

  async generateEdenAngle(newsSummary, keywords) {
    if (!this.hasGemini) {
      throw new Error('Gemini API not available for Eden angle generation');
    }

    try {
      const prompt = `
        Based on this Christian news story, suggest how Eden.co.uk could create unique content that connects to their products and brand values.
        
        News Summary: ${newsSummary}
        Keywords: ${keywords}
        
        Eden's Products: Christian books, Bibles, devotionals, study guides
        ${this.edenToneOfVoice}
        
        Suggest:
        1. A unique Eden perspective or angle
        2. Relevant product categories to link to
        3. Key themes to explore
        
        Format as JSON:
        {
          "angle": "Brief description of Eden's unique angle",
          "productCategories": ["category1", "category2"],
          "themes": ["theme1", "theme2", "theme3"]
        }
      `;

      const response = await this.geminiModel.generateContent(prompt);
      const text = response.response.text().trim();
      
      try {
        return JSON.parse(text);
      } catch {
        // Fallback if JSON parsing fails
        return {
          angle: "Connect this news to Christian living and spiritual growth",
          productCategories: ["devotionals", "christian-books"],
          themes: ["faith", "spiritual-growth", "christian-living"]
        };
      }
    } catch (error) {
      console.error('❌ AI Eden angle generation failed:', error.message);
      throw error;
    }
  }

  async generateBlogPost(sourceContent, edenAngle, contentType = 'blog', sourceInfo = null) {
    if (!this.hasOpenAI) {
      throw new Error('OpenAI API not available for blog post generation');
    }

    try {
      const wordCount = contentType === 'blog' ? '600-800' : '500';
      const format = contentType === 'blog' ? 'blog post' : 'PR article';

      const sourceReference = sourceInfo ? `
        Original Article: "${sourceInfo.originalTitle}"
        Source: ${sourceInfo.sourceName}
        Published: ${sourceInfo.publicationDate}
        URL: ${sourceInfo.originalUrl}
      ` : '';

      const prompt = `
        Write a ${wordCount} word ${format} for Eden.co.uk based on this Christian news story.
        
        ${sourceReference}
        
        Source Content: ${sourceContent}
        Eden Angle: ${edenAngle.angle}
        Relevant Products: ${edenAngle.productCategories.join(', ')}
        Key Themes: ${edenAngle.themes.join(', ')}
        
        ${this.edenToneOfVoice}
        
        Requirements:
        - ${this.edenToneOfVoice}
        - Reference the original news story specifically and thoughtfully
        - Include 1-2 internal links to Eden products (use placeholder URLs like '/bibles/study-bibles' or '/books/devotionals')
        - Include a subtle call-to-action related to exploring these resources
        - Add Eden's unique Christian perspective and practical application
        - Focus on encouragement and spiritual growth
        - Ensure theological soundness
        - Make it clear this is commentary/reflection on the news, not just generic content
        
        Structure:
        1. Engaging headline that references the news topic
        2. Opening that directly connects to the original story
        3. Eden's perspective and biblical insights
        4. Practical application for readers
        5. Gentle product connection
        6. Encouraging conclusion with call-to-action
        
        Return as JSON:
        {
          "title": "Article title that references the news topic",
          "body": "Full article content with HTML formatting",
          "suggestedLinks": [
            {"text": "link text", "url": "/product-category"},
            {"text": "link text", "url": "/product-category"}
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      });

      const text = response.choices[0].message.content.trim();
      
      try {
        return JSON.parse(text);
      } catch {
        // Fallback if JSON parsing fails
        return {
          title: "Faith in Today's World",
          body: text,
          suggestedLinks: [
            {"text": "Christian books", "url": "/books/christian-books"},
            {"text": "devotionals", "url": "/books/devotionals"}
          ]
        };
      }
    } catch (error) {
      console.error('❌ AI blog post generation failed:', error.message);
      throw error;
    }
  }

  async generateSocialPost(blogContent, platform = 'instagram') {
    if (!this.hasGemini) {
      throw new Error('Gemini API not available for social post generation');
    }

    try {
      const wordLimit = platform === 'linkedin' ? '400-600' : '150-250';
      const tone = platform === 'linkedin' ? 'editorial and insightful' : 'engaging with emotional hook';

      const prompt = `
        Create a ${platform} post of ${wordLimit} words based on this blog post content.
        
        Blog Content: ${blogContent.body}
        Blog Title: ${blogContent.title}
        
        Requirements:
        - ${tone} tone suitable for Christian audience
        - ${this.edenToneOfVoice}
        - Include emotional hook (unless LinkedIn)
        - Briefly mention core theme and related Eden resources
        - Encourage engagement
        - Use appropriate hashtags for ${platform}
        
        Return as JSON:
        {
          "text": "Social media post content",
          "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
        }
      `;

      const response = await this.geminiModel.generateContent(prompt);
      const text = response.response.text().trim();
      
      try {
        return JSON.parse(text);
      } catch {
        return {
          text: text,
          hashtags: ["#ChristianFaith", "#Inspiration", "#Eden"]
        };
      }
    } catch (error) {
      console.error('❌ AI social post generation failed:', error.message);
      throw error;
    }
  }

  async generateVideoScript(blogContent, duration = 60) {
    if (!this.hasOpenAI) {
      throw new Error('OpenAI API not available for video script generation');
    }

    try {
      const scriptType = duration <= 60 ? 'short-form (Reels/Shorts)' : 'longer-form (Facebook/YouTube)';

      const prompt = `
        Create a ${duration}-second ${scriptType} video script based on this blog post.
        
        Blog Content: ${blogContent.body}
        Blog Title: ${blogContent.title}
        
        Requirements:
        - ${this.edenToneOfVoice}
        - Focus on one key message
        - Include visual suggestions (hands opening Bible, person journaling, sunrise, etc.)
        - Suggest simple, warm visuals aligned with Eden's brand
        - Include subtle call-to-action
        - Ensure engaging narrative flow
        - Avoid literal religious symbolism or Jesus' face
        
        Return as JSON:
        {
          "title": "Video title",
          "script": "Full script with [VISUAL: description] cues",
          "visualSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
          "callToAction": "Specific call-to-action"
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      });

      const text = response.choices[0].message.content.trim();
      
      try {
        return JSON.parse(text);
      } catch {
        return {
          title: "Faith in Action",
          script: text,
          visualSuggestions: ["Open Bible", "Hands in prayer", "Sunrise over hills"],
          callToAction: "Explore Christian resources at Eden"
        };
      }
    } catch (error) {
      console.error('❌ AI video script generation failed:', error.message);
      throw error;
    }
  }

  async generateImageSearchQueries(articleContent, count = 3) {
    if (!this.hasGemini) {
      // Fallback to simple keyword-based queries if no AI available
      return ["christian faith", "bible study", "prayer hands"];
    }

    try {
      const prompt = `
        For an article about "${articleContent.title}", suggest ${count} Pexels search queries to find royalty-free images.
        
        Article content: ${articleContent.body.substring(0, 500)}...
        
        Image Guidelines:
        - Warm, welcoming, hopeful, natural light, soft colors
        - Modern but reverent, editorial lifestyle
        - AVOID: Jesus' face, mystical symbols, overly Catholic iconography
        - PREFER: Hope, community, nature, light, open Bible, hands in prayer, diverse people in study/reflection
        - Show diverse people (ethnicity, age, gender) in natural expressions
        
        Return only the search queries as a JSON array:
        ["query1", "query2", "query3"]
      `;

      const response = await this.geminiModel.generateContent(prompt);
      const text = response.response.text().trim();
      
      try {
        return JSON.parse(text);
      } catch {
        // Fallback queries
        return ["open bible natural light", "diverse people praying", "sunrise hope nature"];
      }
    } catch (error) {
      console.error('❌ AI image query generation failed:', error.message);
      return ["christian faith", "bible study", "prayer hands"];
    }
  }

  async generateAltText(imageDescription) {
    if (!this.hasGemini) {
      return "Christian faith and inspiration";
    }

    try {
      const prompt = `
        Generate appropriate alt text for this image in a Christian content context:
        
        Image description: ${imageDescription}
        
        Requirements:
        - Descriptive but concise (under 125 characters)
        - Accessible and meaningful
        - Appropriate for Christian audience
        
        Return only the alt text, no quotes or extra formatting.
      `;

      const response = await this.geminiModel.generateContent(prompt);
      return response.response.text().trim().replace(/['"]/g, '');
    } catch (error) {
      console.error('❌ AI alt text generation failed:', error.message);
      return "Christian faith and inspiration";
    }
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService; 