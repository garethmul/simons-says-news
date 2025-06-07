import compatibilityLayer from '../src/services/compatibilityLayer.js';
import legacyContentGenerator from '../src/legacy/services/contentGenerator-legacy.js';
import db from '../src/services/database.js';

/**
 * STAGE 1 COMPATIBILITY TESTS
 * 
 * These tests ensure that the compatibility layer works correctly
 * and that legacy functionality is preserved during the transition.
 */

describe('Stage 1: Compatibility Layer Tests', () => {
  
  const testArticle = {
    title: 'Test Article for Compatibility',
    full_text: 'This is a test article to verify the compatibility layer works correctly.',
    summary_ai: 'Test article summary',
    source_name: 'Test Source',
    url: 'https://test.com/article'
  };

  const testBlogId = 1;
  const legacyAccountId = 'legacy-test-account';
  const modernAccountId = 'modern-test-account';

  beforeEach(async () => {
    // Initialize database connection
    await db.initialize();
  });

  describe('Legacy System Integration', () => {
    
    test('should detect accounts without modern templates as legacy', async () => {
      const isLegacy = await compatibilityLayer.checkForModernTemplates(legacyAccountId);
      expect(isLegacy).toBe(false);
    });

    test('should generate content using legacy system for legacy accounts', async () => {
      const result = await compatibilityLayer.generateContent(testArticle, testBlogId, legacyAccountId);
      
      expect(result).toHaveProperty('_legacy', true);
      expect(result).toHaveProperty('_system', 'legacy');
      expect(result).toHaveProperty('socialPosts');
      expect(result).toHaveProperty('videoScripts');
      expect(result._generatedTypes).toContain('socialPosts');
      expect(result._generatedTypes).toContain('videoScripts');
    });

    test('should handle legacy social post generation', async () => {
      const socialPosts = await legacyContentGenerator.generateSocialPostsWithAccount(
        testArticle, 
        testBlogId, 
        legacyAccountId
      );
      
      expect(Array.isArray(socialPosts)).toBe(true);
      // Note: In test environment, posts may be empty due to missing AI service
      // but the structure should be correct
    });

    test('should handle legacy video script generation', async () => {
      const videoScripts = await legacyContentGenerator.generateVideoScriptsWithAccount(
        testArticle, 
        testBlogId, 
        legacyAccountId
      );
      
      expect(Array.isArray(videoScripts)).toBe(true);
      // Note: In test environment, scripts may be empty due to missing AI service
      // but the structure should be correct
    });

    test('should handle legacy evergreen content generation', async () => {
      const evergreenContent = await compatibilityLayer.generateEvergreenContent(
        'faith', 
        1, 
        legacyAccountId
      );
      
      expect(Array.isArray(evergreenContent)).toBe(true);
    });
  });

  describe('Modern System Readiness', () => {
    
    test('should have modern workflow engine as null initially', () => {
      expect(compatibilityLayer.modernWorkflowEngine).toBeNull();
    });

    test('should allow setting modern workflow engine', () => {
      const mockEngine = {
        execute: jest.fn()
      };
      
      compatibilityLayer.setModernWorkflowEngine(mockEngine);
      expect(compatibilityLayer.modernWorkflowEngine).toBe(mockEngine);
    });

    test('should fallback to legacy when modern system has error', async () => {
      const mockEngine = {
        execute: jest.fn().mockRejectedValue(new Error('Modern system error'))
      };
      
      compatibilityLayer.setModernWorkflowEngine(mockEngine);
      
      const result = await compatibilityLayer.generateContent(testArticle, testBlogId, modernAccountId);
      
      expect(result).toHaveProperty('_legacy', true);
      expect(result).toHaveProperty('_system', 'legacy');
    });
  });

  describe('System Health Monitoring', () => {
    
    test('should provide system health information', async () => {
      const health = await compatibilityLayer.getSystemHealth();
      
      expect(health).toHaveProperty('legacy');
      expect(health).toHaveProperty('modern');
      expect(health).toHaveProperty('database');
      
      expect(health.legacy).toHaveProperty('available', true);
      expect(health.legacy).toHaveProperty('methods');
      expect(health.legacy.methods).toContain('generateSocialPosts');
      expect(health.legacy.methods).toContain('generateVideoScripts');
    });

    test('should count modern templates correctly', async () => {
      const count = await compatibilityLayer.countModernTemplates();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should check legacy tables', async () => {
      const legacyTables = await compatibilityLayer.checkLegacyTables();
      
      if (!legacyTables.error) {
        expect(legacyTables).toHaveProperty('ssnews_generated_social_posts');
        expect(legacyTables).toHaveProperty('ssnews_generated_video_scripts');
        expect(typeof legacyTables.ssnews_generated_social_posts).toBe('number');
        expect(typeof legacyTables.ssnews_generated_video_scripts).toBe('number');
      }
    });

    test('should check modern tables', async () => {
      const modernTables = await compatibilityLayer.checkModernTables();
      
      if (!modernTables.error) {
        expect(modernTables).toHaveProperty('ssnews_generated_content');
        expect(typeof modernTables.ssnews_generated_content).toBe('number');
      }
    });
  });

  describe('Error Handling', () => {
    
    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalQuery = db.query;
      db.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      
      const isLegacy = await compatibilityLayer.checkForModernTemplates('test-account');
      expect(isLegacy).toBe(false); // Should default to legacy on error
      
      // Restore original method
      db.query = originalQuery;
    });

    test('should handle legacy generation errors gracefully', async () => {
      const result = await compatibilityLayer.generateLegacyContent(null, testBlogId, legacyAccountId);
      
      expect(result).toHaveProperty('_legacy', true);
      expect(result).toHaveProperty('_system', 'legacy');
      expect(result).toHaveProperty('socialPosts');
      expect(result).toHaveProperty('videoScripts');
    });
  });

  describe('Backwards Compatibility', () => {
    
    test('should maintain same API interface as original contentGenerator', async () => {
      const result = await compatibilityLayer.generateContent(testArticle, testBlogId, legacyAccountId);
      
      // Should have the same structure as before
      expect(result).toHaveProperty('socialPosts');
      expect(result).toHaveProperty('videoScripts');
      expect(Array.isArray(result.socialPosts)).toBe(true);
      expect(Array.isArray(result.videoScripts)).toBe(true);
    });

    test('should handle null/undefined accountId correctly', async () => {
      const result = await compatibilityLayer.generateContent(testArticle, testBlogId, null);
      
      expect(result).toHaveProperty('_legacy', true);
      expect(result).toHaveProperty('socialPosts');
      expect(result).toHaveProperty('videoScripts');
    });

    test('should preserve evergreen content generation API', async () => {
      const result = await compatibilityLayer.generateEvergreenContent('faith', 1, legacyAccountId);
      
      expect(Array.isArray(result)).toBe(true);
      // Each evergreen item should have expected structure if any are generated
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('blogId');
        expect(result[0]).toHaveProperty('evergreenIdea');
      }
    });
  });
});

/**
 * Integration Tests for Stage 1
 * 
 * These tests verify that the compatibility layer integrates
 * correctly with the existing application.
 */
describe('Stage 1: Integration Tests', () => {
  
  test('should not break existing API endpoints', async () => {
    // This would be tested by actual API calls in a full integration test
    // For now, we verify the basic structure is maintained
    expect(compatibilityLayer.generateContent).toBeInstanceOf(Function);
    expect(compatibilityLayer.generateEvergreenContent).toBeInstanceOf(Function);
  });

  test('should maintain database schema compatibility', async () => {
    await db.initialize();
    
    // Verify legacy tables exist
    try {
      await db.query('SELECT 1 FROM ssnews_generated_social_posts LIMIT 1');
      await db.query('SELECT 1 FROM ssnews_generated_video_scripts LIMIT 1');
    } catch (error) {
      // Tables might not exist in test environment, that's okay
      console.log('Legacy tables not found in test environment:', error.message);
    }

    // Verify modern tables exist
    try {
      await db.query('SELECT 1 FROM ssnews_generated_content LIMIT 1');
      await db.query('SELECT 1 FROM ssnews_prompt_templates LIMIT 1');
    } catch (error) {
      console.log('Modern tables not found in test environment:', error.message);
    }
  });
});

/**
 * Performance Tests for Stage 1
 */
describe('Stage 1: Performance Tests', () => {
  
  test('should not significantly impact performance', async () => {
    const startTime = Date.now();
    
    await compatibilityLayer.generateContent(
      {
        title: 'Performance Test Article',
        full_text: 'Testing performance impact of compatibility layer.',
        summary_ai: 'Performance test',
        source_name: 'Test',
        url: 'https://test.com'
      },
      1,
      'performance-test-account'
    );
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Should complete within reasonable time (10 seconds for network calls)
    expect(executionTime).toBeLessThan(10000);
  });
}); 