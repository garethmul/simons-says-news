// Legacy Content Generator - Created by Stage 1 Migration

import db from '../../services/database.js';
import aiService from '../../services/aiService.js';
import imageService from '../../services/imageService.js';

/**
 * LEGACY CONTENT GENERATOR
 * 
 * This file contains legacy content generation methods that were content-specific.
 * These methods are preserved for backwards compatibility but should not be used
 * for new development. Use the modern workflow system instead.
 * 
 * Deprecated methods:
 * - generateSocialPosts / generateSocialPostsWithAccount
 * - generateVideoScripts / generateVideoScriptsWithAccount
 * - generatePrayerPointsWithAccount / generateGenericPrayerPoints / generateLegacyPrayerPoints
 * - parseSocialMediaContent / parseVideoScriptContent / parsePrayerPointsContent
 * - generateEvergreenContent
 */
class LegacyContentGenerator {
  constructor() {
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS) || 3;
  }

  // ============================================================================
  // LEGACY SOCIAL MEDIA GENERATION
  // ============================================================================

  async generateSocialPosts(article, blogId) {
    console.log('📱 [LEGACY] Generating social media posts...');
    
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
        console.log('✅ Successfully parsed AI response as JSON');
      } catch (parseError) {
        console.log('⚠️ AI response is not JSON, using fallback structure');
        console.log('Raw AI response:', socialContent.substring(0, 200) + '...');
        
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

  async generateSocialPostsWithAccount(article, blogId, accountId = null) {
    console.log('📱 [LEGACY] Generating social media posts with account context...');
    
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

  // ============================================================================
  // LEGACY VIDEO SCRIPT GENERATION
  // ============================================================================

  async generateVideoScripts(article, blogId) {
    console.log('🎬 [LEGACY] Generating video scripts...');
    
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

  async generateVideoScriptsWithAccount(article, blogId, accountId = null) {
    console.log('🎬 [LEGACY] Generating video scripts with account context...');
    
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

  // ============================================================================
  // LEGACY EVERGREEN CONTENT
  // ============================================================================

  async generateEvergreenContent(category, count = 1, accountId = null) {
    console.log(`🌲 [LEGACY] Generating evergreen content for category: ${category} (accountId: ${accountId})`);
    
    try {
      const evergreenIdeas = await db.getEvergreenIdeasByCategory(category);
      
      if (evergreenIdeas.length === 0) {
        console.log(`📝 No evergreen ideas found for category: ${category}`);
        return [];
      }

      const selectedIdeas = this.shuffleArray(evergreenIdeas).slice(0, count);
      const generatedContent = [];

      for (const idea of selectedIdeas) {
        try {
          console.log(`🌲 Generating content for: ${idea.title_idea} (accountId: ${accountId})`);

          const mockArticle = {
            title: idea.title_idea,
            full_text: `${idea.brief_description} This evergreen topic focuses on ${idea.target_keywords}.`,
            summary_ai: idea.brief_description,
            source_name: 'Evergreen Content',
            url: ''
          };
          
          const articleData = {
            based_on_evergreen_id: idea.evergreen_id,
            title: idea.title_idea,
            body_draft: 'Generating...',
            content_type: 'blog',
            word_count: 0,
            suggested_eden_product_links: JSON.stringify([]),
            status: 'draft'
          };

          const blogId = accountId 
            ? await db.insertWithAccount('ssnews_generated_articles', articleData, accountId)
            : await db.insert('ssnews_generated_articles', articleData);

          const blogPostContent = await aiService.generateBlogPost(mockArticle, blogId);
          
          let blogPost;
          try {
            blogPost = JSON.parse(blogPostContent);
          } catch {
            blogPost = {
              title: idea.title_idea,
              body: blogPostContent,
              suggestedLinks: []
            };
          }
          
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

          generatedContent.push({
            blogId,
            blogPost,
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

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

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
}

// Create singleton instance
const legacyContentGenerator = new LegacyContentGenerator();

export default legacyContentGenerator;
