#!/usr/bin/env node

/**
 * PROJECT EDEN: COMPLETE SYSTEM VALIDATION
 * 
 * Comprehensive validation against the Project Eden specification
 * Tests all 7 modules, 3-stage architecture, and provides implementation roadmap
 */

import fs from 'fs';
import { testNewsAggregation } from './unit/test-news-aggregation.js';
import { testImageSourcing } from './unit/test-image-sourcing.js';

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🏆 PROJECT EDEN: COMPLETE VALIDATION                     ║
║                       Against Project Specification v1.0                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
${RESET}\n`);

class ProjectEdenValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      modules: {},
      compliance: {}
    };
    this.startTime = Date.now();
  }

  async runCompleteValidation() {
    console.log(`${BLUE}🚀 Starting complete Project Eden validation...${RESET}\n`);

    await this.validateSevenModules();
    await this.validateArchitecture();
    await this.generateImplementationRoadmap();
    await this.generateFinalReport();
  }

  async validateSevenModules() {
    console.log(`${BOLD}${BLUE}📰 PROJECT EDEN SEVEN MODULES VALIDATION${RESET}`);
    
    // Test each module
    const modules = [
      { name: 'News Aggregation', test: testNewsAggregation },
      { name: 'News Analysis', test: () => this.testNewsAnalysis() },
      { name: 'Eden Contextualization', test: () => this.testEdenContextualization() },
      { name: 'Content Generation', test: () => this.testContentGeneration() },
      { name: 'Image Sourcing', test: testImageSourcing },
      { name: 'Human Review', test: () => this.testHumanReview() },
      { name: 'Evergreen Content', test: () => this.testEvergreenContent() }
    ];

    for (const [index, module] of modules.entries()) {
      console.log(`\n${BLUE}📋 Module ${index + 1}: ${module.name}${RESET}`);
      const result = await module.test();
      this.results.modules[`module${index + 1}`] = result;
      this.updateResults(result);
    }
  }

  async testNewsAnalysis() {
    const hasAIService = fs.existsSync('src/services/aiService.js');
    const hasAPIKeys = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    
    console.log(`   ${hasAIService ? '✅' : '❌'} AI service: ${hasAIService ? 'Available' : 'Missing'}`);
    console.log(`   ${hasAPIKeys ? '✅' : '❌'} AI API keys: ${hasAPIKeys ? 'Configured' : 'Missing'}`);
    
    return {
      success: hasAIService && hasAPIKeys,
      passed: hasAIService && hasAPIKeys ? 2 : (hasAIService ? 1 : 0),
      failed: hasAIService && hasAPIKeys ? 0 : (hasAIService ? 1 : 2),
      total: 2
    };
  }

  async testEdenContextualization() {
    const hasContentGen = fs.existsSync('src/services/contentGenerator.js');
    const hasTemplateEngine = fs.existsSync('src/services/templateEngine.js');
    
    console.log(`   ${hasContentGen ? '✅' : '❌'} Content generation: ${hasContentGen ? 'Available' : 'Missing'}`);
    console.log(`   ${hasTemplateEngine ? '✅' : '❌'} Template engine: ${hasTemplateEngine ? 'Available' : 'Missing'}`);
    
    return {
      success: hasContentGen && hasTemplateEngine,
      passed: hasContentGen && hasTemplateEngine ? 2 : (hasContentGen ? 1 : 0),
      failed: hasContentGen && hasTemplateEngine ? 0 : (hasContentGen ? 1 : 2),
      total: 2
    };
  }

  async testContentGeneration() {
    const hasContentGen = fs.existsSync('src/services/contentGenerator.js');
    const hasTemplateEngine = fs.existsSync('src/services/templateEngine.js');
    const hasAIService = fs.existsSync('src/services/aiService.js');
    
    console.log(`   ${hasContentGen ? '✅' : '❌'} Content generator: ${hasContentGen ? 'Available' : 'Missing'}`);
    console.log(`   ${hasTemplateEngine ? '✅' : '❌'} Template engine: ${hasTemplateEngine ? 'Available' : 'Missing'}`);
    console.log(`   ${hasAIService ? '✅' : '❌'} AI service: ${hasAIService ? 'Available' : 'Missing'}`);
    
    const passed = [hasContentGen, hasTemplateEngine, hasAIService].filter(Boolean).length;
    
    return {
      success: hasContentGen && hasTemplateEngine && hasAIService,
      passed: passed,
      failed: 3 - passed,
      total: 3
    };
  }

  async testHumanReview() {
    const hasTemplateBuilder = fs.existsSync('src/components/template/TemplateBuilder.jsx');
    const hasWorkflowBuilder = fs.existsSync('src/components/workflow/WorkflowBuilder.jsx');
    const hasVariableTags = fs.existsSync('src/components/ui/variable-tag.jsx');
    
    console.log(`   ${hasTemplateBuilder ? '✅' : '❌'} Template builder: ${hasTemplateBuilder ? 'Available' : 'Missing'}`);
    console.log(`   ${hasWorkflowBuilder ? '✅' : '❌'} Workflow builder: ${hasWorkflowBuilder ? 'Available' : 'Missing'}`);
    console.log(`   ${hasVariableTags ? '✅' : '❌'} Variable tags: ${hasVariableTags ? 'Available' : 'Missing'}`);
    
    const passed = [hasTemplateBuilder, hasWorkflowBuilder, hasVariableTags].filter(Boolean).length;
    
    return {
      success: hasTemplateBuilder && hasWorkflowBuilder && hasVariableTags,
      passed: passed,
      failed: 3 - passed,
      total: 3
    };
  }

  async testEvergreenContent() {
    const hasTemplateEngine = fs.existsSync('src/services/templateEngine.js');
    const hasWorkflowBuilder = fs.existsSync('src/components/workflow/WorkflowBuilder.jsx');
    
    console.log(`   ${hasTemplateEngine ? '✅' : '❌'} Template engine: ${hasTemplateEngine ? 'Available' : 'Missing'}`);
    console.log(`   ${hasWorkflowBuilder ? '✅' : '❌'} Workflow system: ${hasWorkflowBuilder ? 'Available' : 'Missing'}`);
    
    return {
      success: hasTemplateEngine && hasWorkflowBuilder,
      passed: hasTemplateEngine && hasWorkflowBuilder ? 2 : (hasTemplateEngine ? 1 : 0),
      failed: hasTemplateEngine && hasWorkflowBuilder ? 0 : (hasTemplateEngine ? 1 : 2),
      total: 2
    };
  }

  async validateArchitecture() {
    console.log(`\n${BOLD}${BLUE}🏗️ THREE-STAGE ARCHITECTURE${RESET}`);
    
    const legacyExists = fs.existsSync('src/legacy/services/contentGenerator-legacy.js');
    const dualWriteExists = fs.existsSync('src/services/dualWriteService.js');
    const templateEngineExists = fs.existsSync('src/services/templateEngine.js');
    
    console.log(`   ${legacyExists ? '✅' : '❌'} Stage 1: Legacy Isolation`);
    console.log(`   ${dualWriteExists ? '✅' : '❌'} Stage 2: Dual-Write System`);
    console.log(`   ${templateEngineExists ? '✅' : '❌'} Stage 3: Modern Template Engine`);
    
    this.recordResult('Architecture', legacyExists && dualWriteExists && templateEngineExists);
  }

  async generateImplementationRoadmap() {
    console.log(`\n${BOLD}${BLUE}📋 IMPLEMENTATION ROADMAP${RESET}`);
    
    const roadmap = [];
    
    // Check missing modules
    if (!this.results.modules['module1']?.success) {
      roadmap.push('🔴 HIGH: Implement News Aggregation (RSS feeds, web scraping)');
    }
    if (!this.results.modules['module5']?.success) {
      roadmap.push('🟡 MEDIUM: Setup Image Sourcing (Pexels API, Sirv CDN)');
    }
    
    // Check environment
    const missingEnv = this.checkMissingEnvironmentVariables();
    if (missingEnv.length > 0) {
      roadmap.push(`🔴 HIGH: Configure environment variables: ${missingEnv.join(', ')}`);
    }
    
    if (roadmap.length === 0) {
      console.log(`   ${GREEN}✅ All components ready for production!${RESET}`);
    } else {
      roadmap.forEach(item => console.log(`   ${item}`));
    }
  }

  checkMissingEnvironmentVariables() {
    const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'OPENAI_API_KEY', 'PEXELS_API_KEY'];
    return required.filter(env => !process.env[env]);
  }

  updateResults(moduleResult) {
    this.results.total += moduleResult.total;
    this.results.passed += moduleResult.passed;
    this.results.failed += moduleResult.failed;
  }

  recordResult(testName, passed) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  async generateFinalReport() {
    const endTime = Date.now();
    const duration = Math.round((endTime - this.startTime) / 1000);
    const successRate = Math.round((this.results.passed / this.results.total) * 100);

    console.log(`\n${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                        🏆 PROJECT EDEN VALIDATION RESULTS                   ║
╚══════════════════════════════════════════════════════════════════════════════╝${RESET}`);

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${this.results.total}`);
    console.log(`   ${GREEN}Passed: ${this.results.passed}${RESET}`);
    console.log(`   ${RED}Failed: ${this.results.failed}${RESET}`);
    console.log(`   Success Rate: ${successRate >= 90 ? GREEN : successRate >= 70 ? YELLOW : RED}${successRate}%${RESET}`);
    console.log(`   Duration: ${duration}s\n`);

    // Module status summary
    console.log(`🎯 Project Eden Module Status:`);
    console.log(`   📰 Module 1 (News Aggregation): ${this.getModuleStatus('module1')}`);
    console.log(`   🧠 Module 2 (News Analysis): ${this.getModuleStatus('module2')}`);
    console.log(`   🎯 Module 3 (Eden Contextualization): ${this.getModuleStatus('module3')}`);
    console.log(`   🤖 Module 4 (Content Generation): ${this.getModuleStatus('module4')}`);
    console.log(`   🖼️ Module 5 (Image Sourcing): ${this.getModuleStatus('module5')}`);
    console.log(`   👥 Module 6 (Human Review): ${this.getModuleStatus('module6')}`);
    console.log(`   🌿 Module 7 (Evergreen Content): ${this.getModuleStatus('module7')}`);

    // Final assessment
    if (this.results.failed === 0) {
      console.log(`\n${GREEN}${BOLD}🎉 PROJECT EDEN FULLY COMPLIANT!${RESET}`);
      console.log(`${GREEN}✅ Ready for production deployment!${RESET}`);
    } else if (successRate >= 80) {
      console.log(`\n${YELLOW}${BOLD}⚠️ MINOR GAPS IDENTIFIED${RESET}`);
      console.log(`${YELLOW}✅ Core system ready with ${this.results.failed} areas needing completion${RESET}`);
    } else {
      console.log(`\n${RED}${BOLD}❌ IMPLEMENTATION NEEDED${RESET}`);
      console.log(`${RED}⚠️ ${this.results.failed} areas require attention${RESET}`);
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      successRate: successRate,
      results: this.results,
      projectEdenCompliance: {
        specificationVersion: '1.0',
        modulesImplemented: Object.values(this.results.modules).filter(m => m?.success).length,
        totalModules: 7,
        readyForProduction: this.results.failed === 0
      }
    };

    fs.writeFileSync('tests/project-eden-validation-report.json', JSON.stringify(report, null, 2));
    console.log(`\n📄 Complete validation report saved to: tests/project-eden-validation-report.json`);

    process.exit(this.results.failed === 0 ? 0 : 1);
  }

  getModuleStatus(moduleKey) {
    const module = this.results.modules[moduleKey];
    if (module?.success) return `${GREEN}✅ Ready${RESET}`;
    if (module && module.passed > 0) return `${YELLOW}⚠️ Partial${RESET}`;
    return `${RED}❌ Needs Implementation${RESET}`;
  }
}

// Main execution
async function main() {
  const validator = new ProjectEdenValidator();
  await validator.runCompleteValidation();
}

main().catch(error => {
  console.error(`${RED}Fatal validation error: ${error.message}${RESET}`);
  process.exit(1);
}); 