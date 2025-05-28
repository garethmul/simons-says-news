import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

class AIService {
  constructor() {
    // Check for required API keys
    this.hasOpenAI = !!process.env.OPENAI_API_KEY;
    this.hasGemini = !!process.env.GEMINI_API_KEY;
    this.demoMode = process.env.NODE_ENV === 'development' && (!this.hasOpenAI || !this.hasGemini);

    // Initialize OpenAI only if API key is available
    if (this.hasOpenAI) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI service initialized');
      } catch (error) {
        console.warn('⚠️ OpenAI initialization failed:', error.message);
        this.hasOpenAI = false;
      }
    } else {
      console.warn('⚠️ OpenAI API key not found - OpenAI features will be disabled');
    }

    // Initialize Gemini only if API key is available
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
        console.warn('⚠️ Gemini initialization failed:', error.message);
        this.hasGemini = false;
      }
    } else {
      console.warn('⚠️ Gemini API key not found - Gemini features will be disabled');
    }

    if (this.demoMode) {
      console.log('🎭 AI Service running in demo mode - will generate mock content');
    }

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
    if (this.demoMode) {
      // Generate mock summary for demo
      const mockSummaries = [
        "This article explores the growing trend of young Christians engaging with their faith through digital platforms and community outreach programs.",
        "A heartwarming story about how local churches are coming together to support families in need during challenging times.",
        "An inspiring account of how Bible study groups are helping people find hope and purpose in their daily lives.",
        "This piece examines the positive impact of Christian education on character development and community values.",
        "A thoughtful reflection on how prayer and meditation are helping people navigate modern life's complexities."
      ];
      return mockSummaries[Math.floor(Math.random() * mockSummaries.length)];
    }

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
    if (this.demoMode) {
      // Generate mock keywords for demo
      const mockKeywords = [
        "faith, community, hope, Christian living, spiritual growth",
        "church, ministry, outreach, discipleship, Bible study",
        "prayer, worship, fellowship, Christian education, family",
        "evangelism, missions, charity, social justice, compassion",
        "revival, renewal, transformation, testimony, witness"
      ];
      return mockKeywords[Math.floor(Math.random() * mockKeywords.length)];
    }

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
    if (this.demoMode) {
      // Generate mock relevance scores for demo (weighted towards higher scores)
      const scores = [0.85, 0.78, 0.92, 0.67, 0.89, 0.74, 0.81, 0.95, 0.72, 0.88];
      return scores[Math.floor(Math.random() * scores.length)];
    }

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
    if (this.demoMode) {
      // Generate mock Eden angles for demo
      const mockAngles = [
        {
          angle: "How this story connects to spiritual growth and daily Christian living",
          productCategories: ["devotionals", "christian-books"],
          themes: ["spiritual-growth", "faith", "christian-living"]
        },
        {
          angle: "Biblical perspectives on community and fellowship in modern times",
          productCategories: ["study-bibles", "christian-books"],
          themes: ["community", "fellowship", "bible-study"]
        },
        {
          angle: "Finding hope and encouragement through faith during challenging times",
          productCategories: ["devotionals", "inspirational-books"],
          themes: ["hope", "encouragement", "faith"]
        }
      ];
      return mockAngles[Math.floor(Math.random() * mockAngles.length)];
    }

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

  async generateBlogPost(newsSummary, edenAngle, contentType = 'blog') {
    if (this.demoMode) {
      // Generate mock blog post for demo
      const mockPosts = [
        {
          title: "Finding Faith in Community: Lessons from Today's Christian News",
          body: `<h2>A Message of Hope and Unity</h2>
          
          <p>In today's fast-paced world, it's encouraging to see how Christian communities continue to come together in meaningful ways. Recent news reminds us that faith isn't just a personal journey—it's a shared experience that strengthens when we walk alongside others.</p>
          
          <p>This story particularly resonates with the timeless biblical principle found in Ecclesiastes 4:12: "Though one may be overpowered, two can defend themselves. A cord of three strands is not quickly broken." When we see Christians supporting one another, we witness this truth in action.</p>
          
          <h3>Practical Steps for Building Community</h3>
          
          <p>Whether you're part of a large church or a small fellowship group, there are simple ways to strengthen your Christian community:</p>
          
          <ul>
          <li>Regular prayer and Bible study together</li>
          <li>Supporting one another through life's challenges</li>
          <li>Sharing meals and creating space for authentic conversation</li>
          <li>Serving your local community as a unified body</li>
          </ul>
          
          <p>For those looking to deepen their understanding of biblical community, consider exploring our collection of <a href="/books/christian-living">Christian living books</a> that offer practical wisdom for building lasting relationships rooted in faith.</p>
          
          <p>As we reflect on these encouraging developments in the Christian community, let's remember that each of us has a role to play in fostering unity and love. Whether through a kind word, a helping hand, or simply showing up consistently, we can all contribute to the beautiful tapestry of Christian fellowship.</p>`,
          suggestedLinks: [
            {"text": "Christian living books", "url": "/books/christian-living"},
            {"text": "devotionals for community", "url": "/books/devotionals"}
          ]
        }
      ];
      return mockPosts[0];
    }

    if (!this.hasOpenAI) {
      throw new Error('OpenAI API not available for blog post generation');
    }

    try {
      const wordCount = contentType === 'blog' ? '600-800' : '500';
      const format = contentType === 'blog' ? 'blog post' : 'PR article';

      const prompt = `
        Write a ${wordCount} word ${format} for Eden.co.uk based on this Christian news story.
        
        News Summary: ${newsSummary}
        Eden Angle: ${edenAngle.angle}
        Relevant Products: ${edenAngle.productCategories.join(', ')}
        Key Themes: ${edenAngle.themes.join(', ')}
        
        ${this.edenToneOfVoice}
        
        Requirements:
        - ${this.edenToneOfVoice}
        - Include 1-2 internal links to Eden products (use placeholder URLs like '/bibles/study-bibles' or '/books/devotionals')
        - Include a subtle call-to-action related to exploring these resources
        - Reference the original news story but add Eden's unique Christian perspective
        - Focus on practical application and encouragement
        - Ensure theological soundness
        
        Structure:
        1. Engaging headline
        2. Opening that connects to the news
        3. Eden's perspective and insights
        4. Practical application for readers
        5. Gentle product connection
        6. Encouraging conclusion with call-to-action
        
        Return as JSON:
        {
          "title": "Article title",
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
    if (this.demoMode) {
      // Generate mock social posts for demo
      const mockPosts = {
        instagram: {
          text: "🙏 Finding strength in community! Today's reminder that faith grows stronger when we walk together. What's one way your Christian community has blessed you recently? #ChristianCommunity #Faith #Hope",
          hashtags: ["#ChristianCommunity", "#Faith", "#Hope", "#Blessed", "#ChristianLife"]
        },
        facebook: {
          text: "There's something beautiful about watching Christian communities come together in love and support. Whether it's through prayer, service, or simply being present for one another, we see God's heart reflected in these moments of unity. How has your faith community impacted your life?",
          hashtags: ["#ChristianCommunity", "#Faith", "#Unity"]
        },
        linkedin: {
          text: "The power of community in faith-based organizations continues to demonstrate remarkable resilience and positive impact. Recent developments in Christian outreach programs show how collaborative efforts can create meaningful change in local communities. These initiatives remind us that shared values and collective action remain powerful forces for good in our society.",
          hashtags: ["#Community", "#Faith", "#Leadership", "#SocialImpact"]
        }
      };
      return mockPosts[platform] || mockPosts.instagram;
    }

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
    if (this.demoMode) {
      // Generate mock video scripts for demo
      const mockScripts = [
        {
          title: "Faith in Community",
          script: `[VISUAL: Sunrise over a peaceful landscape]
          
          NARRATOR: "In a world that often feels divided, there's something powerful happening in Christian communities across the UK..."
          
          [VISUAL: People gathering for prayer, hands joined in circle]
          
          NARRATOR: "When we come together in faith, we discover that our individual stories become part of something much bigger."
          
          [VISUAL: Open Bible with soft lighting]
          
          NARRATOR: "Ecclesiastes reminds us that 'a cord of three strands is not quickly broken.' Your faith community is that cord."
          
          [VISUAL: People serving together, smiling faces]
          
          NARRATOR: "Whether through prayer, service, or simply showing up for one another, we're building something beautiful together."
          
          [VISUAL: Eden logo with warm lighting]
          
          NARRATOR: "Discover resources to strengthen your faith journey at Eden.co.uk"`,
          visualSuggestions: ["Sunrise landscape", "Prayer circle", "Open Bible", "Community service", "Warm lighting"],
          callToAction: "Explore Christian community resources at Eden.co.uk"
        }
      ];
      return mockScripts[0];
    }

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
    if (this.demoMode) {
      // Generate mock image search queries for demo
      const mockQueries = [
        ["diverse people praying together", "open bible natural light", "christian community gathering"],
        ["hands in prayer circle", "church fellowship meal", "bible study group"],
        ["sunrise over cross", "people helping others", "christian family reading"],
        ["worship hands raised", "community service volunteers", "peaceful prayer moment"]
      ];
      return mockQueries[Math.floor(Math.random() * mockQueries.length)];
    }

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