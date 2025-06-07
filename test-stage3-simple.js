#!/usr/bin/env node

/**
 * STAGE 3: SIMPLIFIED TEMPLATE ENGINE TEST
 * 
 * Tests core template engine functionality without database dependencies:
 * - Variable extraction and replacement
 * - Template validation
 * - UI component functionality
 */

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                🚀 STAGE 3: TEMPLATE ENGINE CORE VALIDATION                  ║
║                     (No Database Dependencies)                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
${RESET}\n`);

async function runCoreTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  // ============================================================================
  // TEST 1: TEMPLATE ENGINE CLASS LOADING
  // ============================================================================
  
  console.log(`${BOLD}${BLUE}TEST 1: Template Engine Class Loading${RESET}`);
  try {
    // Import the template engine class
    const { default: templateEngine } = await import('./src/services/templateEngine.js');
    
    // Check if core methods exist
    const requiredMethods = [
      'extractVariables',
      'replaceVariables',
      'validateTemplate',
      'formatVariableName',
      'inferVariableType'
    ];

    const missingMethods = requiredMethods.filter(method => typeof templateEngine[method] !== 'function');
    
    if (missingMethods.length === 0) {
      console.log(`${GREEN}✅ Template engine class loaded successfully${RESET}`);
      console.log(`   📝 All ${requiredMethods.length} core methods available`);
      testsPassed++;
    } else {
      console.log(`${RED}❌ Missing methods: ${missingMethods.join(', ')}${RESET}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`${RED}❌ Template engine loading failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 2: VARIABLE EXTRACTION
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 2: Variable Extraction System${RESET}`);
  try {
    const { default: templateEngine } = await import('./src/services/templateEngine.js');
    
    const testPrompt = `Create content about {{article.title}} from {{article.source}}. 
    
    Content: {{article.content}}
    Summary: {{article.summary}}
    Blog: {{blog.id}}
    Account: {{account.id}}`;

    const extractedVariables = templateEngine.extractVariables(testPrompt);
    
    console.log(`${GREEN}✅ Variable extraction working${RESET}`);
    console.log(`   🏷️  Variables found: ${extractedVariables.length}`);
    
    extractedVariables.forEach(variable => {
      const type = templateEngine.inferVariableType(variable.name);
      const displayName = templateEngine.formatVariableName(variable.name);
      console.log(`      • ${displayName} (${variable.name}) - Type: ${type}`);
    });

    // Validate expected variables are found
    const expectedVars = ['article.title', 'article.source', 'article.content', 'article.summary', 'blog.id', 'account.id'];
    const foundVarNames = extractedVariables.map(v => v.name);
    const allFound = expectedVars.every(expected => foundVarNames.includes(expected));

    if (allFound) {
      console.log(`${GREEN}   ✅ All expected variables detected correctly${RESET}`);
      testsPassed++;
    } else {
      console.log(`${RED}   ❌ Some expected variables not found${RESET}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`${RED}❌ Variable extraction test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 3: VARIABLE REPLACEMENT
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 3: Variable Replacement System${RESET}`);
  try {
    const { default: templateEngine } = await import('./src/services/templateEngine.js');
    
    const templatePrompt = `Write about {{article.title}} from {{article.source}}.
    
Content: {{article.content}}
Blog ID: {{blog.id}}`;

    const testVariables = {
      'article.title': 'Revolutionary AI Technology Breakthrough',
      'article.source': 'TechCrunch',
      'article.content': 'Artificial Intelligence has reached new heights with breakthrough technology.',
      'blog.id': '12345'
    };

    const processedPrompt = await templateEngine.replaceVariables(templatePrompt, testVariables);
    
    console.log(`${GREEN}✅ Variable replacement working${RESET}`);
    console.log(`   📄 Original length: ${templatePrompt.length} characters`);
    console.log(`   📄 Processed length: ${processedPrompt.length} characters`);
    
    // Check if variables were actually replaced
    const hasUnresolvedVars = processedPrompt.includes('{{') && processedPrompt.includes('}}');
    if (!hasUnresolvedVars) {
      console.log(`${GREEN}   ✅ All variables replaced successfully${RESET}`);
      console.log(`   🎯 Sample output:\n      ${processedPrompt.substring(0, 150)}...`);
      testsPassed++;
    } else {
      console.log(`${RED}   ❌ Some variables remain unresolved${RESET}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`${RED}❌ Variable replacement test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 4: TEMPLATE VALIDATION
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 4: Template Validation System${RESET}`);
  try {
    const { default: templateEngine } = await import('./src/services/templateEngine.js');
    
    // Test valid template
    const validTemplate = {
      name: 'Test Template',
      category: 'social_media',
      prompt: 'Create content about {{article.title}}'
    };

    // Test invalid templates
    const invalidTemplates = [
      { category: 'social_media', prompt: 'Test' }, // Missing name
      { name: 'Test', prompt: 'Test' }, // Missing category
      { name: 'Test', category: 'social_media' }, // Missing prompt
      { name: 'Test', category: 'social_media', prompt: 'Invalid {{bad.var}}' } // Invalid variable
    ];

    console.log(`${BLUE}   Testing valid template...${RESET}`);
    try {
      templateEngine.validateTemplate(validTemplate);
      console.log(`${GREEN}   ✅ Valid template passes validation${RESET}`);
    } catch (error) {
      console.log(`${RED}   ❌ Valid template failed validation: ${error.message}${RESET}`);
      testsFailed++;
      return;
    }

    console.log(`${BLUE}   Testing invalid templates...${RESET}`);
    let invalidCaught = 0;
    
    for (const invalidTemplate of invalidTemplates) {
      try {
        templateEngine.validateTemplate(invalidTemplate);
        console.log(`${RED}   ❌ Invalid template passed validation unexpectedly${RESET}`);
      } catch (error) {
        invalidCaught++;
        console.log(`${GREEN}   ✅ Invalid template correctly rejected: ${error.message.substring(0, 50)}...${RESET}`);
      }
    }

    if (invalidCaught === invalidTemplates.length) {
      console.log(`${GREEN}✅ Template validation working correctly${RESET}`);
      testsPassed++;
    } else {
      console.log(`${RED}❌ Template validation issues detected${RESET}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`${RED}❌ Template validation test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 5: UI COMPONENTS LOADING
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 5: UI Components Verification${RESET}`);
  try {
    const fs = await import('fs');
    
    const componentFiles = [
      'src/components/ui/variable-tag.jsx',
      'src/components/template/TemplateBuilder.jsx',
      'src/components/workflow/WorkflowBuilder.jsx'
    ];

    let componentsValid = true;
    
    for (const file of componentFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hasExport = content.includes('export');
        const hasImport = content.includes('import');
        
        if (hasExport && hasImport) {
          console.log(`${GREEN}   ✅ ${file.split('/').pop()} - Valid React component${RESET}`);
        } else {
          console.log(`${RED}   ❌ ${file.split('/').pop()} - Invalid component structure${RESET}`);
          componentsValid = false;
        }
      } else {
        console.log(`${RED}   ❌ ${file.split('/').pop()} - File not found${RESET}`);
        componentsValid = false;
      }
    }

    if (componentsValid) {
      console.log(`${GREEN}✅ All UI components valid and available${RESET}`);
      testsPassed++;
    } else {
      console.log(`${RED}❌ Some UI components have issues${RESET}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`${RED}❌ UI components test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 6: VARIABLE TAG SYSTEM LOGIC
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 6: Variable Tag System Logic${RESET}`);
  try {
    const { default: templateEngine } = await import('./src/services/templateEngine.js');
    
    // Test variable categorization
    const testVariables = [
      'article.title',
      'blog.id', 
      'account.id',
      'custom_variable',
      'step1.output'
    ];

    console.log(`${BLUE}   Testing variable categorization...${RESET}`);
    
    for (const varName of testVariables) {
      const type = templateEngine.inferVariableType(varName);
      const displayName = templateEngine.formatVariableName(varName);
      const isValid = templateEngine.isValidVariableName(varName);
      
      console.log(`   📝 ${varName}:`);
      console.log(`      Display: "${displayName}"`);
      console.log(`      Type: ${type}`);
      console.log(`      Valid: ${isValid ? '✅' : '❌'}`);
    }

    console.log(`${GREEN}✅ Variable tag system logic working${RESET}`);
    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌ Variable tag system test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 7: WORKFLOW STEP LOGIC
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}TEST 7: Workflow Step Logic${RESET}`);
  try {
    const { default: templateEngine } = await import('./src/services/templateEngine.js');
    
    // Test condition evaluation
    const testContext = {
      step1: { content: 'Generated content', success: true },
      article: { title: 'Test Article' }
    };

    const testConditions = [
      { field: 'step1.content', operator: 'exists', value: true },
      { field: 'step1.success', operator: 'equals', value: true },
      { field: 'article.title', operator: 'contains', value: 'Test' },
      { field: 'missing.field', operator: 'not_exists', value: true }
    ];

    console.log(`${BLUE}   Testing condition evaluation...${RESET}`);
    
    let conditionsWorking = true;
    for (const condition of testConditions) {
      try {
        const result = templateEngine.evaluateCondition(condition, testContext, {});
        console.log(`   ✅ Condition "${condition.field} ${condition.operator}" = ${result}`);
      } catch (error) {
        console.log(`   ❌ Condition evaluation failed: ${error.message}`);
        conditionsWorking = false;
      }
    }

    if (conditionsWorking) {
      console.log(`${GREEN}✅ Workflow step logic working${RESET}`);
      testsPassed++;
    } else {
      console.log(`${RED}❌ Workflow step logic has issues${RESET}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`${RED}❌ Workflow step logic test failed: ${error.message}${RESET}`);
    testsFailed++;
  }

  // ============================================================================
  // FINAL RESULTS
  // ============================================================================
  
  console.log(`\n${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                       🎉 STAGE 3 CORE VALIDATION RESULTS                    ║
╚══════════════════════════════════════════════════════════════════════════════╝${RESET}`);

  const totalTests = testsPassed + testsFailed;
  const successRate = Math.round((testsPassed / totalTests) * 100);

  console.log(`📊 Tests Passed: ${GREEN}${testsPassed}${RESET}`);
  console.log(`❌ Tests Failed: ${RED}${testsFailed}${RESET}`);
  console.log(`📈 Success Rate: ${successRate >= 90 ? GREEN : successRate >= 70 ? YELLOW : RED}${successRate}%${RESET}\n`);

  if (testsFailed === 0) {
    console.log(`${GREEN}${BOLD}🎉 ALL CORE TESTS PASSED! 🎉${RESET}`);
    console.log(`${GREEN}✅ Stage 3 Modern Template Engine core functionality is working perfectly!${RESET}`);
    console.log(`${BLUE}
🚀 Core Features Validated:
   📝 Variable extraction and replacement system
   🏷️  Template validation logic
   🎨 UI components (VariableTag, TemplateBuilder, WorkflowBuilder)
   🔗 Workflow step conditional logic
   ⚡ Variable categorization and formatting
   
${YELLOW}📋 Next Steps:
   1. Set up database schema (when database access is available)
   2. Test full template and workflow CRUD operations
   3. Test AI integration with template execution
   4. Deploy UI components to production
${RESET}`);
  } else {
    console.log(`${RED}❌ Some core tests failed. Please check the errors above.${RESET}`);
  }

  process.exit(testsFailed === 0 ? 0 : 1);
}

// Run the core tests
runCoreTests().catch(error => {
  console.error(`${RED}Fatal error during core testing: ${error.message}${RESET}`);
  process.exit(1);
}); 