// ADE Compiler Agent - Single Source of Truth for APML→Vue Compilation
// Based on proven Zenjin production architecture

const PatternVueCompiler = require('../compiler/pattern-vue-compiler');
const Anthropic = require('@anthropic-ai/sdk');

class CompilerAgent {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    
    this.patternCompiler = new PatternVueCompiler();
    this.compilationHistory = new Map();
    this.knownPatterns = new Set(Object.keys(this.patternCompiler.patterns));
    
    // Compilation statistics
    this.stats = {
      totalCompilations: 0,
      automaticCompilations: 0, 
      manualCompilations: 0,
      errors: 0,
      successRate: 100
    };
  }

  /**
   * Main compilation pipeline - SINGLE AGENT RESPONSIBILITY
   * 1. Validate APML
   * 2. Try PatternVueCompiler (automatic)
   * 3. Use Claude Sonnet 4 for gaps (manual)
   * 4. Ensure consistency
   */
  async compileAPML(apmlContent, sessionId = null) {
    console.log('🔧 [COMPILER AGENT] Starting compilation pipeline...');
    
    try {
      // Step 1: Validate and fix APML first
      const validatedAPML = await this.validateAndFixAPML(apmlContent);
      
      // Step 2: Analyze what patterns we can handle automatically
      const analysis = this.analyzePatterns(validatedAPML);
      
      // Step 3: Use PatternVueCompiler for known patterns
      let vueCode = '';
      if (analysis.hasKnownPatterns) {
        console.log('✅ [COMPILER AGENT] Using PatternVueCompiler for known patterns');
        vueCode = this.patternCompiler.compile(validatedAPML);
        this.stats.automaticCompilations++;
      }
      
      // Step 4: Use Claude Sonnet 4 for unknown patterns (if needed)
      if (analysis.hasUnknownPatterns) {
        console.log('🤖 [COMPILER AGENT] Using Claude Sonnet 4 for unknown patterns');
        vueCode = await this.enhanceWithClaudeCompilation(validatedAPML, vueCode, analysis);
        this.stats.manualCompilations++;
      }
      
      // Step 5: Final consistency check
      const finalCode = this.ensureConsistency(vueCode);
      
      // Step 6: Update statistics
      this.updateStats(true);
      
      // Step 7: Cache compilation for consistency
      if (sessionId) {
        this.compilationHistory.set(sessionId, {
          apml: validatedAPML,
          vue: finalCode,
          timestamp: Date.now(),
          patterns: analysis
        });
      }
      
      console.log('✅ [COMPILER AGENT] Compilation successful');
      return {
        success: true,
        vueCode: finalCode,
        apml: validatedAPML,
        analysis: analysis,
        stats: this.getStats()
      };
      
    } catch (error) {
      console.error('❌ [COMPILER AGENT] Compilation failed:', error);
      this.updateStats(false, error.message);
      
      return {
        success: false,
        error: error.message,
        apml: apmlContent,
        stats: this.getStats()
      };
    }
  }

  /**
   * Step 1: APML Validation and Fixing
   * Based on Zenjin pattern - always fix APML before compilation
   */
  async validateAndFixAPML(apmlContent) {
    console.log('🔍 [COMPILER AGENT] Validating APML...');
    
    try {
      // Basic validation
      if (!apmlContent || apmlContent.trim().length === 0) {
        throw new Error('Empty APML content provided');
      }
      
      // Try to parse with existing parser
      const testParse = this.patternCompiler.parseAPML(apmlContent);
      
      // Check for common issues
      const issues = this.detectAPMLIssues(apmlContent);
      
      if (issues.length === 0) {
        console.log('✅ [COMPILER AGENT] APML validation passed');
        return apmlContent;
      }
      
      // Fix APML issues using Claude
      console.log('🔧 [COMPILER AGENT] Fixing APML issues:', issues);
      const fixedAPML = await this.fixAPMLWithClaude(apmlContent, issues);
      
      console.log('✅ [COMPILER AGENT] APML fixed successfully');
      return fixedAPML;
      
    } catch (error) {
      console.error('❌ [COMPILER AGENT] APML validation failed:', error);
      throw new Error(`APML Validation Failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Pattern Analysis
   * Determine what can be compiled automatically vs manually
   */
  analyzePatterns(apmlContent) {
    console.log('📊 [COMPILER AGENT] Analyzing patterns...');
    
    const analysis = {
      hasKnownPatterns: false,
      hasUnknownPatterns: false,
      knownPatternsList: [],
      unknownPatternsList: [],
      compilationStrategy: 'automatic'
    };
    
    try {
      // Check for known patterns in APML content
      const availablePatterns = Object.keys(this.patternCompiler.patterns);
      
      availablePatterns.forEach(pattern => {
        if (apmlContent.includes(pattern) || 
            apmlContent.includes(pattern.replace('_', ' ')) ||
            this.hasSemanticMatch(apmlContent, pattern)) {
          analysis.knownPatternsList.push(pattern);
          analysis.hasKnownPatterns = true;
        }
      });
      
      // Check for form-related keywords that map to form_input
      if (this.hasFormElements(apmlContent) && !analysis.knownPatternsList.includes('form_input')) {
        analysis.knownPatternsList.push('form_input');
        analysis.hasKnownPatterns = true;
      }
      
      // If we found some known patterns but content suggests more complexity
      if (analysis.hasKnownPatterns && this.hasComplexElements(apmlContent)) {
        analysis.hasUnknownPatterns = true;
        analysis.unknownPatternsList.push('complex_elements');
      }
      
      // If no known patterns found, treat as unknown
      if (!analysis.hasKnownPatterns) {
        analysis.hasUnknownPatterns = true;
        analysis.unknownPatternsList.push('unknown_structure');
      }
      
      // Determine strategy
      if (analysis.hasUnknownPatterns && !analysis.hasKnownPatterns) {
        analysis.compilationStrategy = 'manual_only';
      } else if (analysis.hasKnownPatterns && analysis.hasUnknownPatterns) {
        analysis.compilationStrategy = 'hybrid';
      } else if (analysis.hasKnownPatterns) {
        analysis.compilationStrategy = 'automatic';
      }
      
      console.log('📊 [COMPILER AGENT] Pattern analysis complete:', {
        strategy: analysis.compilationStrategy,
        known: analysis.knownPatternsList.length,
        unknown: analysis.unknownPatternsList.length
      });
      
      return analysis;
      
    } catch (error) {
      console.error('❌ [COMPILER AGENT] Pattern analysis failed:', error);
      // Fallback to manual compilation
      analysis.hasUnknownPatterns = true;
      analysis.compilationStrategy = 'manual_only';
      return analysis;
    }
  }

  /**
   * Step 4: Enhanced compilation with Claude Sonnet 4
   * Used for unknown patterns or hybrid approach
   */
  async enhanceWithClaudeCompilation(apmlContent, baseVueCode, analysis) {
    console.log('🤖 [COMPILER AGENT] Using Claude Sonnet 4 for unknown patterns...');
    
    const prompt = this.buildClaudeCompilationPrompt(apmlContent, baseVueCode, analysis);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: this.getCompilerAgentSystemPrompt(),
        messages: [{ role: 'user', content: prompt }]
      });
      
      const claudeCode = response.content[0].text;
      
      // Extract just the Vue code if Claude added extra text
      const vueCodeMatch = claudeCode.match(/<!DOCTYPE html>[\s\S]*<\/html>/);
      return vueCodeMatch ? vueCodeMatch[0] : claudeCode;
      
    } catch (error) {
      console.error('❌ [COMPILER AGENT] Claude compilation failed:', error);
      // Fallback to base code or error
      if (baseVueCode) {
        console.log('⚠️ [COMPILER AGENT] Using base PatternVueCompiler output as fallback');
        return baseVueCode;
      }
      throw error;
    }
  }

  /**
   * Claude Sonnet 4 System Prompt for Compilation Agent
   */
  getCompilerAgentSystemPrompt() {
    return `You are THE COMPILER AGENT for ADE. Your ONLY job is APML→Vue compilation.

CRITICAL RULES:
1. NEVER change existing working patterns - only ENHANCE them
2. Use consistent variable names with existing components  
3. Follow the existing design system and styling approach
4. Generate complete, working Vue 3 Composition API code
5. Include proper TypeScript types where needed
6. Ensure mobile-responsive design
7. Add accessibility attributes (aria-*, role, etc.)

EXISTING PATTERN VARIABLES (use these exactly):
- Data: appTitle, user_name, user_description, current_view
- Methods: submitForm, handleClick, nextStep, previousStep
- Classes: app-container, component, btn, btn-primary, modal-overlay
- Colors: #0a0a0a (background), #00ff88 (primary), #ffffff (text)

OUTPUT: Complete HTML with Vue 3 + embedded CSS + JavaScript
QUALITY: Production-ready, error-free, consistent with existing patterns`;
  }

  /**
   * Build compilation prompt for Claude
   */
  buildClaudeCompilationPrompt(apmlContent, baseVueCode, analysis) {
    let prompt = `Compile this APML to Vue 3 application:\n\n${apmlContent}\n\n`;
    
    if (baseVueCode) {
      prompt += `EXISTING BASE CODE (enhance, don't replace):\n${baseVueCode.substring(0, 1000)}...\n\n`;
    }
    
    if (analysis.unknownPatternsList.length > 0) {
      prompt += `FOCUS ON THESE UNKNOWN PATTERNS:\n${analysis.unknownPatternsList.join(', ')}\n\n`;
    }
    
    prompt += `Generate a complete Vue 3 application following the existing design patterns and variable naming conventions.`;
    
    return prompt;
  }

  /**
   * Step 5: Ensure final consistency
   */
  ensureConsistency(vueCode) {
    console.log('🔧 [COMPILER AGENT] Ensuring final consistency...');
    
    // Basic consistency checks and fixes
    let consistentCode = vueCode;
    
    // Ensure proper Vue 3 syntax
    consistentCode = consistentCode.replace(/vue@2/g, 'vue@3');
    
    // Ensure consistent variable naming (basic patterns)
    consistentCode = consistentCode.replace(/\bappName\b/g, 'appTitle');
    
    // Ensure consistent CSS classes
    consistentCode = consistentCode.replace(/\bprimary-btn\b/g, 'btn btn-primary');
    
    return consistentCode;
  }

  /**
   * Detect common APML issues
   */
  detectAPMLIssues(apmlContent) {
    const issues = [];
    
    // Check for missing sections
    if (!apmlContent.includes('## UI Components') && !apmlContent.includes('ui_components:')) {
      issues.push('Missing UI Components section');
    }
    
    // Check for malformed component definitions
    if (apmlContent.includes('type:') && !apmlContent.includes('{')) {
      issues.push('Malformed component definitions - missing braces');
    }
    
    // Check for inconsistent indentation
    const lines = apmlContent.split('\n');
    let hasInconsistentIndentation = false;
    lines.forEach(line => {
      if (line.trim().length > 0 && line.startsWith('  ') && line.includes(':') && !line.includes('  ')) {
        hasInconsistentIndentation = true;
      }
    });
    
    if (hasInconsistentIndentation) {
      issues.push('Inconsistent indentation');
    }
    
    return issues;
  }

  /**
   * Fix APML with Claude assistance
   */
  async fixAPMLWithClaude(apmlContent, issues) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', 
      max_tokens: 2000,
      system: 'You are an APML syntax expert. Fix the provided APML content to resolve the listed issues. Return only the corrected APML, no explanations.',
      messages: [{
        role: 'user',
        content: `Fix these APML issues: ${issues.join(', ')}\n\nAPML Content:\n${apmlContent}`
      }]
    });
    
    return response.content[0].text.trim();
  }

  /**
   * Update compilation statistics
   */
  updateStats(success, errorMessage = null) {
    this.stats.totalCompilations++;
    if (!success) {
      this.stats.errors++;
    }
    this.stats.successRate = Math.round(((this.stats.totalCompilations - this.stats.errors) / this.stats.totalCompilations) * 100);
  }

  /**
   * Get compilation statistics
   */
  getStats() {
    return {
      ...this.stats,
      automaticPercentage: Math.round((this.stats.automaticCompilations / this.stats.totalCompilations) * 100) || 0,
      manualPercentage: Math.round((this.stats.manualCompilations / this.stats.totalCompilations) * 100) || 0
    };
  }

  /**
   * Get compilation history for debugging
   */
  getCompilationHistory(sessionId) {
    return this.compilationHistory.get(sessionId) || null;
  }

  /**
   * Check if APML content has semantic match with known patterns
   */
  hasSemanticMatch(apmlContent, pattern) {
    const semanticMatches = {
      'form_input': ['form', 'input', 'field', 'submit', 'login', 'register'],
      'modal_dialog': ['modal', 'popup', 'dialog', 'overlay'],
      'data_table': ['table', 'grid', 'data', 'rows', 'columns'],
      'wizard_component': ['wizard', 'step', 'multi-step', 'progress'],
      'action_list': ['menu', 'navigation', 'actions', 'buttons'],
      // New production-critical patterns
      'adaptive_input': ['device', 'adaptive', 'touch', 'mouse', 'keyboard', 'responsive'],
      'math_expression': ['math', 'equation', 'expression', 'variable', 'operator', 'latex'],
      'auto_advance_input': ['auto-advance', 'progressive', 'sequence', 'step-by-step'],
      'store_connected': ['store', 'state', 'pinia', 'vuex', 'reactive', 'computed'],
      'vue_router': ['router', 'route', 'navigation', 'page', 'view', 'component']
    };
    
    const keywords = semanticMatches[pattern] || [];
    return keywords.some(keyword => 
      apmlContent.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if APML has form elements
   */
  hasFormElements(apmlContent) {
    const formKeywords = ['fields:', 'input', 'submit', 'form', 'username', 'password', 'email'];
    return formKeywords.some(keyword => 
      apmlContent.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if APML has complex elements needing manual compilation
   */
  hasComplexElements(apmlContent) {
    const complexKeywords = ['custom', 'advanced', 'interactive', 'dynamic', 'api', 'websocket'];
    return complexKeywords.some(keyword => 
      apmlContent.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}

module.exports = CompilerAgent;