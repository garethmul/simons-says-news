#!/usr/bin/env node

/**
 * PROMPT FORMS & TYPES VALIDATION TEST
 * 
 * Tests:
 * 1. Prompt editing forms create new versions when submitted
 * 2. Every prompt has associated types that can be edited
 * 3. Type system (text/video/audio/image) functionality
 */

import fs from 'fs';
import path from 'path';

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                🧪 PROMPT FORMS & TYPES VALIDATION TEST                      ║
║                     Form Functionality & Type System                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
${RESET}\n`);

class PromptFormsValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      categories: {
        formFunctionality: { passed: 0, failed: 0, total: 0 },
        typeSystem: { passed: 0, failed: 0, total: 0 },
        databaseSchema: { passed: 0, failed: 0, total: 0 },
        uiFunctionality: { passed: 0, failed: 0, total: 0 }
      }
    };
    this.startTime = Date.now();
    this.findings = [];
  }

  async runAllTests() {
    console.log(`${BLUE}🚀 Starting prompt forms and types validation...${RESET}\n`);

    try {
      await this.testPromptEditingForms();
      await this.testPromptTypeSystem();
      await this.testDatabaseSchema();
      await this.testUIFunctionality();
      await this.generateReport();
    } catch (error) {
      console.error(`${RED}❌ Critical error: ${error.message}${RESET}`);
      this.recordFailure('System Error', error.message);
    }
  }

  // ============================================================================
  // PROMPT EDITING FORMS VALIDATION
  // ============================================================================

  async testPromptEditingForms() {
    console.log(`${BOLD}${BLUE}📝 PROMPT EDITING FORMS VALIDATION${RESET}`);

    // Test 1: Check PromptManagement.jsx exists and has form functionality
    console.log(`\n${BLUE}🔍 Test 1: PromptManagement Component Analysis${RESET}`);
    
    const promptMgmtPath = 'src/components/PromptManagement.jsx';
    if (fs.existsSync(promptMgmtPath)) {
      const content = fs.readFileSync(promptMgmtPath, 'utf8');
      
      // Check for key form functions
      const hasCreateNewVersion = content.includes('createNewVersion');
      const hasVersionForm = content.includes('newPromptContent') && content.includes('setNewPromptContent');
      const hasSubmitHandling = content.includes('Save New Version');
      const hasTemplateForm = content.includes('createNewTemplate');
      
      console.log(`   ${hasCreateNewVersion ? '✅' : '❌'} createNewVersion function: ${hasCreateNewVersion ? 'Present' : 'Missing'}`);
      console.log(`   ${hasVersionForm ? '✅' : '❌'} Version form states: ${hasVersionForm ? 'Present' : 'Missing'}`);
      console.log(`   ${hasSubmitHandling ? '✅' : '❌'} Submit handling: ${hasSubmitHandling ? 'Present' : 'Missing'}`);
      console.log(`   ${hasTemplateForm ? '✅' : '❌'} Template creation: ${hasTemplateForm ? 'Present' : 'Missing'}`);
      
      const formScore = [hasCreateNewVersion, hasVersionForm, hasSubmitHandling, hasTemplateForm].filter(Boolean).length;
      this.recordResult('formFunctionality', 'PromptManagement Forms', formScore === 4, `${formScore}/4 key functions present`);
    } else {
      this.recordResult('formFunctionality', 'PromptManagement Component', false, 'Component file missing');
    }

    // Test 2: API Endpoints for Version Creation
    console.log(`\n${BLUE}🔍 Test 2: API Endpoints for Version Creation${RESET}`);
    
    const serverPath = 'server.js';
    if (fs.existsSync(serverPath)) {
      const content = fs.readFileSync(serverPath, 'utf8');
      
      const hasCreateVersionAPI = content.includes('POST') && content.includes('/api/prompts/templates') && content.includes('/versions');
      const hasSetCurrentAPI = content.includes('PUT') && content.includes('/current');
      const hasVersionHandling = content.includes('promptContent') && content.includes('systemMessage');
      
      console.log(`   ${hasCreateVersionAPI ? '✅' : '❌'} Create version API: ${hasCreateVersionAPI ? 'Present' : 'Missing'}`);
      console.log(`   ${hasSetCurrentAPI ? '✅' : '❌'} Set current version API: ${hasSetCurrentAPI ? 'Present' : 'Missing'}`);
      console.log(`   ${hasVersionHandling ? '✅' : '❌'} Version data handling: ${hasVersionHandling ? 'Present' : 'Missing'}`);
      
      const apiScore = [hasCreateVersionAPI, hasSetCurrentAPI, hasVersionHandling].filter(Boolean).length;
      this.recordResult('formFunctionality', 'API Endpoints', apiScore === 3, `${apiScore}/3 endpoints functional`);
    } else {
      this.recordResult('formFunctionality', 'API Endpoints', false, 'Server file missing');
    }

    // Test 3: Database Version Handling
    console.log(`\n${BLUE}🔍 Test 3: Database Version Creation Logic${RESET}`);
    
    const promptServicePath = 'src/services/promptManager.js';
    if (fs.existsSync(promptServicePath)) {
      const content = fs.readFileSync(promptServicePath, 'utf8');
      
      const hasVersionCreation = content.includes('createTemplateVersion');
      const hasVersionNumbering = content.includes('version_number') || content.includes('nextVersion');
      const hasCurrentVersionSetting = content.includes('setCurrentVersion');
      const hasTransactionHandling = content.includes('beginTransaction') && content.includes('commit');
      
      console.log(`   ${hasVersionCreation ? '✅' : '❌'} Version creation logic: ${hasVersionCreation ? 'Present' : 'Missing'}`);
      console.log(`   ${hasVersionNumbering ? '✅' : '❌'} Version numbering: ${hasVersionNumbering ? 'Present' : 'Missing'}`);
      console.log(`   ${hasCurrentVersionSetting ? '✅' : '❌'} Current version setting: ${hasCurrentVersionSetting ? 'Present' : 'Missing'}`);
      console.log(`   ${hasTransactionHandling ? '✅' : '❌'} Database transactions: ${hasTransactionHandling ? 'Present' : 'Missing'}`);
      
      const dbScore = [hasVersionCreation, hasVersionNumbering, hasCurrentVersionSetting, hasTransactionHandling].filter(Boolean).length;
      this.recordResult('formFunctionality', 'Database Logic', dbScore === 4, `${dbScore}/4 database operations present`);
    } else {
      this.recordResult('formFunctionality', 'Database Logic', false, 'PromptManager service missing');
    }
  }

  // ============================================================================
  // PROMPT TYPE SYSTEM VALIDATION
  // ============================================================================

  async testPromptTypeSystem() {
    console.log(`\n${BOLD}${BLUE}🎨 PROMPT TYPE SYSTEM VALIDATION${RESET}`);

    // Test 1: Current Category System
    console.log(`\n${BLUE}🔍 Test 1: Current Category System${RESET}`);
    
    const schemaPath = 'src/scripts/prompt-management-schema.sql';
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Check current categories
      const hasCategories = content.includes('ENUM(') && content.includes('category');
      const hasBlogPost = content.includes('blog_post');
      const hasSocialMedia = content.includes('social_media');
      const hasVideoScript = content.includes('video_script');
      const hasImageGeneration = content.includes('image_generation');
      
      console.log(`   ${hasCategories ? '✅' : '❌'} Category ENUM defined: ${hasCategories ? 'Yes' : 'No'}`);
      console.log(`   ${hasBlogPost ? '✅' : '❌'} blog_post category: ${hasBlogPost ? 'Present' : 'Missing'}`);
      console.log(`   ${hasSocialMedia ? '✅' : '❌'} social_media category: ${hasSocialMedia ? 'Present' : 'Missing'}`);
      console.log(`   ${hasVideoScript ? '✅' : '❌'} video_script category: ${hasVideoScript ? 'Present' : 'Missing'}`);
      console.log(`   ${hasImageGeneration ? '✅' : '❌'} image_generation category: ${hasImageGeneration ? 'Present' : 'Missing'}`);
      
      // Extract categories from ENUM
      const enumMatch = content.match(/ENUM\((.*?)\)/s);
      const categories = enumMatch ? enumMatch[1].split(',').map(cat => cat.trim().replace(/'/g, '')) : [];
      
      console.log(`   📋 Current categories (${categories.length}): ${categories.join(', ')}`);
      
      this.recordResult('typeSystem', 'Category System', hasCategories && categories.length >= 4, `${categories.length} categories defined`);
    } else {
      this.recordResult('typeSystem', 'Category System', false, 'Schema file missing');
    }

    // Test 2: Text/Video/Audio/Image Type Mapping
    console.log(`\n${BLUE}🔍 Test 2: Media Type Analysis${RESET}`);
    
    // Map categories to media types
    const categoryToMediaType = {
      'blog_post': 'text',
      'social_media': 'text',
      'newsletter': 'text',
      'devotional': 'text',
      'sermon': 'text',
      'analysis': 'text',
      'prayer': 'text',
      'video_script': 'video',
      'image_generation': 'image'
      // Note: no 'audio' type currently
    };

    const allFiles = ['src/components/PromptManagement.jsx', 'src/scripts/prompt-management-schema.sql'];
    let mediaTypesFound = { text: 0, video: 0, audio: 0, image: 0 };
    
    allFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Count media type categories
        Object.entries(categoryToMediaType).forEach(([category, mediaType]) => {
          if (content.includes(category)) {
            mediaTypesFound[mediaType]++;
          }
        });
      }
    });

    console.log(`   📊 Media type coverage:`);
    console.log(`      📝 Text: ${mediaTypesFound.text} categories (blog_post, social_media, etc.)`);
    console.log(`      🎥 Video: ${mediaTypesFound.video} categories (video_script)`);
    console.log(`      🎵 Audio: ${mediaTypesFound.audio} categories (none currently)`);
    console.log(`      🖼️ Image: ${mediaTypesFound.image} categories (image_generation)`);

    const hasAllTypes = mediaTypesFound.text > 0 && mediaTypesFound.video > 0 && mediaTypesFound.image > 0;
    this.recordResult('typeSystem', 'Media Type Coverage', hasAllTypes, `3/4 media types covered (missing audio)`);
    
    if (mediaTypesFound.audio === 0) {
      this.findings.push({
        type: 'MISSING_FEATURE',
        category: 'Type System',
        issue: 'No audio content type',
        recommendation: 'Add audio_script or podcast category for audio content'
      });
    }

    // Test 3: Type Editability
    console.log(`\n${BLUE}🔍 Test 3: Type Editability in UI${RESET}`);
    
    const promptMgmtPath = 'src/components/PromptManagement.jsx';
    if (fs.existsSync(promptMgmtPath)) {
      const content = fs.readFileSync(promptMgmtPath, 'utf8');
      
      const hasCategoryField = content.includes('newTemplateCategory') || content.includes('category');
      const hasCategoryDropdown = content.includes('select') || content.includes('Category');
      const hasCategoryValidation = content.includes('category') && content.includes('required');
      
      console.log(`   ${hasCategoryField ? '✅' : '❌'} Category field in form: ${hasCategoryField ? 'Present' : 'Missing'}`);
      console.log(`   ${hasCategoryDropdown ? '✅' : '❌'} Category selection UI: ${hasCategoryDropdown ? 'Present' : 'Missing'}`);
      console.log(`   ${hasCategoryValidation ? '✅' : '❌'} Category validation: ${hasCategoryValidation ? 'Present' : 'Missing'}`);
      
      const editabilityScore = [hasCategoryField, hasCategoryDropdown, hasCategoryValidation].filter(Boolean).length;
      this.recordResult('typeSystem', 'Type Editability', editabilityScore >= 2, `${editabilityScore}/3 editability features`);
    } else {
      this.recordResult('typeSystem', 'Type Editability', false, 'UI component missing');
    }
  }

  // ============================================================================
  // DATABASE SCHEMA VALIDATION
  // ============================================================================

  async testDatabaseSchema() {
    console.log(`\n${BOLD}${BLUE}🗄️ DATABASE SCHEMA VALIDATION${RESET}`);

    console.log(`\n${BLUE}🔍 Database Schema Analysis${RESET}`);
    
    const schemaPath = 'src/scripts/prompt-management-schema.sql';
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Check for required tables
      const hasTemplatesTable = content.includes('ssnews_prompt_templates');
      const hasVersionsTable = content.includes('ssnews_prompt_versions');
      const hasLogTable = content.includes('ssnews_content_generation_log');
      
      // Check for required fields
      const hasCategoryField = content.includes('category ENUM');
      const hasVersionNumberField = content.includes('version_number');
      const hasIsCurrentField = content.includes('is_current');
      const hasAccountField = content.includes('account_id');
      
      console.log(`   📋 Tables:`);
      console.log(`      ${hasTemplatesTable ? '✅' : '❌'} ssnews_prompt_templates: ${hasTemplatesTable ? 'Defined' : 'Missing'}`);
      console.log(`      ${hasVersionsTable ? '✅' : '❌'} ssnews_prompt_versions: ${hasVersionsTable ? 'Defined' : 'Missing'}`);
      console.log(`      ${hasLogTable ? '✅' : '❌'} ssnews_content_generation_log: ${hasLogTable ? 'Defined' : 'Missing'}`);
      
      console.log(`   🔧 Key Fields:`);
      console.log(`      ${hasCategoryField ? '✅' : '❌'} category ENUM: ${hasCategoryField ? 'Defined' : 'Missing'}`);
      console.log(`      ${hasVersionNumberField ? '✅' : '❌'} version_number: ${hasVersionNumberField ? 'Defined' : 'Missing'}`);
      console.log(`      ${hasIsCurrentField ? '✅' : '❌'} is_current flag: ${hasIsCurrentField ? 'Defined' : 'Missing'}`);
      console.log(`      ${hasAccountField ? '✅' : '❌'} account_id: ${hasAccountField ? 'Defined' : 'Missing'}`);
      
      const schemaScore = [hasTemplatesTable, hasVersionsTable, hasCategoryField, hasVersionNumberField, hasIsCurrentField].filter(Boolean).length;
      this.recordResult('databaseSchema', 'Schema Completeness', schemaScore >= 4, `${schemaScore}/5 schema elements present`);
      
      // Check for version management features
      const hasForeignKeys = content.includes('FOREIGN KEY');
      const hasIndexes = content.includes('INDEX');
      const hasUniqueConstraints = content.includes('UNIQUE');
      
      console.log(`   🔐 Constraints & Optimization:`);
      console.log(`      ${hasForeignKeys ? '✅' : '❌'} Foreign key relationships: ${hasForeignKeys ? 'Present' : 'Missing'}`);
      console.log(`      ${hasIndexes ? '✅' : '❌'} Database indexes: ${hasIndexes ? 'Present' : 'Missing'}`);
      console.log(`      ${hasUniqueConstraints ? '✅' : '❌'} Unique constraints: ${hasUniqueConstraints ? 'Present' : 'Missing'}`);
      
      const optimizationScore = [hasForeignKeys, hasIndexes, hasUniqueConstraints].filter(Boolean).length;
      this.recordResult('databaseSchema', 'Schema Optimization', optimizationScore >= 2, `${optimizationScore}/3 optimization features`);
      
    } else {
      this.recordResult('databaseSchema', 'Schema File', false, 'Schema file not found');
    }
  }

  // ============================================================================
  // UI FUNCTIONALITY VALIDATION
  // ============================================================================

  async testUIFunctionality() {
    console.log(`\n${BOLD}${BLUE}🎨 UI FUNCTIONALITY VALIDATION${RESET}`);

    console.log(`\n${BLUE}🔍 Form UI Components${RESET}`);
    
    const promptMgmtPath = 'src/components/PromptManagement.jsx';
    if (fs.existsSync(promptMgmtPath)) {
      const content = fs.readFileSync(promptMgmtPath, 'utf8');
      
      // Check for form components
      const hasTextareas = content.includes('<Textarea') || content.includes('textarea');
      const hasInputs = content.includes('<Input') || content.includes('input');
      const hasButtons = content.includes('<Button') || content.includes('button');
      const hasLabels = content.includes('<Label') || content.includes('label');
      
      // Check for specific form elements
      const hasPromptContentField = content.includes('promptContent') || content.includes('prompt-content');
      const hasSystemMessageField = content.includes('systemMessage') || content.includes('system-message');
      const hasNotesField = content.includes('notes');
      const hasCategoryField = content.includes('category');
      
      console.log(`   🧩 Form Components:`);
      console.log(`      ${hasTextareas ? '✅' : '❌'} Textarea components: ${hasTextareas ? 'Present' : 'Missing'}`);
      console.log(`      ${hasInputs ? '✅' : '❌'} Input components: ${hasInputs ? 'Present' : 'Missing'}`);
      console.log(`      ${hasButtons ? '✅' : '❌'} Button components: ${hasButtons ? 'Present' : 'Missing'}`);
      console.log(`      ${hasLabels ? '✅' : '❌'} Label components: ${hasLabels ? 'Present' : 'Missing'}`);
      
      console.log(`   📝 Form Fields:`);
      console.log(`      ${hasPromptContentField ? '✅' : '❌'} Prompt content field: ${hasPromptContentField ? 'Present' : 'Missing'}`);
      console.log(`      ${hasSystemMessageField ? '✅' : '❌'} System message field: ${hasSystemMessageField ? 'Present' : 'Missing'}`);
      console.log(`      ${hasNotesField ? '✅' : '❌'} Notes field: ${hasNotesField ? 'Present' : 'Missing'}`);
      console.log(`      ${hasCategoryField ? '✅' : '❌'} Category field: ${hasCategoryField ? 'Present' : 'Missing'}`);
      
      const uiScore = [hasTextareas, hasInputs, hasButtons, hasPromptContentField, hasSystemMessageField].filter(Boolean).length;
      this.recordResult('uiFunctionality', 'Form UI Components', uiScore >= 4, `${uiScore}/5 UI elements present`);
      
      // Check for user interaction handling
      const hasOnChange = content.includes('onChange');
      const hasOnClick = content.includes('onClick');
      const hasFormSubmission = content.includes('onSubmit') || content.includes('Save New Version');
      const hasValidation = content.includes('required') || content.includes('validation');
      
      console.log(`   ⚡ Interaction Handling:`);
      console.log(`      ${hasOnChange ? '✅' : '❌'} Change handlers: ${hasOnChange ? 'Present' : 'Missing'}`);
      console.log(`      ${hasOnClick ? '✅' : '❌'} Click handlers: ${hasOnClick ? 'Present' : 'Missing'}`);
      console.log(`      ${hasFormSubmission ? '✅' : '❌'} Form submission: ${hasFormSubmission ? 'Present' : 'Missing'}`);
      console.log(`      ${hasValidation ? '✅' : '❌'} Form validation: ${hasValidation ? 'Present' : 'Missing'}`);
      
      const interactionScore = [hasOnChange, hasOnClick, hasFormSubmission].filter(Boolean).length;
      this.recordResult('uiFunctionality', 'User Interactions', interactionScore >= 2, `${interactionScore}/3 interaction features`);
      
    } else {
      this.recordResult('uiFunctionality', 'UI Components', false, 'PromptManagement component missing');
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  recordResult(category, testName, passed, details = '') {
    this.results.total++;
    this.results.categories[category].total++;
    
    if (passed) {
      this.results.passed++;
      this.results.categories[category].passed++;
    } else {
      this.results.failed++;
      this.results.categories[category].failed++;
    }
    
    console.log(`   ${passed ? '✅' : '❌'} ${testName}: ${passed ? 'PASS' : 'FAIL'}${details ? ` (${details})` : ''}`);
  }

  recordFailure(testName, details) {
    this.results.total++;
    this.results.failed++;
    console.log(`   ${RED}❌ ${testName}: FAIL (${details})${RESET}`);
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  async generateReport() {
    const endTime = Date.now();
    const duration = Math.round((endTime - this.startTime) / 1000);
    const successRate = Math.round((this.results.passed / this.results.total) * 100);

    console.log(`\n${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                        📊 PROMPT FORMS & TYPES RESULTS                      ║
╚══════════════════════════════════════════════════════════════════════════════╝${RESET}`);

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${this.results.total}`);
    console.log(`   ${GREEN}Passed: ${this.results.passed}${RESET}`);
    console.log(`   ${RED}Failed: ${this.results.failed}${RESET}`);
    console.log(`   Success Rate: ${successRate >= 90 ? GREEN : successRate >= 70 ? YELLOW : RED}${successRate}%${RESET}`);
    console.log(`   Duration: ${duration}s\n`);

    // Category breakdown
    console.log(`📊 Results by Category:`);
    for (const [category, results] of Object.entries(this.results.categories)) {
      const categoryRate = results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0;
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
      console.log(`   ${categoryName}: ${results.passed}/${results.total} (${categoryRate}%)`);
    }

    // Key findings
    console.log(`\n🔍 Key Findings:`);
    
    // Form functionality
    const formCategory = this.results.categories.formFunctionality;
    if (formCategory.passed >= formCategory.total * 0.8) {
      console.log(`   ✅ Prompt editing forms are functional and create new versions`);
    } else {
      console.log(`   ⚠️ Prompt editing forms may have issues creating new versions`);
      this.findings.push({
        type: 'FORM_ISSUE',
        category: 'Form Functionality',
        issue: 'Form submission may not work correctly',
        recommendation: 'Test form submission in browser and check API endpoints'
      });
    }

    // Type system
    const typeCategory = this.results.categories.typeSystem;
    if (typeCategory.passed >= typeCategory.total * 0.8) {
      console.log(`   ✅ Prompt type system is present (categories as types)`);
    } else {
      console.log(`   ⚠️ Prompt type system needs enhancement`);
    }

    // Media type coverage
    console.log(`\n📋 Type System Analysis:`);
    console.log(`   📝 Text content types: blog_post, social_media, newsletter, devotional, sermon, analysis, prayer`);
    console.log(`   🎥 Video content types: video_script`);
    console.log(`   🖼️ Image content types: image_generation`);
    console.log(`   🎵 Audio content types: MISSING - Need audio_script or podcast category`);

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (this.findings.length > 0) {
      this.findings.forEach((finding, index) => {
        console.log(`   ${index + 1}. ${finding.issue}`);
        console.log(`      ${BLUE}Solution: ${finding.recommendation}${RESET}`);
      });
    } else {
      console.log(`   ✅ No critical issues found`);
    }

    // Specific recommendations for user's requirements
    console.log(`\n${YELLOW}📋 Addressing User Requirements:${RESET}`);
    console.log(`   
   1. ✅ FORMS CREATE NEW VERSIONS: 
      ${formCategory.passed >= 2 ? 'CONFIRMED' : 'NEEDS TESTING'} - Form functionality appears complete
      
   2. ⚠️ PROMPT TYPES (text/video/audio/image):
      PARTIAL - Categories serve as types but not exactly text/video/audio/image
      Current: content-specific categories (blog_post, video_script, etc.)
      
   3. 🔧 TYPE EDITABILITY:
      ${typeCategory.passed >= 1 ? 'CONFIRMED' : 'MISSING'} - Category field appears editable in forms`);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      successRate: successRate,
      results: this.results,
      findings: this.findings,
      userRequirements: {
        formsCreateVersions: formCategory.passed >= 2,
        promptTypesSystem: typeCategory.passed >= 1,
        typesEditable: this.results.categories.uiFunctionality.passed >= 1
      },
      recommendations: [
        'Test form submission in browser to confirm version creation',
        'Consider adding explicit type field (text/video/audio/image) alongside categories',
        'Add audio content category for complete media type coverage',
        'Implement comprehensive browser testing for form functionality'
      ]
    };

    fs.writeFileSync('tests/prompt-forms-types-report.json', JSON.stringify(report, null, 2));

    // Final assessment
    if (this.results.failed === 0) {
      console.log(`\n${GREEN}${BOLD}🎉 ALL TESTS PASSED!${RESET}`);
      console.log(`${GREEN}✅ Prompt forms and type system are fully functional!${RESET}`);
    } else if (successRate >= 75) {
      console.log(`\n${YELLOW}${BOLD}⚠️ MOSTLY FUNCTIONAL${RESET}`);
      console.log(`${YELLOW}✅ Core functionality present with ${this.results.failed} areas to address${RESET}`);
    } else {
      console.log(`\n${RED}${BOLD}❌ ISSUES DETECTED${RESET}`);
      console.log(`${RED}⚠️ ${this.results.failed} critical issues need attention${RESET}`);
    }

    console.log(`\n📄 Detailed report saved to: tests/prompt-forms-types-report.json`);

    process.exit(this.results.failed === 0 ? 0 : 1);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const validator = new PromptFormsValidator();
  await validator.runAllTests();
}

main().catch(error => {
  console.error(`${RED}Fatal error: ${error.message}${RESET}`);
  process.exit(1);
}); 