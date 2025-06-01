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
        status: 'review_pending'
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

      // Generate social media posts with account context
      const socialPosts = await this.generateSocialPostsWithAccount(articleForAI, blogId, accountId);
      
      // Generate video scripts with account context
      const videoScripts = await this.generateVideoScriptsWithAccount(articleForAI, blogId, accountId);

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
        socialPosts,
        videoScripts,
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
      // Generate image search queries
      const searchQueries = await aiService.generateImageSearchQueries(blogPost, 3);
      console.log(`🔍 Image search queries: ${searchQueries.join(', ')}`);

      const images = [];

      for (const query of searchQueries) {
        try {
          const imageResults = await imageService.searchPexelsImages(query, 2);
          
          for (const image of imageResults) {
            // Upload to Sirv CDN
            const sirvUrl = await imageService.uploadToSirv(image.src.large, `eden-content-${blogId}-${Date.now()}.jpg`);
            
            // Generate alt text
            const altText = await aiService.generateAltText(image.alt || query);

            // Store image asset
            const imageId = await db.insertImageAsset({
              associated_content_type: 'gen_article',
              associated_content_id: blogId,
              source_api: 'pexels',
              source_image_id_external: image.id.toString(),
              sirv_cdn_url: sirvUrl,
              alt_text_suggestion_ai: altText,
              is_approved_human: false
            });

            images.push({
              id: imageId,
              sirvUrl,
              altText,
              pexelsId: image.id,
              query
            });

            console.log(`🖼️ Image stored (ID: ${imageId})`);
          }
        } catch (error) {
          console.error(`❌ Error processing image query "${query}":`, error.message);
        }
      }

      return images;
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
          const socialPosts = await this.generateSocialPostsWithAccount(mockArticle, blogId, accountId);
          const videoScripts = await this.generateVideoScriptsWithAccount(mockArticle, blogId, accountId);
          const images = await this.generateImagesWithAccount(blogPost, blogId, accountId);

          generatedContent.push({
            blogId,
            blogPost,
            socialPosts,
            videoScripts,
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
      const searchQueries = await aiService.generateImageSearchQueries(blogPost, 3);
      console.log(`🔍 Image search queries: ${searchQueries.join(', ')}`);

      const images = [];

      for (const query of searchQueries) {
        try {
          const imageResults = await imageService.searchPexelsImages(query, 2);
          
          for (const image of imageResults) {
            const sirvUrl = await imageService.uploadToSirv(image.src.large, `eden-content-${blogId}-${Date.now()}.jpg`);
            const altText = await aiService.generateAltText(image.alt || query);

            const imageData = {
              associated_content_type: 'gen_article',
              associated_content_id: blogId,
              source_api: 'pexels',
              source_image_id_external: image.id.toString(),
              sirv_cdn_url: sirvUrl,
              alt_text_suggestion_ai: altText,
              is_approved_human: false
            };

            const imageId = accountId 
              ? await db.insertWithAccount('ssnews_image_assets', imageData, accountId)
              : await db.insert('ssnews_image_assets', imageData);

            images.push({
              id: imageId,
              sirvUrl,
              altText,
              pexelsId: image.id,
              query
            });

            console.log(`🖼️ Image stored (ID: ${imageId})`);
          }
        } catch (error) {
          console.error(`❌ Error processing image query "${query}":`, error.message);
        }
      }

      return images;
    } catch (error) {
      console.error('❌ Error generating images:', error.message);
      return [];
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