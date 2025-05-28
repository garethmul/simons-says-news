import db from './database.js';
import aiService from './aiService.js';
import imageService from './imageService.js';

class ContentGenerator {
  constructor() {
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS) || 3;
  }

  async generateContentFromTopStories(limit = 5) {
    console.log('🎨 Starting content generation from top stories...');
    
    try {
      // Get top stories
      const topStories = await db.getTopArticlesByRelevance(limit, 0.6);
      
      if (topStories.length === 0) {
        console.log('📰 No high-relevance stories found for content generation');
        return [];
      }

      console.log(`📝 Generating content for ${topStories.length} top stories`);
      
      const generatedContent = [];

      // Process stories in batches to avoid overwhelming APIs
      for (let i = 0; i < topStories.length; i += this.maxConcurrentJobs) {
        const batch = topStories.slice(i, i + this.maxConcurrentJobs);
        
        const batchPromises = batch.map(story => this.generateContentForStory(story));
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

  async generateContentForStory(story) {
    console.log(`🎨 Generating content for: ${story.title.substring(0, 50)}...`);
    
    try {
      // Use the full article text if available, otherwise fall back to summary
      const sourceContent = story.full_text || story.summary_ai || story.title;
      console.log(`📄 Using source content: ${sourceContent.substring(0, 100)}...`);
      
      // Generate Eden angle based on the full source content
      const edenAngle = await aiService.generateEdenAngle(sourceContent, story.keywords_ai);
      console.log(`💡 Eden angle: ${edenAngle.angle.substring(0, 50)}...`);

      // Generate blog post using the full source content and story details
      const blogPost = await aiService.generateBlogPost(sourceContent, edenAngle, 'blog', {
        originalTitle: story.title,
        originalUrl: story.url,
        sourceName: story.source_name,
        publicationDate: story.publication_date
      });
      
      // Store blog post
      const blogId = await db.insertGeneratedArticle({
        based_on_scraped_article_id: story.article_id,
        title: blogPost.title,
        body_draft: blogPost.body,
        content_type: 'blog',
        word_count: this.countWords(blogPost.body),
        suggested_eden_product_links: JSON.stringify(blogPost.suggestedLinks),
        status: 'review_pending' // Set to review_pending so it shows up in the interface
      });

      console.log(`📝 Blog post created (ID: ${blogId})`);

      // Generate social media posts
      const socialPosts = await this.generateSocialPosts(blogPost, blogId);
      
      // Generate video scripts
      const videoScripts = await this.generateVideoScripts(blogPost, blogId);

      // Generate and associate images
      const images = await this.generateImages(blogPost, blogId);

      // Mark original article as processed
      await db.update('ssnews_scraped_articles', { status: 'processed' }, 'article_id = ?', [story.article_id]);

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

  async generateSocialPosts(blogPost, blogId) {
    console.log('📱 Generating social media posts...');
    
    const platforms = ['instagram', 'facebook', 'linkedin'];
    const socialPosts = [];

    for (const platform of platforms) {
      try {
        const socialContent = await aiService.generateSocialPost(blogPost, platform);
        
        const postId = await db.insertGeneratedSocialPost({
          based_on_gen_article_id: blogId,
          platform,
          text_draft: `${socialContent.text}\n\n${socialContent.hashtags.join(' ')}`,
          emotional_hook_present_ai_check: platform !== 'linkedin',
          status: 'draft'
        });

        socialPosts.push({
          id: postId,
          platform,
          content: socialContent
        });

        console.log(`📱 ${platform} post created (ID: ${postId})`);
      } catch (error) {
        console.error(`❌ Error generating ${platform} post:`, error.message);
      }
    }

    return socialPosts;
  }

  async generateVideoScripts(blogPost, blogId) {
    console.log('🎬 Generating video scripts...');
    
    const videoConfigs = [
      { duration: 30, type: 'short-form' },
      { duration: 60, type: 'short-form' },
      { duration: 120, type: 'long-form' }
    ];

    const videoScripts = [];

    for (const config of videoConfigs) {
      try {
        const videoContent = await aiService.generateVideoScript(blogPost, config.duration);
        
        const scriptId = await db.insertGeneratedVideoScript({
          based_on_gen_article_id: blogId,
          title: videoContent.title,
          duration_target_seconds: config.duration,
          script_draft: videoContent.script,
          visual_suggestions: JSON.stringify(videoContent.visualSuggestions),
          status: 'draft'
        });

        videoScripts.push({
          id: scriptId,
          duration: config.duration,
          type: config.type,
          content: videoContent
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

  async generateEvergreenContent(category, count = 1) {
    console.log(`🌲 Generating evergreen content for category: ${category}`);
    
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
          console.log(`🌲 Generating content for: ${idea.title_idea}`);

          // Create a mock "news summary" from the evergreen idea
          const mockSummary = `${idea.brief_description} This evergreen topic focuses on ${idea.target_keywords}.`;
          
          // Generate Eden angle
          const edenAngle = {
            angle: idea.brief_description,
            productCategories: idea.relevant_product_types ? idea.relevant_product_types.split(',') : ['christian-books'],
            themes: idea.target_keywords ? idea.target_keywords.split(',') : ['faith', 'spiritual-growth']
          };

          // Generate blog post
          const blogPost = await aiService.generateBlogPost(mockSummary, edenAngle, 'blog');
          
          // Store blog post
          const blogId = await db.insertGeneratedArticle({
            based_on_evergreen_id: idea.evergreen_id,
            title: blogPost.title,
            body_draft: blogPost.body,
            content_type: 'blog',
            word_count: this.countWords(blogPost.body),
            suggested_eden_product_links: JSON.stringify(blogPost.suggestedLinks),
            status: 'draft'
          });

          // Generate associated content
          const socialPosts = await this.generateSocialPosts(blogPost, blogId);
          const videoScripts = await this.generateVideoScripts(blogPost, blogId);
          const images = await this.generateImages(blogPost, blogId);

          generatedContent.push({
            blogId,
            blogPost,
            socialPosts,
            videoScripts,
            images,
            evergreenIdea: idea
          });

          console.log(`🌲 Evergreen content created for: ${idea.title_idea}`);
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

  async getContentForReview(status = 'draft', limit = 10) {
    console.log(`📋 Fetching content for review (status: ${status})`);
    
    try {
      const content = await db.getContentForReview(status, limit);
      console.log(`📋 Found ${content.length} content pieces for review`);
      
      return content;
    } catch (error) {
      console.error('❌ Error fetching content for review:', error.message);
      throw error;
    }
  }

  async updateContentStatus(contentId, contentType, status, finalContent = null) {
    console.log(`📝 Updating ${contentType} ${contentId} status to: ${status}`);
    
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

      await db.update(table, updateData, `${idField} = ?`, [contentId]);
      
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

  async getGenerationStats() {
    try {
      // Get detailed stats
      const detailedStats = await db.query(`
        SELECT 
          content_type,
          status,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM ssnews_generated_articles 
        WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY content_type, status, DATE(created_at)
        ORDER BY date DESC
      `);

      // Get total count
      const totalResult = await db.query(`
        SELECT COUNT(*) as total
        FROM ssnews_generated_articles
      `);

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