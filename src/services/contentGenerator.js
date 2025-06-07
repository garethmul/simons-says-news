import db from './database.js';
import aiService from './aiService.js';
import imageService from './imageService.js';

class ContentGenerator {
  constructor() {
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS) || 3;
  }

  async generateContentFromTopStories(limit = 5, accountId = null) {
    console.log(`🎨 Starting content generation from top stories... (accountId: ${accountId})`);
    
    try {
      // Get top stories with account filtering
      const topStories = await db.getTopArticlesByRelevance(limit, 0.6, accountId);
      
      if (topStories.length === 0) {
        console.log('📰 No high-relevance stories found for content generation');
        return [];
      }

      console.log(`📝 Generating content for ${topStories.length} top stories`);
      
      const generatedContent = [];

      // Process stories in batches to avoid overwhelming APIs
      for (let i = 0; i < topStories.length; i += this.maxConcurrentJobs) {
        const batch = topStories.slice(i, i + this.maxConcurrentJobs);
        
        const batchPromises = batch.map(story => this.generateContentForStory(story, accountId));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            generatedContent.push(result.value);
          } else {
            console.error(`❌ Failed to generate content for story ${batch[index].article_id}:`, result.reason);
          }
        });

        // Small delay between batches
        if (i + this.maxConcurrentJobs < topStories.length) {
          await this.delay(2000);
        }
      }

      console.log(`🎉 Content generation complete: ${generatedContent.length} content pieces created`);
      return generatedContent;
    } catch (error) {
      console.error('❌ Content generation failed:', error.message);
      throw error;
    }
  }

  async generateContentForStory(story, accountId = null) {
    let blogId = null;
    try {
      console.log(`[Workflow START] -------------------------------------------------`);
      console.log(`[Workflow] 1. Processing Story: ${story.title.substring(0, 50)}...`);

      const article = {
        title: story.title,
        full_text: story.full_text || '',
        summary_ai: story.summary_ai || '',
        source_name: story.source_name || 'Unknown',
        url: story.url
      };

      console.log(`[Workflow] 2. Creating initial article record...`);
      const mainArticleData = {
        based_on_scraped_article_id: story.article_id,
        title: story.title,
        body_draft: 'Processing...',
        content_type: 'blog',
        status: 'draft'
      };
      
      blogId = await db.insertWithAccount('ssnews_generated_articles', mainArticleData, accountId);
      console.log(`[Workflow] 3. Main article record created (ID: ${blogId})`);

      console.log(`[Workflow] 4. Starting full content generation workflow...`);
      const generatedContent = await this.generateAllConfiguredContent(article, blogId, accountId);
      console.log(`[Workflow] 5. Full workflow complete. Generated ${Object.keys(generatedContent).length - 3} content types.`); // -3 for metadata fields

      console.log(`[Workflow] 6. Updating main article with generated blog content...`);
      let blogPostContent = 'Content generation for blog post failed or was not configured.';
      if (generatedContent && generatedContent.blog_post && generatedContent.blog_post[0] && generatedContent.blog_post[0].content) {
        blogPostContent = generatedContent.blog_post[0].content;
      }
      
      const wordCount = this.countWords(blogPostContent);

      await db.update('ssnews_generated_articles', 
        { body_draft: blogPostContent, word_count: wordCount },
        'gen_article_id = ?',
        [blogId]
      );
      console.log(`[Workflow] 7. Main article record updated successfully.`);
      
      console.log(`[Workflow END] --------------------------------------------------`);
      return { ...generatedContent, blogId, title: story.title };

    } catch (error) {
      console.error(`❌❌ [Workflow FAIL] Top-level error in generateContentForStory for story ID ${story.article_id}, BlogID: ${blogId}`);
      console.error(error.stack);
      return { blogId: blogId, error: error.message };
    }
  }

  // Note: Legacy social media and video generation methods have been removed.
  // These are now handled by the compatibility layer and legacy service.
  // Use compatibilityLayer.generateContent() for backwards-compatible generation.

  async generateGenericPrayerPoints(article, blogId, config, accountId = null) {
    try {
      const prayerContent = await aiService.generatePrayerPoints(article, blogId);
      
      console.log(`🙏 Raw prayer content: ${prayerContent}`);
      
      // Parse the prayer points string into individual prayer objects
      const prayerPointsData = [];
      
      if (typeof prayerContent === 'string' && prayerContent.length > 0) {
        // Split the prayer points by double line breaks
        const prayerTexts = prayerContent.split('\\n\\n').filter(text => text.trim().length > 0);
        
        for (let i = 0; i < prayerTexts.length && i < 5; i++) {
          const prayerText = prayerTexts[i].trim();
          if (prayerText.length > 10) {
            prayerPointsData.push({
              order_number: i + 1,
              prayer_text: prayerText,
              theme: this.extractThemeFromPrayer(prayerText)
            });
          }
        }
      }

      // Convert to JSON strings for proper storage
      const contentDataJson = JSON.stringify(prayerPointsData);
      const metadataJson = JSON.stringify({
        generation_model: 'gemini',
        prayer_count: prayerPointsData.length,
        generated_at: new Date().toISOString()
      });

      // Use raw SQL with explicit JSON casting to ensure proper storage
      const insertSql = `
        INSERT INTO ssnews_generated_content 
        (account_id, based_on_gen_article_id, prompt_category, content_data, metadata, status, created_at, updated_at)
        VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, NOW(), NOW())
      `;
      
      const insertParams = [
        accountId,
        blogId,
        'prayer_points',
        contentDataJson,
        metadataJson,
        'draft'
      ];

      const [result] = await db.pool.execute(insertSql, insertParams);
      const contentId = result.insertId;
      
      console.log(`🙏 Generated ${prayerPointsData.length} prayer points (Generic Content ID: ${contentId})`);
      
      return prayerPointsData.map((point, index) => ({
        id: `${contentId}_${index}`,
        order: point.order_number,
        content: point.prayer_text,
        theme: point.theme
      }));
    } catch (error) {
      console.error('❌ Error generating generic prayer points:', error.message);
      return [];
    }
  }

  async generateLegacyPrayerPoints(article, blogId, accountId = null) {
    try {
      const prayerContent = await aiService.generatePrayerPoints(article, blogId);
      
      let parsedPrayer;
      try {
        let cleanContent = prayerContent.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsedPrayer = JSON.parse(cleanContent);
      } catch (parseError) {
        // If not JSON, parse as simple text lines
        const prayerLines = prayerContent.split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').trim())
          .filter(line => line.length > 10);
        
        parsedPrayer = {
          prayers: prayerLines.slice(0, 5) // Take first 5 prayer points
        };
      }

      const prayerPoints = [];
      const prayers = parsedPrayer.prayers || parsedPrayer.points || [parsedPrayer.text];

      for (let i = 0; i < prayers.length && i < 5; i++) {
        try {
          const prayerText = prayers[i];
          if (!prayerText || prayerText.length < 10) continue;
          
          const pointData = {
            based_on_gen_article_id: blogId,
            order_number: i + 1,
            prayer_text: prayerText,
            status: 'draft'
          };

          const pointId = accountId 
            ? await db.insertGeneratedPrayerPoint(pointData, accountId)
            : await db.insertGeneratedPrayerPoint(pointData);

          prayerPoints.push({
            id: pointId,
            order: i + 1,
            content: prayerText
          });

          console.log(`🙏 Prayer point ${i + 1} created (ID: ${pointId})`);
        } catch (error) {
          console.error(`❌ Error creating prayer point ${i + 1}:`, error.message);
        }
      }

      return prayerPoints;
    } catch (error) {
      console.error('❌ Error generating legacy prayer points:', error.message);
      return [];
    }
  }

  extractThemeFromPrayer(prayerText) {
    // Simple theme extraction based on keywords
    const text = prayerText.toLowerCase();
    if (text.includes('heal') || text.includes('comfort')) return 'healing';
    if (text.includes('leader') || text.includes('guidance')) return 'leadership';
    if (text.includes('victim') || text.includes('affected')) return 'support';
    if (text.includes('justice') || text.includes('truth')) return 'justice';
    if (text.includes('hope') || text.includes('future')) return 'hope';
    return 'general';
  }

  // ============================================================================
  // MODERN WORKFLOW SYSTEM METHODS
  // ============================================================================

  async generateAllConfiguredContent(article, blogId, accountId = null) {
    console.log(`🔧 Generating all configured content for blog ${blogId} (accountId: ${accountId})`);
    
    try {
      // Get all active content configurations for this account
      const contentConfigs = await db.getActiveContentConfigurations(accountId);
      
      if (contentConfigs.length === 0) {
        console.log(`⚠️ No content configurations found for account: ${accountId}. Using compatibility layer.`);
        
        // Import compatibility layer dynamically to avoid circular dependencies
        const { default: compatibilityLayer } = await import('./compatibilityLayer.js');
        return await compatibilityLayer.generateContent(article, blogId, accountId);
      }

      console.log(`📋 Found ${contentConfigs.length} content configurations`);
      
      const generatedContent = {};
      const metadata = {
        generated_at: new Date().toISOString(),
        account_id: accountId,
        blog_id: blogId,
        total_configs: contentConfigs.length
      };

      // Process each content configuration
      for (const config of contentConfigs) {
        try {
          console.log(`🔄 Processing ${config.category} configuration...`);
          
          const content = await this.generateContentFromTemplate(config, article, blogId, accountId);
          
          if (content && content.length > 0) {
            generatedContent[config.category] = content;
            console.log(`✅ Generated ${content.length} ${config.category} items`);
          } else {
            console.log(`⚠️ No content generated for ${config.category}`);
          }
          
        } catch (error) {
          console.error(`❌ Error generating ${config.category}:`, error.message);
          generatedContent[config.category] = [];
        }
      }

      // Add metadata
      generatedContent._metadata = metadata;
      generatedContent._system = 'modern';
      generatedContent._generatedTypes = Object.keys(generatedContent).filter(key => !key.startsWith('_'));

      console.log(`🎉 Content generation complete: ${generatedContent._generatedTypes.length} types generated`);
      return generatedContent;
      
    } catch (error) {
      console.error('❌ Error in generateAllConfiguredContent:', error.message);
      
      // Fallback to compatibility layer on error
      console.log('🔄 Falling back to compatibility layer...');
      const { default: compatibilityLayer } = await import('./compatibilityLayer.js');
      return await compatibilityLayer.generateContent(article, blogId, accountId);
    }
  }

  async generateContentFromTemplate(config, article, blogId, accountId = null) {
    console.log(`📝 Generating content from template: ${config.category}`);
    
    try {
      // Get the latest version of the template
      const template = JSON.parse(config.template_data);
      const storageSchema = JSON.parse(config.storage_schema);
      
      if (template.type === 'ai_generation') {
        return await this.generateAIContentFromTemplate(config.category, article, template.generation_config, blogId);
      } else if (template.type === 'workflow') {
        return await this.generateAIContentFromTemplateWithWorkflow(template.workflow, { article, blogId }, blogId, accountId);
      } else {
        throw new Error(`Unknown template type: ${template.type}`);
      }
      
    } catch (error) {
      console.error(`❌ Error generating content from template ${config.category}:`, error.message);
      return [];
    }
  }

  async generateAIContentFromTemplate(category, article, generationConfig, blogId) {
    console.log(`🤖 Generating AI content for category: ${category}`);
    
    try {
      let content;
      
      // Use existing AI service methods based on category
      switch (category) {
        case 'prayer_points':
          content = await aiService.generatePrayerPoints(article, blogId);
          break;
        default:
          // Generic AI generation using prompt manager
          return await aiService.generatePrayerPoints(article, blogId);
      }
      
      return content;
      
    } catch (error) {
      console.error(`❌ Error in AI generation for ${category}:`, error.message);
      return null;
    }
  }

  // ... existing code ...

  // Utility methods
  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getGenerationStats(accountId = null) {
    try {
      console.log(`📊 Getting generation stats (accountId: ${accountId})`);
      
      // Build WHERE clause properly to avoid SQL syntax errors
      let whereClause = 'created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)';
      let accountParams = [];
      
      if (accountId) {
        whereClause += ' AND account_id = ?';
        accountParams = [accountId];
      }

      // Get detailed stats with properly constructed query
      const detailedStats = await db.query(`
        SELECT 
          content_type,
          status,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM ssnews_generated_articles 
        WHERE ${whereClause}
        GROUP BY content_type, status, DATE(created_at)
        ORDER BY date DESC
      `, accountParams);

      // Get total count with proper WHERE clause
      let totalWhereClause = '1=1';
      let totalParams = [];
      
      if (accountId) {
        totalWhereClause = 'account_id = ?';
        totalParams = [accountId];
      }

      const totalResult = await db.query(`
        SELECT COUNT(*) as total
        FROM ssnews_generated_articles
        WHERE ${totalWhereClause}
      `, totalParams);

      const totalGenerated = totalResult[0]?.total || 0;

      return {
        totalGenerated,
        detailedStats
      };
    } catch (error) {
      console.error('❌ Error getting generation stats:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const contentGenerator = new ContentGenerator();

export default contentGenerator; 