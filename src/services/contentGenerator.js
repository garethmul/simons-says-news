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
    console.log(`🎨 Generating content for: ${story.title.substring(0, 50)}...`);
    
    try {
      // Use the full article text if available, otherwise fall back to summary
      const sourceContent = story.full_text || story.summary_ai || story.title;
      console.log(`📄 Using source content: ${sourceContent.substring(0, 100)}...`);
      
      // Generate Eden angle based on the full source content
      const edenAngle = await aiService.generateEdenAngle(sourceContent, story.keywords_ai);
      console.log(`💡 Eden angle: ${edenAngle.angle.substring(0, 50)}...`);

      // Create article object for AI service
      const articleForAI = {
        title: story.title,
        full_text: sourceContent,
        summary_ai: story.summary_ai,
        source_name: story.source_name,
        url: story.url
      };

      // Generate blog post - first create the article record to get an ID for logging
      const blogId = await db.insertGeneratedArticle({
        based_on_scraped_article_id: story.article_id,
        title: story.title,
        body_draft: 'Generating...', // Temporary placeholder
        content_type: 'blog',
        word_count: 0,
        suggested_eden_product_links: JSON.stringify([]),
        status: 'draft'
      }, accountId);

      // Now generate the blog post with the proper ID for logging
      const blogPostContent = await aiService.generateBlogPost(articleForAI, blogId);
      
      // Parse the blog post content if it's JSON, otherwise use as-is
      let blogPost;
      try {
        blogPost = JSON.parse(blogPostContent);
      } catch {
        // If not JSON, create a simple structure
        blogPost = {
          title: story.title,
          body: blogPostContent,
          suggestedLinks: []
        };
      }

      // Update the article with the actual content - with account filtering
      const updateData = {
        title: blogPost.title,
        body_draft: typeof blogPost.body === 'string' ? blogPost.body : JSON.stringify(blogPost),
        word_count: this.countWords(blogPost.body || blogPostContent),
        suggested_eden_product_links: JSON.stringify(blogPost.suggestedLinks || [])
      };

      if (accountId) {
        await db.update('ssnews_generated_articles', updateData, 'gen_article_id = ? AND account_id = ?', [blogId, accountId]);
      } else {
        await db.update('ssnews_generated_articles', updateData, 'gen_article_id = ?', [blogId]);
      }

      console.log(`📝 Blog post created (ID: ${blogId})`);

      // Generate all configured content types dynamically
      const additionalContent = await this.generateAllConfiguredContent(articleForAI, blogId, accountId);

      // Generate and associate images with account context
      const images = await this.generateImagesWithAccount(blogPost, blogId, accountId);

      // Mark original article as processed - with account filtering
      if (accountId) {
        await db.update('ssnews_scraped_articles', { status: 'processed' }, 'article_id = ? AND account_id = ?', [story.article_id, accountId]);
      } else {
        await db.update('ssnews_scraped_articles', { status: 'processed' }, 'article_id = ?', [story.article_id]);
      }

      return {
        blogId,
        blogPost,
        ...additionalContent, // Spread the dynamic content
        images,
        originalStory: story
      };
    } catch (error) {
      console.error(`❌ Error generating content for story ${story.article_id}:`, error.message);
      throw error;
    }
  }

  async generateSocialPosts(article, blogId) {
    console.log('📱 Generating social media posts...');
    
    try {
      // Generate social media posts using the new prompt system
      const socialContent = await aiService.generateSocialMediaPosts(article, blogId);
      
      // Parse the social content - it should contain posts for different platforms
      let parsedContent;
      try {
        // Clean up the response to handle markdown code blocks
        let cleanContent = socialContent.trim();
        
        // Remove markdown code block markers if present
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        parsedContent = JSON.parse(cleanContent);
        console.log('✅ Successfully parsed AI response as JSON');
      } catch (parseError) {
        console.log('⚠️ AI response is not JSON, using fallback structure');
        console.log('Raw AI response:', socialContent.substring(0, 200) + '...');
        
        // If not JSON, create a simple structure from the raw content
        const fallbackText = socialContent.substring(0, 200).replace(/```json|```/g, '').trim();
        parsedContent = {
          facebook: { text: fallbackText, hashtags: ['#ChristianFaith', '#Eden'] },
          instagram: { text: fallbackText, hashtags: ['#ChristianLife', '#Eden'] },
          linkedin: { text: fallbackText, hashtags: ['#ChristianFaith', '#Eden'] }
        };
      }

      const socialPosts = [];
      const platforms = ['facebook', 'instagram', 'linkedin'];

      for (const platform of platforms) {
        try {
          const platformContent = parsedContent[platform] || parsedContent;
          const text = platformContent.text || socialContent.substring(0, 200);
          const hashtags = platformContent.hashtags || ['#ChristianFaith', '#Eden'];
          
          const postId = await db.insertGeneratedSocialPost({
            based_on_gen_article_id: blogId,
            platform,
            text_draft: `${text}\n\n${hashtags.join(' ')}`,
            emotional_hook_present_ai_check: platform !== 'linkedin',
            status: 'draft'
          });

          socialPosts.push({
            id: postId,
            platform,
            content: { text, hashtags }
          });

          console.log(`📱 ${platform} post created (ID: ${postId})`);
        } catch (error) {
          console.error(`❌ Error creating ${platform} post:`, error.message);
        }
      }

      return socialPosts;
    } catch (error) {
      console.error('❌ Error generating social media posts:', error.message);
      return [];
    }
  }

  async generateVideoScripts(article, blogId) {
    console.log('🎬 Generating video scripts...');
    
    const videoConfigs = [
      { duration: 30, type: 'short-form' },
      { duration: 60, type: 'short-form' },
      { duration: 120, type: 'long-form' }
    ];

    const videoScripts = [];

    for (const config of videoConfigs) {
      try {
        const videoContent = await aiService.generateVideoScript(article, config.duration, blogId);
        
        // Parse video content if it's JSON
        let parsedVideo;
        try {
          parsedVideo = JSON.parse(videoContent);
        } catch {
          parsedVideo = {
            title: `${config.duration}s Video Script`,
            script: videoContent,
            visualSuggestions: []
          };
        }
        
        const scriptId = await db.insertGeneratedVideoScript({
          based_on_gen_article_id: blogId,
          title: parsedVideo.title,
          duration_target_seconds: config.duration,
          script_draft: parsedVideo.script,
          visual_suggestions: JSON.stringify(parsedVideo.visualSuggestions || []),
          status: 'draft'
        });

        videoScripts.push({
          id: scriptId,
          duration: config.duration,
          type: config.type,
          content: parsedVideo
        });

        console.log(`🎬 ${config.duration}s video script created (ID: ${scriptId})`);
      } catch (error) {
        console.error(`❌ Error generating ${config.duration}s video script:`, error.message);
      }
    }

    return videoScripts;
  }

  async generateImages(blogPost, blogId) {
    console.log('🖼️ Generating and sourcing images...');
    
    try {
      // Images - AI Image Generation with Ideogram (replaces Pexels)
      console.log('🎨 AI image generation available via custom image generator');
      
      // Note: Images are now generated on-demand via the custom image generator UI
      // rather than automatically during content generation

      return [];
    } catch (error) {
      console.error('❌ Error generating images:', error.message);
      return [];
    }
  }

  async generateEvergreenContent(category, count = 1, accountId = null) {
    console.log(`🌲 Generating evergreen content for category: ${category} (accountId: ${accountId})`);
    
    try {
      const evergreenIdeas = await db.getEvergreenIdeasByCategory(category);
      
      if (evergreenIdeas.length === 0) {
        console.log(`📝 No evergreen ideas found for category: ${category}`);
        return [];
      }

      // Select random ideas
      const selectedIdeas = this.shuffleArray(evergreenIdeas).slice(0, count);
      const generatedContent = [];

      for (const idea of selectedIdeas) {
        try {
          console.log(`🌲 Generating content for: ${idea.title_idea} (accountId: ${accountId})`);

          // Create a mock article object from the evergreen idea
          const mockArticle = {
            title: idea.title_idea,
            full_text: `${idea.brief_description} This evergreen topic focuses on ${idea.target_keywords}.`,
            summary_ai: idea.brief_description,
            source_name: 'Evergreen Content',
            url: ''
          };
          
          // Create the article record with account context
          const articleData = {
            based_on_evergreen_id: idea.evergreen_id,
            title: idea.title_idea,
            body_draft: 'Generating...', // Temporary placeholder
            content_type: 'blog',
            word_count: 0,
            suggested_eden_product_links: JSON.stringify([]),
            status: 'draft'
          };

          const blogId = accountId 
            ? await db.insertWithAccount('ssnews_generated_articles', articleData, accountId)
            : await db.insert('ssnews_generated_articles', articleData);

          // Generate blog post with the proper parameters
          const blogPostContent = await aiService.generateBlogPost(mockArticle, blogId);
          
          // Parse the blog post content if it's JSON, otherwise use as-is
          let blogPost;
          try {
            blogPost = JSON.parse(blogPostContent);
          } catch {
            // If not JSON, create a simple structure
            blogPost = {
              title: idea.title_idea,
              body: blogPostContent,
              suggestedLinks: []
            };
          }
          
          // Update the article with the actual content - with account filtering
          const updateData = {
            title: blogPost.title,
            body_draft: typeof blogPost.body === 'string' ? blogPost.body : JSON.stringify(blogPost),
            word_count: this.countWords(blogPost.body || blogPostContent),
            suggested_eden_product_links: JSON.stringify(blogPost.suggestedLinks || [])
          };

          if (accountId) {
            await db.update('ssnews_generated_articles', updateData, 'gen_article_id = ? AND account_id = ?', [blogId, accountId]);
          } else {
            await db.update('ssnews_generated_articles', updateData, 'gen_article_id = ?', [blogId]);
          }

          // Generate associated content with account context
          const additionalContent = await this.generateAllConfiguredContent(mockArticle, blogId, accountId);
          const images = await this.generateImagesWithAccount(blogPost, blogId, accountId);

          generatedContent.push({
            blogId,
            blogPost,
            ...additionalContent,
            images,
            evergreenIdea: idea
          });

          console.log(`🌲 Evergreen content created for: ${idea.title_idea} (accountId: ${accountId})`);
        } catch (error) {
          console.error(`❌ Error generating evergreen content for idea ${idea.evergreen_id}:`, error.message);
        }
      }

      return generatedContent;
    } catch (error) {
      console.error('❌ Evergreen content generation failed:', error.message);
      throw error;
    }
  }

  // Account-aware helper methods for content generation
  async generateSocialPostsWithAccount(article, blogId, accountId = null) {
    console.log('📱 Generating social media posts with account context...');
    
    try {
      const socialContent = await aiService.generateSocialMediaPosts(article, blogId);
      
      let parsedContent;
      try {
        let cleanContent = socialContent.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsedContent = JSON.parse(cleanContent);
      } catch (parseError) {
        const fallbackText = socialContent.substring(0, 200).replace(/```json|```/g, '').trim();
        parsedContent = {
          facebook: { text: fallbackText, hashtags: ['#ChristianFaith', '#Eden'] },
          instagram: { text: fallbackText, hashtags: ['#ChristianLife', '#Eden'] },
          linkedin: { text: fallbackText, hashtags: ['#ChristianFaith', '#Eden'] }
        };
      }

      const socialPosts = [];
      const platforms = ['facebook', 'instagram', 'linkedin'];

      for (const platform of platforms) {
        try {
          const platformContent = parsedContent[platform] || parsedContent;
          const text = platformContent.text || socialContent.substring(0, 200);
          const hashtags = platformContent.hashtags || ['#ChristianFaith', '#Eden'];
          
          const postData = {
            based_on_gen_article_id: blogId,
            platform,
            text_draft: `${text}\n\n${hashtags.join(' ')}`,
            emotional_hook_present_ai_check: platform !== 'linkedin',
            status: 'draft'
          };

          const postId = accountId 
            ? await db.insertWithAccount('ssnews_generated_social_posts', postData, accountId)
            : await db.insert('ssnews_generated_social_posts', postData);

          socialPosts.push({
            id: postId,
            platform,
            content: { text, hashtags }
          });

          console.log(`📱 ${platform} post created (ID: ${postId})`);
        } catch (error) {
          console.error(`❌ Error creating ${platform} post:`, error.message);
        }
      }

      return socialPosts;
    } catch (error) {
      console.error('❌ Error generating social media posts:', error.message);
      return [];
    }
  }

  async generateVideoScriptsWithAccount(article, blogId, accountId = null) {
    console.log('🎬 Generating video scripts with account context...');
    
    const videoConfigs = [
      { duration: 30, type: 'short-form' },
      { duration: 60, type: 'short-form' },
      { duration: 120, type: 'long-form' }
    ];

    const videoScripts = [];

    for (const config of videoConfigs) {
      try {
        const videoContent = await aiService.generateVideoScript(article, config.duration, blogId);
        
        let parsedVideo;
        try {
          parsedVideo = JSON.parse(videoContent);
        } catch {
          parsedVideo = {
            title: `${config.duration}s Video Script`,
            script: videoContent,
            visualSuggestions: []
          };
        }
        
        const scriptData = {
          based_on_gen_article_id: blogId,
          title: parsedVideo.title,
          duration_target_seconds: config.duration,
          script_draft: parsedVideo.script,
          visual_suggestions: JSON.stringify(parsedVideo.visualSuggestions || []),
          status: 'draft'
        };

        const scriptId = accountId 
          ? await db.insertWithAccount('ssnews_generated_video_scripts', scriptData, accountId)
          : await db.insert('ssnews_generated_video_scripts', scriptData);

        videoScripts.push({
          id: scriptId,
          duration: config.duration,
          type: config.type,
          content: parsedVideo
        });

        console.log(`🎬 ${config.duration}s video script created (ID: ${scriptId})`);
      } catch (error) {
        console.error(`❌ Error generating ${config.duration}s video script:`, error.message);
      }
    }

    return videoScripts;
  }

  async generateImagesWithAccount(blogPost, blogId, accountId = null) {
    console.log('🖼️ Generating and sourcing images with account context...');
    
    try {
      // Images - AI Image Generation with Ideogram (replaces Pexels)
      console.log('🎨 AI image generation available via custom image generator');
      
      // Note: Images are now generated on-demand via the custom image generator UI
      // rather than automatically during content generation

      return [];
    } catch (error) {
      console.error('❌ Error generating images:', error.message);
      return [];
    }
  }

  async generatePrayerPointsWithAccount(article, blogId, accountId = null) {
    console.log('🙏 Generating prayer points with account context...');
    
    try {
      // Check if generic content configuration exists
      const config = await db.getContentConfiguration('prayer_points', accountId);
      
      if (config) {
        console.log('✨ Using generic content system for prayer points');
        return await this.generateGenericPrayerPoints(article, blogId, config, accountId);
      } else {
        console.log('⚠️ No generic config found, using legacy prayer points system');
        return await this.generateLegacyPrayerPoints(article, blogId, accountId);
      }
    } catch (error) {
      console.error('❌ Error generating prayer points:', error.message);
      return [];
    }
  }

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

  // ==============================================
  // GENERIC TEMPLATE-DRIVEN CONTENT GENERATION
  // ==============================================

  /**
   * Generate all configured content types for an article using workflow chaining
   * This replaces the hardcoded social/video/prayer methods
   */
  async generateAllConfiguredContent(article, blogId, accountId = null) {
    console.log('🎨 Generating all configured content types with workflow chaining...');
    
    try {
      // Get workflow prompts in execution order
      const promptManager = await this.ensurePromptManager();
      const workflowSteps = await promptManager.getWorkflowPrompts(accountId, {
        article_content: `Title: ${article.title}\n\nContent: ${article.full_text || article.summary_ai || 'No content available'}\n\nSource: ${article.source_name || 'Unknown'}`
      });
      
      const results = {};
      const contentTypeMap = {};
      const stepOutputs = {
        article_content: `Title: ${article.title}\n\nContent: ${article.full_text || article.summary_ai || 'No content available'}\n\nSource: ${article.source_name || 'Unknown'}`
      };
      
      // Execute workflow steps in order
      for (const step of workflowSteps) {
        try {
          console.log(`📋 Executing workflow step ${step.executionOrder}: ${step.name} (${step.category})`);
          
          // Get the current prompt configuration to understand storage schema
          const config = await db.getContentConfiguration(step.category, accountId);
          if (!config) {
            console.log(`⚠️ No configuration found for ${step.category}, skipping...`);
            continue;
          }
          
          // Generate content using AI with current step outputs as variables
          const aiContent = await this.generateAIContentFromTemplateWithWorkflow(
            step, 
            stepOutputs, 
            blogId
          );
          
          // Parse and structure the content according to the storage schema
          const structuredData = this.parseContentToSchema(aiContent, config.storage_schema, step.category);
          
          // Store in generic content table
          const contentId = await this.storeGenericContent(
            blogId,
            step.category,
            structuredData,
            config.generation_config,
            accountId
          );
          
          // Format for frontend and store in results
          const generatedItems = this.formatContentForFrontend(structuredData, contentId, config.ui_config);
          
          // Store results using the category name
          const categoryKey = step.category;
          results[categoryKey] = generatedItems;
          
          // Also store in plural form for backwards compatibility
          const pluralKey = this.getPluralForm(categoryKey);
          results[pluralKey] = generatedItems;
          
          // Add this step's output to available variables for next steps
          const outputContent = this.extractOutputForChaining(structuredData, step.category);
          stepOutputs[`${step.category}_output`] = outputContent;
          
          // Keep track of content type metadata
          contentTypeMap[categoryKey] = {
            displayName: step.name,
            icon: config.ui_config?.icon || 'FileText',
            count: generatedItems.length
          };
          
          console.log(`✅ Generated ${generatedItems.length} ${step.name} items`);
          
        } catch (error) {
          console.error(`❌ Error in workflow step ${step.category}:`, error.message);
          results[step.category] = [];
        }
      }
      
      // Add metadata about generated content types
      results._contentTypeMap = contentTypeMap;
      results._generatedTypes = Object.keys(contentTypeMap);
      results._workflowExecuted = true;
      
      console.log(`🎉 Executed ${workflowSteps.length} workflow steps for ${Object.keys(contentTypeMap).length} content types`);
      return results;
      
    } catch (error) {
      console.error('❌ Error in generateAllConfiguredContent:', error.message);
      return {};
    }
  }

  /**
   * Generate content from a specific template configuration
   */
  async generateContentFromTemplate(config, article, blogId, accountId = null) {
    const { prompt_category, generation_config, storage_schema, ui_config } = config;
    
    try {
      // Generate content using AI
      const aiContent = await this.generateAIContentFromTemplate(
        prompt_category,
        article,
        generation_config,
        blogId
      );
      
      // Parse and structure the content according to the storage schema
      const structuredData = this.parseContentToSchema(aiContent, storage_schema, prompt_category);
      
      // Store in generic content table
      const contentId = await this.storeGenericContent(
        blogId,
        prompt_category,
        structuredData,
        generation_config,
        accountId
      );
      
      // Return in format expected by frontend
      return this.formatContentForFrontend(structuredData, contentId, ui_config);
      
    } catch (error) {
      console.error(`❌ Error generating ${prompt_category} content:`, error.message);
      return [];
    }
  }

  /**
   * Generate AI content using the appropriate prompt template
   */
  async generateAIContentFromTemplate(category, article, generationConfig, blogId) {
    const promptTemplate = generationConfig?.prompt_template || category;
    
    // Route to appropriate AI service method based on category
    switch (category) {
      case 'social_media':
      case 'social_posts':
        return await aiService.generateSocialMediaPosts(article, blogId);
      
      case 'video_script':
      case 'video_scripts':
        const duration = generationConfig?.default_duration || 60;
        return await aiService.generateVideoScript(article, duration, blogId);
      
      case 'prayer_points':
      case 'prayer':
        return await aiService.generatePrayerPoints(article, blogId);
      
      default:
        // For any new template types, use a generic generation method
        return await aiService.generateGenericContent(category, article, generationConfig, blogId);
    }
  }

  /**
   * Parse AI content according to storage schema
   */
  parseContentToSchema(content, storageSchema, category) {
    try {
      // Handle different content types
      switch (category) {
        case 'prayer_points':
        case 'prayer':
          return this.parsePrayerPointsContent(content);
        
        case 'social_media':
        case 'social_posts':
          return this.parseSocialMediaContent(content);
        
        case 'video_script':
        case 'video_scripts':
          return this.parseVideoScriptContent(content);
        
        default:
          // For new types, try to parse as JSON first, then as text
          return this.parseGenericContent(content, storageSchema);
      }
    } catch (error) {
      console.error(`Error parsing ${category} content:`, error.message);
      // Fallback to simple text structure
      return [{
        text: content,
        order: 1,
        created_at: new Date().toISOString()
      }];
    }
  }

  /**
   * Parse prayer points content
   */
  parsePrayerPointsContent(content) {
    const prayerPoints = [];
    
    if (typeof content === 'string') {
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
    }
    
    return prayerPoints;
  }

  /**
   * Parse social media content
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
      // Fallback: create generic posts
      return [{
        platform: 'general',
        text: content.substring(0, 300),
        hashtags: [],
        order_number: 1
      }];
    }
  }

  /**
   * Parse video script content
   */
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
        title: 'Generated Video Script',
        script: content,
        duration: 60,
        visual_suggestions: [],
        order_number: 1
      }];
    }
  }

  /**
   * Parse generic content based on schema
   */
  parseGenericContent(content, schema) {
    // Try JSON first
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => ({
          ...item,
          order_number: item.order_number || index + 1
        }));
      }
      return [{ ...parsed, order_number: 1 }];
    } catch (error) {
      // Fallback to text
      return [{
        text: content,
        order_number: 1
      }];
    }
  }

  /**
   * Store content in generic content table
   */
  async storeGenericContent(blogId, category, contentData, metadata, accountId) {
    const storageData = {
      based_on_gen_article_id: blogId,
      prompt_category: category,
      content_data: JSON.stringify(contentData),
      metadata: JSON.stringify({
        ...metadata,
        generated_at: new Date().toISOString(),
        item_count: Array.isArray(contentData) ? contentData.length : 1
      }),
      status: 'draft'
    };

    if (accountId) {
      return await db.insertWithAccount('ssnews_generated_content', storageData, accountId);
    }
    return await db.insert('ssnews_generated_content', storageData);
  }

  /**
   * Format content for frontend consumption
   */
  formatContentForFrontend(contentData, contentId, uiConfig) {
    if (!Array.isArray(contentData)) {
      contentData = [contentData];
    }

    return contentData.map((item, index) => ({
      id: `${contentId}_${index}`,
      order: item.order_number || index + 1,
      content: item.prayer_text || item.text || item.script || JSON.stringify(item),
      ...item, // Include all original fields
      _contentId: contentId,
      _displayType: uiConfig?.display_type || 'text'
    }));
  }

  /**
   * Get plural form of category name for backwards compatibility
   */
  getPluralForm(category) {
    const pluralMap = {
      'prayer_points': 'prayerPoints',
      'social_media': 'socialPosts',
      'social_posts': 'socialPosts',
      'video_script': 'videoScripts',
      'video_scripts': 'videoScripts'
    };
    
    return pluralMap[category] || `${category}s`;
  }

  /**
   * Ensure prompt manager is available for workflow execution
   */
  async ensurePromptManager() {
    if (!global.promptManager) {
      const PromptManager = (await import('./promptManager.js')).default;
      global.promptManager = new PromptManager();
    }
    return global.promptManager;
  }

  /**
   * Generate AI content for workflow step with variable substitution
   */
  async generateAIContentFromTemplateWithWorkflow(step, variables, blogId) {
    try {
      // Substitute all available variables in the prompt
      let prompt = step.prompt;
      let systemMessage = step.systemMessage;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`;
        if (prompt) {
          prompt = prompt.replace(new RegExp(placeholder, 'g'), value || '');
        }
        if (systemMessage) {
          systemMessage = systemMessage.replace(new RegExp(placeholder, 'g'), value || '');
        }
      }

      // Route to appropriate AI service method based on category
      switch (step.category) {
        case 'social_media':
        case 'social_posts':
          return await aiService.generateSocialMediaPostsWithPrompt(prompt, systemMessage, blogId);
        
        case 'video_script':
        case 'video_scripts':
          return await aiService.generateVideoScriptWithPrompt(prompt, systemMessage, blogId);
        
        case 'prayer_points':
        case 'prayer':
          return await aiService.generatePrayerPointsWithPrompt(prompt, systemMessage, blogId);
        
        default:
          // For any new template types, use the generic generation method
          return await aiService.generateGenericContentWithPrompt(prompt, systemMessage, step.category, blogId);
      }
    } catch (error) {
      console.error(`❌ Error generating AI content for ${step.category}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract output content for chaining to next steps
   */
  extractOutputForChaining(structuredData, category) {
    try {
      if (!Array.isArray(structuredData) || structuredData.length === 0) {
        return '';
      }

      switch (category) {
        case 'prayer_points':
        case 'prayer':
          return structuredData.map(item => item.prayer_text || item.text || '').join('\n\n');
        
        case 'social_media':
        case 'social_posts':
          return structuredData.map(item => `${item.platform || 'Social'}: ${item.text || ''}`).join('\n\n');
        
        case 'video_script':
        case 'video_scripts':
          return structuredData.map(item => item.script || item.text || '').join('\n\n');
        
        default:
          // Generic extraction - try common field names
          return structuredData.map(item => 
            item.text || item.content || item.script || item.prayer_text || JSON.stringify(item)
          ).join('\n\n');
      }
    } catch (error) {
      console.error(`❌ Error extracting output for chaining from ${category}:`, error.message);
      return '';
    }
  }

  async getContentForReview(status = 'draft', limit = 10, accountId = null) {
    console.log(`📋 Fetching content for review (status: ${status}, accountId: ${accountId})`);
    
    try {
      const content = await db.getContentForReview(status, limit, accountId);
      console.log(`📋 Found ${content.length} content pieces for review`);
      
      return content;
    } catch (error) {
      console.error('❌ Error fetching content for review:', error.message);
      throw error;
    }
  }

  async updateContentStatus(contentId, contentType, status, finalContent = null, accountId = null) {
    console.log(`📝 Updating ${contentType} ${contentId} status to: ${status} (accountId: ${accountId})`);
    
    try {
      const updateData = { status };
      
      if (finalContent) {
        if (contentType === 'article') {
          updateData.body_final = finalContent;
          updateData.reviewed_by_human_at = new Date();
        } else if (contentType === 'social') {
          updateData.text_final = finalContent;
        } else if (contentType === 'video') {
          updateData.script_final = finalContent;
        }
      }

      const table = contentType === 'article' ? 'ssnews_generated_articles' :
                   contentType === 'social' ? 'ssnews_generated_social_posts' :
                   'ssnews_generated_video_scripts';
      
      const idField = contentType === 'article' ? 'gen_article_id' :
                     contentType === 'social' ? 'gen_social_id' :
                     'gen_video_script_id';

      // Add account verification if accountId is provided
      let whereClause = `${idField} = ?`;
      let whereParams = [contentId];
      
      if (accountId) {
        whereClause += ' AND account_id = ?';
        whereParams.push(accountId);
      }

      await db.update(table, updateData, whereClause, whereParams);
      
      console.log(`✅ ${contentType} ${contentId} updated successfully`);
    } catch (error) {
      console.error(`❌ Error updating ${contentType} ${contentId}:`, error.message);
      throw error;
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
}

// Create singleton instance
const contentGenerator = new ContentGenerator();

export default contentGenerator; 