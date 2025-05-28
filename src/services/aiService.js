import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import PromptManager from './promptManager.js';

// Force load environment variables
dotenv.config({ override: true });

class AIService {
  constructor() {
    this.promptManager = new PromptManager();
    
    // Check for API keys
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

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

  async analyzeArticle(article) {
    try {
      const startTime = Date.now();
      
      // Get prompt from prompt manager
      const promptData = await this.promptManager.getPromptForGeneration('analysis', {
        article_content: `Title: ${article.title}\n\nContent: ${article.full_text || 'No content available'}\n\nSource: ${article.source_name || 'Unknown'}\nURL: ${article.url || ''}`
      });

      const response = await this.gemini.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: promptData.prompt }] 
        }],
        systemInstruction: promptData.systemMessage,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800
        }
      });

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;

      // Log the generation (no article ID for analysis)
      await this.promptManager.logGeneration(
        null,
        promptData.templateId,
        promptData.versionId,
        'gemini',
        'gemini-1.5-flash',
        tokensUsed,
        generationTime,
        true
      );

      const analysisText = response.response.text();
      
      // Parse the analysis to extract structured data
      const lines = analysisText.split('\n').filter(line => line.trim());
      let relevanceScore = 0.5;
      let summary = '';
      let keywords = '';
      
      for (const line of lines) {
        if (line.toLowerCase().includes('relevance score') || line.toLowerCase().includes('score:')) {
          const scoreMatch = line.match(/(\d+\.?\d*)/);
          if (scoreMatch) {
            relevanceScore = Math.min(1.0, Math.max(0.0, parseFloat(scoreMatch[1])));
          }
        } else if (line.toLowerCase().includes('summary:')) {
          summary = line.replace(/summary:/i, '').trim();
        } else if (line.toLowerCase().includes('keywords:') || line.toLowerCase().includes('themes:')) {
          keywords = line.replace(/(keywords|themes):/i, '').trim();
        }
      }

      return {
        relevanceScore,
        summary: summary || analysisText.substring(0, 200) + '...',
        keywords: keywords || 'Christian, faith, news',
        fullAnalysis: analysisText
      };
    } catch (error) {
      console.error('❌ Error analyzing article:', error);
      
      // Log the error
      try {
        const promptData = await this.promptManager.getPromptForGeneration('analysis', {});
        await this.promptManager.logGeneration(
          null,
          promptData.templateId,
          promptData.versionId,
          'gemini',
          'gemini-1.5-flash',
          0,
          0,
          false,
          error.message
        );
      } catch (logError) {
        console.error('❌ Error logging analysis failure:', logError);
      }
      
      // Return default analysis on error
      return {
        relevanceScore: 0.5,
        summary: 'Analysis failed - manual review required',
        keywords: 'news, review-needed',
        fullAnalysis: `Error during analysis: ${error.message}`
      };
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

  async generateBlogPost(article, generatedArticleId = null) {
    try {
      const startTime = Date.now();
      
      // Get prompt from prompt manager
      const promptData = await this.promptManager.getPromptForGeneration('blog_post', {
        article_content: `Title: ${article.title}\n\nContent: ${article.full_text || article.summary_ai || 'No content available'}\n\nSource: ${article.source_name || 'Unknown'}\nURL: ${article.url || ''}`
      });

      const messages = [
        { role: 'system', content: promptData.systemMessage },
        { role: 'user', content: promptData.prompt }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      });

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;

      // Log the generation
      if (generatedArticleId) {
        await this.promptManager.logGeneration(
          generatedArticleId,
          promptData.templateId,
          promptData.versionId,
          'openai',
          'gpt-4',
          tokensUsed,
          generationTime,
          true
        );
      }

      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ Error generating blog post:', error);
      
      // Log the error
      if (generatedArticleId) {
        try {
          const promptData = await this.promptManager.getPromptForGeneration('blog_post', {});
          await this.promptManager.logGeneration(
            generatedArticleId,
            promptData.templateId,
            promptData.versionId,
            'openai',
            'gpt-4',
            0,
            0,
            false,
            error.message
          );
        } catch (logError) {
          console.error('❌ Error logging generation failure:', logError);
        }
      }
      
      throw error;
    }
  }

  async generateSocialMediaPosts(article, generatedArticleId = null) {
    try {
      const startTime = Date.now();
      
      // Get prompt from prompt manager
      const promptData = await this.promptManager.getPromptForGeneration('social_media', {
        article_content: `Title: ${article.title}\n\nContent: ${article.full_text || article.summary_ai || 'No content available'}\n\nSource: ${article.source_name || 'Unknown'}`
      });

      const response = await this.gemini.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: promptData.prompt }] 
        }],
        systemInstruction: promptData.systemMessage,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000
        }
      });

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;

      // Log the generation
      if (generatedArticleId) {
        await this.promptManager.logGeneration(
          generatedArticleId,
          promptData.templateId,
          promptData.versionId,
          'gemini',
          'gemini-1.5-flash',
          tokensUsed,
          generationTime,
          true
        );
      }

      return response.response.text();
    } catch (error) {
      console.error('❌ Error generating social media posts:', error);
      
      // Log the error
      if (generatedArticleId) {
        try {
          const promptData = await this.promptManager.getPromptForGeneration('social_media', {});
          await this.promptManager.logGeneration(
            generatedArticleId,
            promptData.templateId,
            promptData.versionId,
            'gemini',
            'gemini-1.5-flash',
            0,
            0,
            false,
            error.message
          );
        } catch (logError) {
          console.error('❌ Error logging generation failure:', logError);
        }
      }
      
      throw error;
    }
  }

  async generateVideoScript(article, duration = 60, generatedArticleId = null) {
    try {
      const startTime = Date.now();
      
      // Get prompt from prompt manager
      const promptData = await this.promptManager.getPromptForGeneration('video_script', {
        article_content: `Title: ${article.title}\n\nContent: ${article.full_text || article.summary_ai || 'No content available'}\n\nSource: ${article.source_name || 'Unknown'}`,
        duration: duration
      });

      const messages = [
        { role: 'system', content: promptData.systemMessage },
        { role: 'user', content: promptData.prompt }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7
      });

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;

      // Log the generation
      if (generatedArticleId) {
        await this.promptManager.logGeneration(
          generatedArticleId,
          promptData.templateId,
          promptData.versionId,
          'openai',
          'gpt-4',
          tokensUsed,
          generationTime,
          true
        );
      }

      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ Error generating video script:', error);
      
      // Log the error
      if (generatedArticleId) {
        try {
          const promptData = await this.promptManager.getPromptForGeneration('video_script', {});
          await this.promptManager.logGeneration(
            generatedArticleId,
            promptData.templateId,
            promptData.versionId,
            'openai',
            'gpt-4',
            0,
            0,
            false,
            error.message
          );
        } catch (logError) {
          console.error('❌ Error logging generation failure:', logError);
        }
      }
      
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