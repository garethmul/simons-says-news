import db from './database.js';
import aiService from './aiService.js';
import imageService from './imageService.js';

class ContentGenerator {
  constructor() {
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS) || 3;
  }

  async generateContentFromTopStories(limit = 5, accountId = null, jobLogger = null) {
    const logger = jobLogger || console;
    logger.info(`🎨 Starting content generation from top stories... (accountId: ${accountId})`);
    
    try {
      // Get top stories with account filtering
      logger.info(`📊 Finding top ${limit} stories with relevance score >= 0.6`);
      const topStories = await db.getTopArticlesByRelevance(limit, 0.6, accountId);
      
      if (topStories.length === 0) {
        logger.warn('📰 No high-relevance stories found for content generation');
        return [];
      }

      logger.info(`📝 Found ${topStories.length} high-relevance stories for content generation`);
      topStories.forEach((story, index) => {
        logger.info(`📄 Story ${index + 1}: "${story.title}" (relevance: ${story.relevance_score})`);
      });
      
      const generatedContent = [];

      // Process stories in batches to avoid overwhelming APIs
      for (let i = 0; i < topStories.length; i += this.maxConcurrentJobs) {
        const batch = topStories.slice(i, i + this.maxConcurrentJobs);
        logger.info(`🔄 Processing batch ${Math.floor(i / this.maxConcurrentJobs) + 1} (${batch.length} stories)`);
        
        const batchPromises = batch.map((story, batchIndex) => {
          logger.info(`🎯 Starting content generation for story ${i + batchIndex + 1}: "${story.title}"`);
          return this.generateContentForStory(story, accountId, jobLogger);
        });
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            generatedContent.push(result.value);
            logger.info(`✅ Content generated successfully for story: "${batch[index].title}"`);
          } else {
            logger.error(`❌ Failed to generate content for story ${batch[index].article_id} ("${batch[index].title}"):`, result.reason.message);
          }
        });

        // Small delay between batches
        if (i + this.maxConcurrentJobs < topStories.length) {
          logger.info('⏱️ Waiting 2 seconds before processing next batch...');
          await this.delay(2000);
        }
      }

      logger.info(`🎉 Content generation complete: ${generatedContent.length} content pieces created from ${topStories.length} stories`);
      return generatedContent;
    } catch (error) {
      logger.error('❌ Content generation failed:', error.message);
      throw error;
    }
  }

  async generateContentForStory(story, accountId = null, jobLogger = null) {
    const logger = jobLogger || console;
    let blogId = null;
    try {
      logger.info(`[Workflow START] -------------------------------------------------`);
      logger.info(`[Workflow] 1. Processing Story: "${story.title}"`);
      logger.info(`[Workflow] 1a. Story Details:`);
      logger.info(`   - Article ID: ${story.article_id}`);
      logger.info(`   - Source: ${story.source_name || 'Unknown'}`);
      logger.info(`   - Relevance Score: ${story.relevance_score || 'N/A'}`);
      logger.info(`   - Content Length: ${story.full_text?.length || 0} characters`);
      logger.info(`   - URL: ${story.url || 'N/A'}`);

      const article = {
        title: story.title,
        full_text: story.full_text || '',
        summary_ai: story.summary_ai || '',
        source_name: story.source_name || 'Unknown',
        url: story.url
      };

      logger.info(`[Workflow] 2. Creating initial article record in database...`);
      const mainArticleData = {
        based_on_scraped_article_id: story.article_id,
        title: story.title,
        body_draft: 'Processing...',
        content_type: 'blog',
        status: 'draft'
      };
      
      blogId = await db.insertWithAccount('ssnews_generated_articles', mainArticleData, accountId);
      logger.info(`[Workflow] 3. Main article record created (Blog ID: ${blogId})`);

      logger.info(`[Workflow] 4. Starting full content generation workflow...`);
      const generatedContent = await this.generateAllConfiguredContent(article, blogId, accountId, jobLogger);
      const contentTypesGenerated = Object.keys(generatedContent).filter(key => !key.startsWith('_'));
      logger.info(`[Workflow] 5. Content generation complete. Generated ${contentTypesGenerated.length} content types: ${contentTypesGenerated.join(', ')}`);

      logger.info(`[Workflow] 6. Updating main article with generated blog content...`);
      let blogPostContent = 'Content generation for blog post failed or was not configured.';
      if (generatedContent && generatedContent.blog_post && generatedContent.blog_post[0] && generatedContent.blog_post[0].content) {
        blogPostContent = generatedContent.blog_post[0].content;
        logger.info(`[Workflow] 6a. Blog post content generated successfully (${this.countWords(blogPostContent)} words)`);
      } else {
        logger.warn(`[Workflow] 6a. No blog post content generated - using fallback message`);
      }
      
      const wordCount = this.countWords(blogPostContent);

      await db.update('ssnews_generated_articles', 
        { body_draft: blogPostContent, word_count: wordCount },
        'gen_article_id = ?',
        [blogId]
      );
      logger.info(`[Workflow] 7. Main article record updated successfully (${wordCount} words)`);
      
      logger.info(`[Workflow END] Complete for "${story.title}" (Blog ID: ${blogId}) --------------------------------------------------`);
      return { ...generatedContent, blogId, title: story.title };

    } catch (error) {
      logger.error(`❌❌ [Workflow FAIL] Top-level error in generateContentForStory for story ID ${story.article_id}, BlogID: ${blogId}`);
      logger.error(`❌❌ Error: ${error.message}`);
      logger.error(`❌❌ Stack: ${error.stack}`);
      return { blogId: blogId, error: error.message };
    }
  }

  // Note: Legacy social media and video generation methods have been removed.
  // These are now handled by the compatibility layer and legacy service.
  // Use compatibilityLayer.generateContent() for backwards-compatible generation.



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

  async generateAllConfiguredContent(article, blogId, accountId = null, jobLogger = null) {
    const logger = jobLogger || console;
    logger.info(`🔧 Generating all configured content for blog ${blogId} (accountId: ${accountId})`);
    
    try {
      // Get all active content configurations for this account
      logger.info(`📋 Fetching active content configurations for account ${accountId}...`);
      const contentConfigs = await db.getActiveContentConfigurations(accountId);
      
      if (contentConfigs.length === 0) {
        logger.warn(`⚠️ No content configurations found for account: ${accountId}. Using compatibility layer.`);
        
        // Import compatibility layer dynamically to avoid circular dependencies
        const { default: compatibilityLayer } = await import('./compatibilityLayer.js');
        return await compatibilityLayer.generateContent(article, blogId, accountId);
      }

      logger.info(`📋 Found ${contentConfigs.length} content configurations:`);
      contentConfigs.forEach((config, index) => {
        logger.info(`   ${index + 1}. ${config.name || config.display_name} (${config.category})`);
      });
      
      const generatedContent = {};
      const metadata = {
        generated_at: new Date().toISOString(),
        account_id: accountId,
        blog_id: blogId,
        total_configs: contentConfigs.length
      };

      // Process each content configuration
      for (let i = 0; i < contentConfigs.length; i++) {
        const config = contentConfigs[i];
        try {
          logger.info(`🔄 Processing configuration ${i + 1}/${contentConfigs.length}: ${config.name || config.display_name}`);
          logger.info(`   - Category: ${config.category}`);
          logger.info(`   - Display Name: ${config.name}`);
          logger.info(`   - Execution Order: ${config.execution_order}`);
          logger.info(`   - Template Output Type: ${config.template_output_type}`);
          
          const startTime = Date.now();
          const content = await this.generateContentFromTemplate(config, article, blogId, accountId, jobLogger);
          const duration = Date.now() - startTime;
          
          if (content && content.length > 0) {
            generatedContent[config.category] = content;
            logger.info(`✅ Generated ${content.length} ${config.category} items in ${duration}ms`);
            if (content[0] && content[0].content) {
              const contentLength = typeof content[0].content === 'string' ? content[0].content.length : 0;
              logger.info(`   - First item length: ${contentLength} characters`);
            }
          } else {
            logger.warn(`⚠️ No content generated for ${config.category} (${duration}ms)`);
            generatedContent[config.category] = [];
          }
          
        } catch (error) {
          logger.error(`❌ Error generating ${config.category}:`, error.message);
          logger.error(`❌ Stack trace:`, error.stack);
          generatedContent[config.category] = [];
        }
      }

      // Add metadata
      generatedContent._metadata = metadata;
      generatedContent._system = 'modern';
      generatedContent._generatedTypes = Object.keys(generatedContent).filter(key => !key.startsWith('_'));

      logger.info(`🎉 Content generation complete: ${generatedContent._generatedTypes.length} types generated`);
      logger.info(`   - Generated types: ${generatedContent._generatedTypes.join(', ')}`);
      return generatedContent;
      
    } catch (error) {
      logger.error('❌ Error in generateAllConfiguredContent:', error.message);
      logger.error('❌ Stack trace:', error.stack);
      
      // Fallback to compatibility layer on error
      logger.info('🔄 Falling back to compatibility layer...');
      const { default: compatibilityLayer } = await import('./compatibilityLayer.js');
      return await compatibilityLayer.generateContent(article, blogId, accountId);
    }
  }

  async generateContentFromTemplate(template, article, blogId, accountId = null, jobLogger = null) {
    const logger = jobLogger || console;
    logger.info(`📝 Generating content from template: ${template.category}`);
    logger.info(`🔍 Template structure:`, { 
      category: template.category,
      name: template.name,
      execution_order: template.execution_order,
      template_output_type: template.template_output_type
    });
    
    try {
      // Use the correct field names from the prompt templates table
      const category = template.category;
      
      if (!category) {
        throw new Error('No category found in template');
      }

      logger.info(`🔄 Using template for ${category}...`);

      // Generate content using generic template-based approach
      logger.info(`🤖 Starting AI generation for category: ${category}`);
      logger.info(`📋 Article context: "${article.title}" (${article.full_text?.length || 0} chars)`);
      logger.info(`🔧 Using template: ${template.name}`);
      
      const startTime = Date.now();
      let result = [];

      // Handle image generation with special processing
      if (category === 'image_generation') {
        logger.info(`🖼️ Processing image generation...`);
        // Let it proceed to normal generation - aiService will handle image generation
      }

      // Use generic content generation for ALL content types
      logger.info(`📝 Generating content using template system for ${category}...`);
      
      // Create basic generation config for templates
      const basicConfig = {
        temperature: 0.7,
        max_tokens: 2000, // Increased from 1000 to prevent truncation
        model: 'gemini'
      };
      
      const generatedContent = await aiService.generateGenericContent(category, article, basicConfig, blogId, accountId);
      logger.info(`📝 Generated content: ${generatedContent?.length || 0} characters`);
      
      if (generatedContent && generatedContent.length > 0) {
        // Parse content based on its structure
        let parsedContent;
        let contentData;
        
        // Try to parse as JSON for structured content (like social media)
        try {
          const parsed = JSON.parse(generatedContent);
          if (typeof parsed === 'object' && parsed !== null) {
            logger.info(`📊 Parsed structured content for ${category}`);
            
            // Handle different structured formats
            if (Array.isArray(parsed)) {
              contentData = parsed;
            } else if (category === 'social_media' && (parsed.facebook || parsed.instagram || parsed.linkedin || parsed.twitter)) {
              // Convert social media object to array format
              const platforms = ['facebook', 'instagram', 'linkedin', 'twitter'];
              contentData = platforms
                .filter(platform => parsed[platform])
                .map((platform, index) => ({
                  platform,
                  text: parsed[platform].text || parsed[platform],
                  hashtags: parsed[platform].hashtags || [],
                  order_number: index + 1
                }));
              logger.info(`📱 Converted social media content: ${contentData.length} posts`);
            } else {
              // Convert object to single item array
              contentData = [{ ...parsed, type: category }];
            }
          } else {
            // Fallback to text content
            contentData = [{
              content: generatedContent,
              word_count: this.countWords(generatedContent),
              type: category
            }];
          }
        } catch (parseError) {
          // Not JSON, treat as plain text
          logger.info(`📝 Treating as plain text content for ${category}`);
          
          // Special handling for prayer points - split by lines
          if (category === 'prayer_points' || category === 'prayer') {
            const prayerLines = generatedContent.split('\n')
              .map(line => line.trim())
              .filter(line => line && !line.startsWith('#') && line.length > 10)
              .slice(0, 5); // Limit to 5 prayer points
            
            contentData = prayerLines.map((line, index) => ({
              order_number: index + 1,
              prayer_text: line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').trim(),
              theme: this.extractThemeFromPrayer(line)
            }));
            logger.info(`🙏 Parsed ${contentData.length} prayer points`);
          } else {
            // Standard text content
            contentData = [{
              content: generatedContent,
              word_count: this.countWords(generatedContent),
              type: category
            }];
          }
        }

        // Save to ssnews_generated_content table
        try {
          const contentDataJson = JSON.stringify(contentData);
          const metadataJson = JSON.stringify({
            generation_model: 'gemini',
            content_length: generatedContent.length,
            item_count: contentData.length,
            category: category,
            generated_at: new Date().toISOString(),
            generation_config: basicConfig
          });

          const insertSql = `
            INSERT INTO ssnews_generated_content 
            (account_id, based_on_gen_article_id, prompt_category, content_data, metadata, status, created_at, updated_at)
            VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, NOW(), NOW())
          `;
          
          const [insertResult] = await db.pool.execute(insertSql, [
            accountId,
            blogId,
            category,
            contentDataJson,
            metadataJson,
            'draft'
          ]);
          
          logger.info(`💾 ${category} content saved to database (Content ID: ${insertResult.insertId})`);
          
          // Return content in expected format
          result = contentData.map((item, index) => ({
            id: `${insertResult.insertId}_${index}`,
            ...item
          }));
          
        } catch (saveError) {
          logger.error(`❌ Failed to save ${category} content to database: ${saveError.message}`);
          // Return content even if save failed
          result = contentData.map((item, index) => ({
            id: `${blogId}_${category}_${Date.now()}_${index}`,
            ...item
          }));
        }
      } else {
        logger.warn(`⚠️ No content generated for ${category}`);
      }
      
      const duration = Date.now() - startTime;
      logger.info(`⏱️ Content generation for ${category} completed in ${duration}ms`);
      
      if (result && result.length > 0) {
        logger.info(`✅ Successfully generated ${result.length} items for ${category}`);
      } else {
        logger.warn(`⚠️ No content generated for ${category}`);
      }
      
      return result || [];
      
    } catch (error) {
      logger.error(`❌ Error generating content from template ${template.category}:`, error.message);
      logger.error(`❌ Stack trace:`, error.stack);
      return [];
    }
  }





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

  async updateContentStatus(contentId, contentType, status, finalContent = null, accountId = null) {
    try {
      console.log(`📝 Updating content status: ID ${contentId}, type ${contentType}, status ${status} (accountId: ${accountId})`);
      
      // Map content types to database table
      let tableName;
      let idColumn;
      
      switch (contentType.toLowerCase()) {
        case 'blog':
        case 'article':
          tableName = 'ssnews_generated_articles';
          idColumn = 'gen_article_id';
          break;
        case 'social':
          tableName = 'ssnews_generated_social_media';
          idColumn = 'social_media_id';
          break;
        case 'video':
          tableName = 'ssnews_generated_video_scripts';
          idColumn = 'video_script_id';
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      // Build update data
      const updateData = {
        status: status,
        updated_at: new Date()
      };

      // Add final content if provided
      if (finalContent) {
        if (contentType.toLowerCase() === 'blog' || contentType.toLowerCase() === 'article') {
          updateData.body_draft = finalContent;
          updateData.word_count = this.countWords(finalContent);
        } else if (contentType.toLowerCase() === 'social') {
          updateData.post_text = finalContent;
        } else if (contentType.toLowerCase() === 'video') {
          updateData.script_text = finalContent;
        }
      }

      // Update the content
      const whereClause = accountId 
        ? `${idColumn} = ? AND account_id = ?`
        : `${idColumn} = ?`;
      
      const whereParams = accountId 
        ? [contentId, accountId]
        : [contentId];

      await db.update(tableName, updateData, whereClause, whereParams);
      
      console.log(`✅ Content status updated successfully: ${contentType} ${contentId} -> ${status}`);
      
      return {
        success: true,
        contentId,
        contentType,
        status,
        message: `${contentType} ${contentId} status updated to ${status}`
      };
      
    } catch (error) {
      console.error(`❌ Error updating content status:`, error.message);
      throw error;
    }
  }
}

// Create singleton instance
const contentGenerator = new ContentGenerator();

export default contentGenerator; 