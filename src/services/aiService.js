import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import PromptManager from './promptManager.js';

// Force load environment variables
dotenv.config({ override: true });

class AIService {
  constructor() {
    // Initialize prompt manager - will be properly initialized when database is ready
    this.promptManager = null;
    
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
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
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

  // Initialize prompt manager after database is ready
  initializePromptManager() {
    if (!this.promptManager) {
      this.promptManager = new PromptManager();
      console.log('✅ AI Service prompt manager initialized');
    }
  }

  // Ensure prompt manager is available
  async ensurePromptManager() {
    if (!this.promptManager) {
      this.initializePromptManager();
    }
    return this.promptManager;
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
      
      // Ensure prompt manager is available
      const promptManager = await this.ensurePromptManager();
      
      // Get content from either field naming convention (scraped vs generated articles)
      const articleContent = article.body_final || article.body_draft || article.full_text || 'No content available';
      
      // Get prompt from prompt manager
      const promptData = await promptManager.getPromptForGeneration('analysis', {
        // Underscore format (legacy)
        article_content: `Title: ${article.title}\n\nContent: ${articleContent}\n\nSource: ${article.source_name || 'Unknown'}\nURL: ${article.url || ''}`,
        // Dot notation format (modern)
        'article.title': article.title || 'No title available',
        'article.content': articleContent,
        'article.summary': articleContent.substring(0, 300) || 'No summary available',
        'article.source': article.source_name || 'Unknown',
        'article.url': article.url || ''
      });

      const response = await this.geminiModel.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: promptData.prompt }] 
        }],
        systemInstruction: promptData.systemMessage,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 10000
        }
      });

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;
      const resultText = response.response.text();

      // Capture detailed response metadata
      const responseMetadata = this.extractGeminiResponseMetadata(response.response);
      
      // Log detailed response data for comprehensive tracking
      await this.logDetailedAIResponse({
        generatedArticleId: null, // Analysis doesn't have a generated article ID
        templateId: promptData.templateId,
        versionId: promptData.versionId,
        category: 'analysis',
        aiService: 'gemini',
        modelUsed: 'gemini-1.5-flash',
        promptText: promptData.prompt,
        systemMessage: promptData.systemMessage,
        responseText: resultText,
        metadata: responseMetadata,
        generationTimeMs: generationTime,
        temperature: 0.3,
        maxOutputTokens: 10000
      });

      // Log the generation (no article ID for analysis)
      await promptManager.logGeneration(
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
      
      // Parse the analysis to extract structured data using a more robust approach
      let relevanceScore = 0.5;
      let summary = '';
      let keywords = '';
      
      // Split into sections based on the markdown headers
      const sections = analysisText.split(/\*\*\d+\./);
      
      for (const section of sections) {
        const content = section.trim();
        
        if (content.toLowerCase().includes('relevance') && content.toLowerCase().includes('score')) {
          // Extract relevance score
          const scoreMatch = content.match(/(\d+\.?\d*)/);
          if (scoreMatch) {
            relevanceScore = Math.min(1.0, Math.max(0.0, parseFloat(scoreMatch[1])));
          }
        } else if (content.toLowerCase().includes('summary')) {
          // Extract summary - everything after "Summary:**"
          const summaryMatch = content.match(/summary:?\*\*\s*([\s\S]*)/i);
          if (summaryMatch) {
            summary = summaryMatch[1].trim()
              .split('\n')[0] // Take first paragraph
              .replace(/\*\*/g, '') // Remove markdown formatting
              .trim();
          }
        } else if (content.toLowerCase().includes('theme') || content.toLowerCase().includes('keyword')) {
          // Extract themes/keywords - look for bullet points or list items
          const keywordMatch = content.match(/(theme|keyword)s?:?\*\*\s*([\s\S]*)/i);
          if (keywordMatch) {
            let keywordContent = keywordMatch[2];
            // Extract multiple bullet points and combine them
            const bulletMatches = keywordContent.match(/\*\s*\*\*([^*:]+)(?:\*\*)?:/g);
            if (bulletMatches && bulletMatches.length > 0) {
              // Extract the text between ** and : for each bullet
              keywords = bulletMatches
                .map(bullet => bullet.replace(/\*+\s*|\*+:|:.*$/g, '').trim())
                .filter(k => k.length > 2)
                .slice(0, 3) // Take first 3 themes
                .join(', ');
            } else {
              // Fallback: extract first line
              keywords = keywordContent.split('\n')[0].replace(/[*:]/g, '').trim();
            }
          }
        }
      }
      
      // Fallback: if sections approach didn't work, try line-by-line
      if (!summary || !keywords) {
        const lines = analysisText.split('\n').filter(line => line.trim());
        let inSummarySection = false;
        let inKeywordSection = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Check for section headers
          if (line.match(/\*\*2\..*summary.*\*\*/i)) {
            inSummarySection = true;
            inKeywordSection = false;
            // Check if summary is on same line
            const sameLine = line.replace(/\*\*2\.\s*summary:?\s*\*\*/i, '').trim();
            if (sameLine && !summary) {
              summary = sameLine;
            }
          } else if (line.match(/\*\*3\..*(?:theme|keyword).*\*\*/i)) {
            inSummarySection = false;
            inKeywordSection = true;
            // Check if keywords are on same line
            const sameLine = line.replace(/\*\*3\.\s*(?:key\s*)?(?:theme|keyword)s?:?\s*\*\*/i, '').trim();
            if (sameLine && !keywords) {
              keywords = sameLine;
            }
          } else if (inSummarySection && !summary && line && !line.match(/^\*\*/)) {
            // This line is part of the summary
            summary = line.replace(/[*]/g, '').trim();
            inSummarySection = false; // Only take first line
          } else if (inKeywordSection && !keywords && line && !line.match(/^\*\*/)) {
            // This line is part of the keywords - handle bullet points
            if (line.includes('**') && line.includes(':')) {
              // Extract content between ** and : markers
              const match = line.match(/\*\s*\*\*([^*:]+)(?:\*\*)?:/);
              if (match) {
                keywords = match[1].trim();
              } else {
                keywords = line.replace(/[*:]/g, '').trim();
              }
            } else {
              keywords = line.replace(/[*:]/g, '').trim();
            }
            inKeywordSection = false; // Only take first line
          }
        }
      }
      
      // Clean up extracted content
      if (summary && summary.length > 300) {
        summary = summary.substring(0, 300) + '...';
      }
      
      // Generate fallback keywords if none found
      if (!keywords || keywords.length < 3) {
        keywords = 'safeguarding, Christian leadership, accountability';
      }
      
      return {
        relevanceScore,
        summary: summary || 'Church safeguarding review initiated following abuse allegations',
        keywords: keywords || 'Christian, faith, news',
        fullAnalysis: analysisText
      };
    } catch (error) {
      console.error('❌ Error analyzing article:', error);
      
      // Log the error
      try {
        const promptManager = await this.ensurePromptManager();
        const promptData = await promptManager.getPromptForGeneration('analysis', {});
        await promptManager.logGeneration(
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
      
      // Ensure prompt manager is available
      const promptManager = await this.ensurePromptManager();
      
      // Get content from either field naming convention (scraped vs generated articles)
      const articleContent = article.body_final || article.body_draft || article.full_text || 'No content available';
      
      // Get prompt from prompt manager
      const promptData = await promptManager.getPromptForGeneration('blog_post', {
        // Underscore format (legacy)
        article_content: `Title: ${article.title}\n\nContent: ${articleContent}\n\nSource: ${article.source_name || 'Unknown'}\nURL: ${article.url || ''}`,
        // Dot notation format (modern)
        'article.title': article.title || 'No title available',
        'article.content': articleContent,
        'article.summary': articleContent.substring(0, 300) || 'No summary available',
        'article.source': article.source_name || 'Unknown',
        'article.url': article.url || ''
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
      const resultText = response.choices[0].message.content;

      // Log detailed response data for comprehensive tracking
      await this.logDetailedAIResponse({
        generatedArticleId,
        templateId: promptData.templateId,
        versionId: promptData.versionId,
        category: 'blog_post',
        aiService: 'openai',
        modelUsed: 'gpt-4',
        promptText: promptData.prompt,
        systemMessage: promptData.systemMessage,
        responseText: resultText,
        metadata: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: tokensUsed,
          stopReason: response.choices[0]?.finish_reason || 'STOP',
          isComplete: response.choices[0]?.finish_reason === 'stop',
          isTruncated: response.choices[0]?.finish_reason === 'length',
          safetyRatings: [],
          contentFilterApplied: false
        },
        generationTimeMs: generationTime,
        temperature: 0.7,
        maxOutputTokens: 2000
      });

      // Log the generation (basic logging)
      if (generatedArticleId) {
        await promptManager.logGeneration(
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

      return resultText;
    } catch (error) {
      console.error('❌ Error generating blog post:', error);
      
      // Log the error
      if (generatedArticleId) {
        try {
          const promptManager = await this.ensurePromptManager();
          const promptData = await promptManager.getPromptForGeneration('blog_post', {});
          await promptManager.logGeneration(
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
      
      // Ensure prompt manager is available
      const promptManager = await this.ensurePromptManager();
      
      // Get content from either field naming convention (scraped vs generated articles)
      const articleContent = article.body_final || article.body_draft || article.full_text || 'No content available';
      
      // Get prompt from prompt manager
      const promptData = await promptManager.getPromptForGeneration('social_media', {
        // Underscore format (legacy)
        article_content: `Title: ${article.title}\n\nContent: ${articleContent}\n\nSource: ${article.source_name || 'Unknown'}`,
        // Dot notation format (modern)
        'article.title': article.title || 'No title available',
        'article.content': articleContent,
        'article.summary': articleContent.substring(0, 300) || 'No summary available',
        'article.source': article.source_name || 'Unknown',
        'article.url': article.url || ''
      });

      const response = await this.geminiModel.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: promptData.prompt }] 
        }],
        systemInstruction: promptData.systemMessage,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 20000  // Increased 10-fold to prevent truncation of complex social media content
        }
      });

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;
      const resultText = response.response.text();

      // Capture detailed response metadata for debugging
      const responseMetadata = this.extractGeminiResponseMetadata(response.response);
      console.log(`🔍 Social Media Generation Metadata:`, {
        tokensUsed,
        stopReason: responseMetadata.stopReason,
        isComplete: responseMetadata.isComplete,
        isTruncated: responseMetadata.isTruncated,
        outputTokens: responseMetadata.outputTokens,
        maxTokens: 20000
      });

      // Log detailed response data
      await this.logDetailedAIResponse({
        generatedArticleId,
        templateId: promptData.templateId,
        versionId: promptData.versionId,
        category: 'social_media',
        aiService: 'gemini',
        modelUsed: 'gemini-1.5-flash',
        promptText: promptData.prompt,
        systemMessage: promptData.systemMessage,
        responseText: resultText,
        metadata: responseMetadata,
        generationTimeMs: generationTime,
        temperature: 0.8,
        maxOutputTokens: 20000
      });

      // Log the generation (only if we have a valid article ID)
      if (generatedArticleId && generatedArticleId !== 999) {
        try {
          await promptManager.logGeneration(
            generatedArticleId,
            promptData.templateId,
            promptData.versionId,
            'gemini',
            'gemini-1.5-flash',
            tokensUsed,
            generationTime,
            true
          );
        } catch (logError) {
          console.warn('⚠️ Failed to log generation (non-critical):', logError.message);
        }
      }

      return resultText;
    } catch (error) {
      console.error('❌ Error generating social media posts:', error);
      
      // Log the error (only if we have a valid article ID)
      if (generatedArticleId && generatedArticleId !== 999) {
        try {
          const promptManager = await this.ensurePromptManager();
          const promptData = await promptManager.getPromptForGeneration('social_media', {});
          await promptManager.logGeneration(
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
          console.warn('⚠️ Failed to log generation error (non-critical):', logError.message);
        }
      }
      
      throw error;
    }
  }

  async generateVideoScript(article, duration = 60, generatedArticleId = null) {
    try {
      const startTime = Date.now();
      
      // Ensure prompt manager is available
      const promptManager = await this.ensurePromptManager();
      
      // Get content from either field naming convention (scraped vs generated articles)
      const articleContent = article.body_final || article.body_draft || article.full_text || 'No content available';
      
      // Get prompt from prompt manager
      const promptData = await promptManager.getPromptForGeneration('video_script', {
        // Underscore format (legacy)
        article_content: `Title: ${article.title}\n\nContent: ${articleContent}\n\nSource: ${article.source_name || 'Unknown'}`,
        // Dot notation format (modern)
        'article.title': article.title || 'No title available',
        'article.content': articleContent,
        'article.summary': articleContent.substring(0, 300) || 'No summary available',
        'article.source': article.source_name || 'Unknown',
        'article.url': article.url || '',
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
      const resultText = response.choices[0].message.content;

      // Log detailed response data for comprehensive tracking
      await this.logDetailedAIResponse({
        generatedArticleId,
        templateId: promptData.templateId,
        versionId: promptData.versionId,
        category: 'video_script',
        aiService: 'openai',
        modelUsed: 'gpt-4',
        promptText: promptData.prompt,
        systemMessage: promptData.systemMessage,
        responseText: resultText,
        metadata: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: tokensUsed,
          stopReason: response.choices[0]?.finish_reason || 'STOP',
          isComplete: response.choices[0]?.finish_reason === 'stop',
          isTruncated: response.choices[0]?.finish_reason === 'length',
          safetyRatings: [],
          contentFilterApplied: false
        },
        generationTimeMs: generationTime,
        temperature: 0.7,
        maxOutputTokens: 1500
      });

      // Log the generation (basic logging)
      if (generatedArticleId) {
        await promptManager.logGeneration(
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

      return resultText;
    } catch (error) {
      console.error('❌ Error generating video script:', error);
      
      // Log the error
      if (generatedArticleId) {
        try {
          const promptManager = await this.ensurePromptManager();
          const promptData = await promptManager.getPromptForGeneration('video_script', {});
          await promptManager.logGeneration(
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

  async generatePrayerPoints(article, generatedArticleId = null) {
    try {
      const startTime = Date.now();
      
      // Ensure prompt manager is available
      const promptManager = await this.ensurePromptManager();
      
      // Use the existing 'prayer' template directly since it exists and works
      let promptData;
      try {
        // Get content from either field naming convention (scraped vs generated articles)
        const articleContent = article.body_final || article.body_draft || article.full_text || 'No content available';
        
        promptData = await promptManager.getPromptForGeneration('prayer', {
          // Underscore format (legacy)
          article_content: `Title: ${article.title}\\n\\nContent: ${articleContent}\\n\\nSource: ${article.source_name || 'Unknown'}`,
          // Dot notation format (modern)
          'article.title': article.title || 'No title available',
          'article.content': articleContent,
          'article.summary': articleContent.substring(0, 300) || 'No summary available',
          'article.source': article.source_name || 'Unknown',
          'article.url': article.url || ''
        });
      } catch (error) {
        console.log(`⚠️ Could not get prayer template: ${error.message}`);
        throw error;
      }

      const response = await this.geminiModel.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: `Based on this news article, create 5 prayer points for Christians to pray about the themes and people mentioned. Each prayer point should be 15-25 words. Return as a simple numbered list:\n\n${promptData.prompt}` }] 
        }],
        systemInstruction: promptData.systemMessage || "You are a Christian prayer writer helping believers respond to current events through prayer.",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 10000
        }
      });

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;
      const resultText = response.response.text();

      // Capture detailed response metadata for debugging
      const responseMetadata = this.extractGeminiResponseMetadata(response.response);
      console.log(`🔍 Prayer Points Generation Metadata:`, {
        tokensUsed,
        stopReason: responseMetadata.stopReason,
        isComplete: responseMetadata.isComplete,
        isTruncated: responseMetadata.isTruncated,
        outputTokens: responseMetadata.outputTokens,
        maxTokens: 10000,
        responseLength: resultText.length,
        responsePreview: resultText.substring(0, 200)
      });

      // Log detailed response data
      await this.logDetailedAIResponse({
        generatedArticleId,
        templateId: promptData.templateId,
        versionId: promptData.versionId,
        category: 'prayer_points',
        aiService: 'gemini',
        modelUsed: 'gemini-1.5-flash',
        promptText: `Based on this news article, create 5 prayer points for Christians to pray about the themes and people mentioned. Each prayer point should be 15-25 words. Return as a simple numbered list:\n\n${promptData.prompt}`,
        systemMessage: promptData.systemMessage || "You are a Christian prayer writer helping believers respond to current events through prayer.",
        responseText: resultText,
        metadata: responseMetadata,
        generationTimeMs: generationTime,
        temperature: 0.7,
        maxOutputTokens: 10000
      });

      // Log the generation (only if we have a valid article ID)
      if (generatedArticleId && generatedArticleId !== 999) {
        try {
          await promptManager.logGeneration(
            generatedArticleId,
            promptData.templateId,
            promptData.versionId,
            'gemini',
            'gemini-1.5-flash',
            tokensUsed,
            generationTime,
            true
          );
        } catch (logError) {
          console.warn('⚠️ Failed to log generation (non-critical):', logError.message);
        }
      }

      // Handle single prayer response and create multiple focused prayer points
      const cleanContent = resultText.trim();
      
      console.log(`🙏 Generated prayer content: ${cleanContent.substring(0, 100)}...`);
      
      // Create multiple prayer points from the single prayer
      const prayerPoints = this.createMultiplePrayerPoints(cleanContent, article);
      
      const processingTime = Date.now() - startTime;
      console.log(`⏱️ Prayer points generation completed in ${processingTime}ms`);
      
      return prayerPoints;
    } catch (error) {
      console.error('❌ Error generating prayer points:', error);
      
      // Log the error (only if we have a valid article ID)
      if (generatedArticleId && generatedArticleId !== 999) {
        try {
          const promptManager = await this.ensurePromptManager();
          const promptData = await promptManager.getPromptForGeneration('prayer', {});
          await promptManager.logGeneration(
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
          console.warn('⚠️ Failed to log generation error (non-critical):', logError.message);
        }
      }
      
      throw error;
    }
  }

  createMultiplePrayerPoints(singlePrayer, article) {
    // If the prayer is already in JSON format with multiple prayers, parse it
    try {
      const parsed = JSON.parse(singlePrayer);
      if (parsed.prayers && Array.isArray(parsed.prayers)) {
        return parsed.prayers.join('\\n\\n');
      }
    } catch (e) {
      // Not JSON, continue with single prayer processing
    }
    
    // Create multiple focused prayer points from the single prayer
    const themes = this.extractPrayerThemes(article);
    const basePrayer = singlePrayer.replace(/^(Heavenly Father,?|Lord,?|O Lord,?)/i, '').replace(/Amen\.?$/i, '').trim();
    
    const prayerPoints = themes.map((theme, index) => {
      const starters = ['Heavenly Father,', 'Lord,', 'God of mercy,', 'Almighty God,', 'Lord Jesus,'];
      const starter = starters[index % starters.length];
      
      if (index === 0) {
        // First prayer point uses the original prayer
        return `${starter} ${basePrayer}. Amen.`;
      } else {
        // Additional prayer points focus on specific themes
        return `${starter} we pray for ${theme.focus} in this situation. ${theme.prayer}. Amen.`;
      }
    });
    
    return prayerPoints.join('\\n\\n');
  }

  extractPrayerThemes(article) {
    const title = (article.title || '').toLowerCase();
    const content = (article.body_final || article.body_draft || '').toLowerCase();
    const allText = `${title} ${content}`;
    
    const themes = [
      { focus: 'healing and comfort', prayer: 'Bring your peace to all who are hurting' },
      { focus: 'wisdom and guidance', prayer: 'Guide leaders and decision-makers with your wisdom' },
      { focus: 'justice and truth', prayer: 'Let truth prevail and justice be done' },
      { focus: 'hope and restoration', prayer: 'Restore hope and bring healing to broken communities' },
      { focus: 'your love and grace', prayer: 'Help us respond with love and compassion as your people' }
    ];
    
    // Customize themes based on article content
    if (allText.includes('church') || allText.includes('christian')) {
      themes[1] = { focus: 'church leadership', prayer: 'Give wisdom to church leaders and strengthen the faith community' };
    }
    if (allText.includes('children') || allText.includes('young')) {
      themes[0] = { focus: 'protection of children', prayer: 'Protect the innocent and vulnerable, especially children' };
    }
    if (allText.includes('abuse') || allText.includes('violence')) {
      themes[2] = { focus: 'justice for victims', prayer: 'Bring justice for victims and healing for the wounded' };
    }
    
    return themes.slice(0, 5); // Return up to 5 themes
  }

  /**
   * Generate content with pre-built prompts for workflow chaining
   */
  async generateSocialMediaPostsWithPrompt(prompt, systemMessage, generatedArticleId = null) {
    return await this.generateWithPrompt(prompt, systemMessage, 'social_media', generatedArticleId);
  }

  async generateVideoScriptWithPrompt(prompt, systemMessage, generatedArticleId = null) {
    return await this.generateWithPrompt(prompt, systemMessage, 'video_script', generatedArticleId);
  }

  async generatePrayerPointsWithPrompt(prompt, systemMessage, generatedArticleId = null) {
    return await this.generateWithPrompt(prompt, systemMessage, 'prayer_points', generatedArticleId);
  }

  async generateGenericContentWithPrompt(prompt, systemMessage, category, generatedArticleId = null, accountId = null) {
    console.log(`➡️ ENTER: generateGenericContentWithPrompt for category: ${category}`);
    
    // Special handling for image generation - first generate the image prompt, then create the image
    if (category === 'image_generation') {
      console.log(`🖼️ Image generation workflow: First generating visual description using template...`);
      
      // First, use the template to generate a proper image prompt
      const visualDescription = await this.generateWithPrompt(prompt, systemMessage, category, generatedArticleId);
      console.log(`🎨 Generated visual description: ${visualDescription.substring(0, 200)}...`);
      
      // Then use that description to generate the actual image with Ideogram (now with account settings!)
      return await this.generateImageWithIdeogram(visualDescription, generatedArticleId, accountId);
    }
    
    return await this.generateWithPrompt(prompt, systemMessage, category, generatedArticleId);
  }

  /**
   * Core method for generating content with pre-built prompts
   */
  async generateWithPrompt(prompt, systemMessage, category, generatedArticleId = null, generationConfig = {}) {
    try {
      console.log(`➡️ ENTER: generateWithPrompt for category: ${category}`);
      const startTime = Date.now();
      
      // Use generation config or defaults
      const config = {
        temperature: generationConfig?.temperature || 0.7,
        maxOutputTokens: generationConfig?.max_tokens || 15000,
        ...generationConfig
      };

      const generationPromise = this.geminiModel.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }],
        systemInstruction: systemMessage || `You are an AI assistant generating ${category} content for Christian audiences.`,
        generationConfig: config
      });

      // Add a 30-second timeout to the generation promise
      const response = await this.withTimeout(generationPromise, 30000);

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;
      const resultText = response.response.text();

      // Capture detailed response metadata for debugging
      const responseMetadata = this.extractGeminiResponseMetadata(response.response);
      
      // Log detailed response data for comprehensive tracking
      await this.logDetailedAIResponse({
        generatedArticleId,
        templateId: null, // May not have template ID for generic prompts
        versionId: null,
        category: category,
        aiService: 'gemini',
        modelUsed: 'gemini-1.5-flash',
        promptText: prompt,
        systemMessage: systemMessage || `You are an AI assistant generating ${category} content for Christian audiences.`,
        responseText: resultText,
        metadata: responseMetadata,
        generationTimeMs: generationTime,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens
      });

      console.log(`✨ Generated ${category} content: ${resultText.substring(0, 100)}...`);
      
      const processingTime = Date.now() - startTime;
      console.log(`⏱️ ${category} generation completed in ${processingTime}ms`);
      
      return resultText;
    } catch (error) {
      console.error(`❌ Error in generateWithPrompt for ${category}:`, error.message);
      console.error(`Stack trace for ${category}:`, error.stack);
      throw error;
    } finally {
      console.log(`⬅️ EXIT: generateWithPrompt for category: ${category}`);
    }
  }

  /**
   * Generic content generation for new template types
   * This enables extensible content generation without hardcoded methods
   */
  async generateGenericContent(category, article, generationConfig, generatedArticleId = null, accountId = null) {
    try {
      const startTime = Date.now();
      
      // Ensure prompt manager is available
      const promptManager = await this.ensurePromptManager();
      
      // Get prompt template for this category
      let promptData;
      try {
        // Pass all article fields to support both underscore and dot notation placeholders
        // Fixed: Use correct database field names for both scraped and generated articles
        const articleContent = article.body_final || article.body_draft || article.full_text || 'No content available';
        promptData = await promptManager.getPromptForGeneration(category, {
          // Underscore format (legacy)
          article_content: `Title: ${article.title}\n\nContent: ${articleContent}\n\nSource: ${article.source_name || 'Unknown'}`,
          // Dot notation format (modern)
          'article.title': article.title || 'No title available',
          'article.content': articleContent,
          'article.summary': articleContent.substring(0, 300) || 'No summary available',
          'article.source': article.source_name || 'Unknown',
          'article.url': article.url || ''
        }, accountId);
      } catch (error) {
        console.log(`⚠️ Could not get ${category} template: ${error.message}`);
        throw error;
      }

      // Use generation config or defaults - filter only valid Gemini API fields
      const config = {
        temperature: generationConfig?.temperature || 0.7,
        maxOutputTokens: generationConfig?.max_tokens || generationConfig?.maxOutputTokens || 15000,
        // Only include valid Gemini API fields
        ...(generationConfig?.topP && { topP: generationConfig.topP }),
        ...(generationConfig?.topK && { topK: generationConfig.topK }),
        ...(generationConfig?.candidateCount && { candidateCount: generationConfig.candidateCount }),
        ...(generationConfig?.stopSequences && { stopSequences: generationConfig.stopSequences })
      };

      const response = await this.geminiModel.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: promptData.prompt }] 
        }],
        systemInstruction: promptData.systemMessage || `You are an AI assistant generating ${category} content for Christian audiences.`,
        generationConfig: config
      });

      const generationTime = Date.now() - startTime;
      const tokensUsed = response.response.usageMetadata?.totalTokenCount || 0;
      const resultText = response.response.text();

      // Capture detailed response metadata for debugging
      const responseMetadata = this.extractGeminiResponseMetadata(response.response);
      
      // Log detailed response data for comprehensive tracking
      await this.logDetailedAIResponse({
        generatedArticleId,
        templateId: promptData.templateId,
        versionId: promptData.versionId,
        category: category,
        aiService: 'gemini',
        modelUsed: 'gemini-1.5-flash',
        promptText: promptData.prompt,
        systemMessage: promptData.systemMessage || `You are an AI assistant generating ${category} content for Christian audiences.`,
        responseText: resultText,
        metadata: responseMetadata,
        generationTimeMs: generationTime,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens
      });

      // Log the generation (basic logging)
      if (generatedArticleId && generatedArticleId !== 999) {
        try {
          await promptManager.logGeneration(
            generatedArticleId,
            promptData.templateId,
            promptData.versionId,
            'gemini',
            'gemini-1.5-flash',
            tokensUsed,
            generationTime,
            true
          );
        } catch (logError) {
          console.warn('⚠️ Failed to log generation (non-critical):', logError.message);
        }
      }

      console.log(`✨ Generated ${category} content: ${resultText.substring(0, 100)}...`);
      
      const processingTime = Date.now() - startTime;
      console.log(`⏱️ ${category} generation completed in ${processingTime}ms`);
      
      return resultText;
    } catch (error) {
      console.error(`❌ Error generating ${category} content:`, error);
      
      // Log the error
      if (generatedArticleId && generatedArticleId !== 999) {
        try {
          const promptManager = await this.ensurePromptManager();
          const promptData = await promptManager.getPromptForGeneration(category, {});
          await promptManager.logGeneration(
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
          console.warn('⚠️ Failed to log generation error (non-critical):', logError.message);
        }
      }
      
      throw error;
    }
  }

  async generateImageSearchQueries(content, count = 3) {
    const prompt = `For an article about "${content.title}", suggest ${count} AI image generation prompts suitable for creating custom images with Ideogram.
    
    Each prompt should:
    - Be descriptive and specific for AI image generation
    - Focus on Christian themes without literal religious symbols
    - Emphasize natural lighting, hope, and warmth
    - Include diverse people in natural expressions
    - Avoid children, explicit religious iconography
    
    Return as a simple array: ["prompt 1", "prompt 2", "prompt 3"]`;

    try {
      const response = await this.generateStructuredResponse(prompt, 'array');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Error generating AI image prompts:', error.message);
      return [];
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

  /**
   * Extract detailed metadata from Gemini response
   */
  extractGeminiResponseMetadata(geminiResponse) {
    try {
      const usageMetadata = geminiResponse.usageMetadata || {};
      const candidates = geminiResponse.candidates || [];
      const firstCandidate = candidates[0] || {};
      
      // Get finish reason and safety ratings
      const finishReason = firstCandidate.finishReason || 'UNKNOWN';
      const safetyRatings = firstCandidate.safetyRatings || [];
      
      // Determine if response was truncated
      const outputTokens = usageMetadata.candidatesTokenCount || 0;
      const inputTokens = usageMetadata.promptTokenCount || 0;
      const totalTokens = usageMetadata.totalTokenCount || 0;
      
      const isTruncated = finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH';
      const isComplete = finishReason === 'STOP';
      
      return {
        stopReason: finishReason,
        isComplete,
        isTruncated,
        outputTokens,
        inputTokens,
        totalTokens,
        safetyRatings,
        contentFilterApplied: safetyRatings.some(rating => rating.blocked === true)
      };
    } catch (error) {
      console.warn('⚠️ Failed to extract Gemini metadata:', error.message);
      return {
        stopReason: 'ERROR',
        isComplete: false,
        isTruncated: false,
        outputTokens: 0,
        inputTokens: 0,
        totalTokens: 0,
        safetyRatings: [],
        contentFilterApplied: false
      };
    }
  }

  /**
   * Log detailed AI response data for debugging and analysis
   */
  async logDetailedAIResponse(logData) {
    try {
      // Use the existing database module (already imported at the top of this file)
      const database = (await import('./database.js')).default;
      
      // Ensure database is initialized
      if (!database.pool) {
        await database.initialize();
      }
      
      console.log(`🔄 Attempting to log detailed AI response for ${logData.category}...`);
      
      await database.query(`
        INSERT INTO ssnews_ai_response_log (
          generated_article_id, template_id, version_id, content_category,
          ai_service, model_used, prompt_text, system_message, response_text,
          tokens_used_input, tokens_used_output, tokens_used_total,
          generation_time_ms, temperature, max_output_tokens,
          stop_reason, is_complete, is_truncated, safety_ratings,
          content_filter_applied, success, warning_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        logData.generatedArticleId,
        logData.templateId,
        logData.versionId,
        logData.category,
        logData.aiService,
        logData.modelUsed,
        logData.promptText,
        logData.systemMessage,
        logData.responseText,
        logData.metadata.inputTokens,
        logData.metadata.outputTokens,
        logData.metadata.totalTokens,
        logData.generationTimeMs,
        logData.temperature,
        logData.maxOutputTokens,
        logData.metadata.stopReason,
        logData.metadata.isComplete,
        logData.metadata.isTruncated,
        JSON.stringify(logData.metadata.safetyRatings),
        logData.metadata.contentFilterApplied,
        true,
        logData.metadata.isTruncated ? 'Response was truncated due to token limits' : null
      ]);
      
      console.log(`✅ Successfully logged detailed AI response for ${logData.category} (article: ${logData.generatedArticleId})`);
    } catch (error) {
      console.error('❌ Failed to log detailed AI response:', error.message);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Log data:', {
        category: logData.category,
        generatedArticleId: logData.generatedArticleId,
        aiService: logData.aiService,
        modelUsed: logData.modelUsed,
        promptTextLength: logData.promptText?.length,
        responseTextLength: logData.responseText?.length
      });
    }
  }

  /**
   * Generate image using Ideogram API for template-based workflow
   * Now uses account settings instead of hardcoded defaults!
   */
  async generateImageWithIdeogram(prompt, generatedArticleId = null, accountId = null) {
    try {
      console.log(`🖼️ Generating image with Ideogram for article ${generatedArticleId}...`);
      console.log(`🎨 Raw image prompt response: ${prompt.substring(0, 200)}...`);

      // Parse the AI-generated prompt response to extract individual image prompts
      let extractedPrompt = this.extractImagePromptFromResponse(prompt);
      
      console.log(`🎯 Extracted image prompt: ${extractedPrompt.substring(0, 200)}...`);

      // Import services dynamically to avoid circular dependencies
      const { default: imageService } = await import('./imageService.js');
      const { default: database } = await import('./database.js');

      // Load account image generation settings
      let accountSettings = null;
      if (accountId || generatedArticleId) {
        try {
          // If no accountId provided, get it from the generated article
          let targetAccountId = accountId;
          if (!targetAccountId && generatedArticleId && generatedArticleId !== 999) {
            const contentRecord = await database.query(
              'SELECT account_id FROM ssnews_generated_articles WHERE gen_article_id = ?', 
              [generatedArticleId]
            );
            if (contentRecord.length > 0) {
              targetAccountId = contentRecord[0].account_id;
              console.log(`🔍 Found accountId from content: ${targetAccountId}`);
            }
          }

          if (targetAccountId) {
            const settingsResult = await database.query(
              'SELECT settings_data FROM ssnews_account_settings WHERE account_id = ? AND setting_type = ?',
              [targetAccountId, 'image_generation']
            );

            if (settingsResult.length > 0) {
              accountSettings = JSON.parse(settingsResult[0].settings_data);
              console.log(`🎨 Loaded account image settings for ${targetAccountId}`);
            }
          }
        } catch (settingsError) {
          console.warn('⚠️ Failed to load account image settings:', settingsError.message);
        }
      }

      // Apply account prompt prefix/suffix if available
      if (accountSettings?.promptPrefix || accountSettings?.promptSuffix) {
        const prefix = accountSettings.promptPrefix || '';
        const suffix = accountSettings.promptSuffix || '';
        extractedPrompt = `${prefix} ${extractedPrompt} ${suffix}`.trim();
        console.log(`🎯 Applied account prefix/suffix to prompt`);
      }

      // Prepare options using account settings with intelligent fallbacks
      const imageOptions = {
        prompt: extractedPrompt.trim(),
        aspectRatio: accountSettings?.defaults?.aspectRatio || '16:9',
        styleType: accountSettings?.defaults?.styleType || 'GENERAL',
        renderingSpeed: accountSettings?.defaults?.renderingSpeed || 'DEFAULT',
        magicPrompt: accountSettings?.defaults?.magicPrompt || 'AUTO',
        numImages: accountSettings?.defaults?.numImages || 1,
        modelVersion: accountSettings?.defaults?.modelVersion || 'v2'
      };

      // Add optional parameters from account settings
      if (accountSettings?.defaults?.resolution) {
        imageOptions.resolution = accountSettings.defaults.resolution;
      }
      if (accountSettings?.defaults?.negativePrompt) {
        imageOptions.negativePrompt = accountSettings.defaults.negativePrompt;
      }

      // Handle account color templates for automatic generation
      if (accountSettings?.brandColors?.length > 0) {
        // Use the first available brand color template for automatic generation
        const firstColorTemplate = accountSettings.brandColors[0];
        imageOptions.colorPalette = firstColorTemplate;
        console.log(`🎨 Applied account brand colors: ${firstColorTemplate.name}`);
      }

      console.log(`🎯 Ideogram options: ${JSON.stringify(imageOptions)}`);

      // Generate image using Ideogram
      const generationResult = await imageService.generateIdeogramImage(imageOptions);

      if (!generationResult || !generationResult.images || generationResult.images.length === 0) {
        console.error('❌ No images returned from Ideogram');
        
        // Log failed image generation
        await this.logDetailedAIResponse({
          generatedArticleId,
          templateId: null,
          versionId: null,
          category: 'image_generation',
          aiService: 'ideogram',
          modelUsed: 'ideogram-v2',
          promptText: extractedPrompt,
          systemMessage: 'Ideogram AI image generation service',
          responseText: 'No images returned from Ideogram API',
          metadata: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            stopReason: 'ERROR',
            isComplete: false,
            isTruncated: false,
            safetyRatings: [],
            contentFilterApplied: false
          },
          generationTimeMs: Date.now() - Date.now(), // Will be very small
          temperature: 0,
          maxOutputTokens: 0
        });
        
        return '';  // Return empty string to indicate no image generated
      }

      const primaryImage = generationResult.images[0];
      console.log(`✅ Generated image: ${primaryImage.url}`);
      
      // Log successful image generation
      await this.logDetailedAIResponse({
        generatedArticleId,
        templateId: null,
        versionId: null,
        category: 'image_generation',
        aiService: 'ideogram',
        modelUsed: 'ideogram-v2',
        promptText: extractedPrompt,
        systemMessage: 'Ideogram AI image generation service',
        responseText: `Generated image: ${primaryImage.url}`,
        metadata: {
          inputTokens: 0, // Ideogram doesn't use tokens
          outputTokens: 0,
          totalTokens: 0,
          stopReason: 'STOP',
          isComplete: true,
          isTruncated: false,
          safetyRatings: [],
          contentFilterApplied: false
        },
        generationTimeMs: generationResult.generation?.metadata?.generationTimeSeconds * 1000 || 0,
        temperature: 0,
        maxOutputTokens: 0
      });

      // Process and store the image if we have a valid article ID
      if (generatedArticleId && generatedArticleId !== 999) {
        try {
          const processedImage = await imageService.processIdeogramImageForContent(
            primaryImage, 
            generatedArticleId,
            null // Will use default account context
          );
          
          console.log(`📁 Image stored with ID: ${processedImage.id}`);
          console.log(`🌐 CDN URL: ${processedImage.sirvUrl}`);

          // Return a descriptive string about the generated image
          return `Generated image: "${primaryImage.prompt}" (Style: ${primaryImage.styleType}, Resolution: ${primaryImage.resolution}, Sirv URL: ${processedImage.sirvUrl})`;
        } catch (storageError) {
          console.warn('⚠️ Failed to store image in database:', storageError.message);
          
          // Still return success info even if storage failed
          return `Generated image: "${primaryImage.prompt}" (Style: ${primaryImage.styleType}, Resolution: ${primaryImage.resolution}, URL: ${primaryImage.url})`;
        }
      }

      // Return image info without storage
      return `Generated image: "${primaryImage.prompt}" (Style: ${primaryImage.styleType}, Resolution: ${primaryImage.resolution})`;

    } catch (error) {
      console.error('❌ Error generating image with Ideogram:', error);
      
      // Return empty string to indicate failure
      return '';
    }
  }

  /**
   * Extract a specific image prompt from the AI-generated response
   * Now uses the ACTUAL AI response instead of falling back to generic Christian content
   */
  extractImagePromptFromResponse(aiResponse) {
    try {
      const response = aiResponse.trim();
      console.log(`🖼️ DEBUG: Full AI response for image generation:`, response);
      
      // If the response is substantial and looks like an image description, use it directly
      if (response.length > 20 && !response.toLowerCase().includes('generate an image')) {
        console.log(`🎯 Using full AI response as image prompt: ${response.substring(0, 100)}...`);
        return response;
      }
      
      // Look for numbered lists (1. Hero image, 2. Social media, 3. Background)
      const heroImageMatch = response.match(/1\.\s*(?:Hero image[^:]*:?\s*)(.+?)(?:\n(?:2\.|$))/is);
      if (heroImageMatch && heroImageMatch[1]) {
        const heroPrompt = heroImageMatch[1].trim();
        console.log(`🎯 Extracted hero image prompt: ${heroPrompt}`);
        return heroPrompt;
      }

      // Look for any line that starts with "1." and extract everything until next number or end
      const firstPromptMatch = response.match(/^1\.\s*(.+?)(?=\n\s*2\.|$)/sm);
      if (firstPromptMatch && firstPromptMatch[1]) {
        const firstPrompt = firstPromptMatch[1].trim().replace(/\s+/g, ' ');
        console.log(`🎯 Extracted first numbered prompt: ${firstPrompt}`);
        return firstPrompt;
      }

      // Try to extract the first meaningful sentence that could be an image description
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20);
      for (const sentence of sentences) {
        const cleaned = sentence.trim();
        if (cleaned.length > 20 && cleaned.length < 500 && 
            !cleaned.toLowerCase().includes('generate') && 
            !cleaned.toLowerCase().includes('create') &&
            !cleaned.toLowerCase().includes('based on')) {
          console.log(`🎯 Extracted meaningful sentence: ${cleaned}`);
          return cleaned;
        }
      }

      // If we have ANY substantial response, use it (even if not perfectly formatted)
      if (response.length > 15) {
        console.log(`🎯 Using full response as fallback: ${response.substring(0, 100)}...`);
        return response;
      }

      // Only use fallback if we truly have no response
      console.error(`❌ Empty or very short response for image generation: "${response}"`);
      return 'A professional image with good lighting and composition relevant to the article content';

    } catch (error) {
      console.error('❌ Error extracting image prompt:', error);
      return 'A professional image with good lighting and composition relevant to the article content';
    }
  }

  /**
   * Utility to add timeout to a promise
   */
  async withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Promise timed out after ${ms} ms`));
      }, ms);

      promise.then(
        (res) => {
          clearTimeout(timeoutId);
          resolve(res);
        },
        (err) => {
          clearTimeout(timeoutId);
          reject(err);
        }
      );
    });
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService; 