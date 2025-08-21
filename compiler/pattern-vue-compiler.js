// Pattern-Based APML to Vue Compiler
// Reverse engineered from Vue target code

const SimpleAPMLParser = require('./simple-apml-parser');

class PatternVueCompiler {
  constructor() {
    this.patterns = {
      form_input: this.compileFormInput,
      text_area: this.compileFormInput,
      action_list: this.compileActionList,
      conditional_content: this.compileConditionalContent,
      modal_dialog: this.compileModalDialog,
      data_table: this.compileDataTable,
      wizard_component: this.compileWizardComponent,
      welcome_card: this.compileWelcomeCard,
      scenario_card: this.compileScenarioCard,
      followup_card: this.compileFollowupCard,
      breakthrough_card: this.compileBreakthroughCard,
      results_card: this.compileResultsCard,
      email_form: this.compileEmailForm,
      thrive_card: this.compileThriveCard,
      progress_bar: this.compileProgressBar,
      card_container: this.compileCardContainer,
      scrollable_panel: this.compileScrollablePanel,
      tabbed_panel: this.compileTabbedPanel
    };
  }

  compile(apmlContent) {
    const parser = new SimpleAPMLParser();
    const apml = parser.parse(apmlContent);
    
    // Extract components and their patterns
    const components = this.extractComponents(apml);
    const dataModel = this.extractDataModel(apml);
    const methods = this.extractMethods(apml);
    
    // Generate Vue app using patterns
    return this.generateVueApp(apml, components, dataModel, methods);
  }

  parseAPML(content) {
    // Enhanced APML parser for pattern-based compilation
    const apml = {
      app_configuration: {},
      data_model: {},
      ui_components: {},
      user_interactions: {},
      styling: {}
    };

    const lines = content.split('\n');
    let currentSection = null;
    let currentComponent = null;
    let currentObject = '';
    let braceDepth = 0;
    
    for (let line of lines) {
      line = line.trim();
      
      if (line.startsWith('##')) {
        currentSection = line.substring(2).trim().toLowerCase().replace(/\s+/g, '_');
        continue;
      }
      
      if (line.includes(': {') && currentSection === 'ui_components') {
        currentComponent = line.split(':')[0].trim();
        currentObject = line;
        braceDepth = 1;
        continue;
      }
      
      if (currentComponent && braceDepth > 0) {
        currentObject += '\n' + line;
        braceDepth += (line.match(/\{/g) || []).length;
        braceDepth -= (line.match(/\}/g) || []).length;
        
        if (braceDepth === 0) {
          try {
            apml.ui_components[currentComponent] = this.parseComponentObject(currentObject);
          } catch (e) {
            console.warn(`Failed to parse component ${currentComponent}:`, e);
          }
          currentComponent = null;
          currentObject = '';
        }
      }
    }
    
    return apml;
  }

  parseComponentObject(objectString) {
    // Simple object parser for component definitions
    try {
      // Convert pseudo-JSON to actual JSON
      const jsonString = objectString
        .replace(/([a-zA-Z_][a-zA-Z0-9_]*): \{/g, '"$1": {')
        .replace(/([a-zA-Z_][a-zA-Z0-9_]*): \[/g, '"$1": [')
        .replace(/([a-zA-Z_][a-zA-Z0-9_]*): "([^"]*)"(,?)/g, '"$1": "$2"$3')
        .replace(/([a-zA-Z_][a-zA-Z0-9_]*): ([^",\]\}]+)(,?)/g, '"$1": "$2"$3')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return JSON.parse(jsonString);
    } catch (e) {
      // Fallback to simple parsing
      return { type: 'unknown', raw: objectString };
    }
  }

  extractComponents(apml) {
    return Object.keys(apml.ui_components || {}).map(key => ({
      name: key,
      config: apml.ui_components[key]
    }));
  }

  extractDataModel(apml) {
    return apml.data_model?.app_state || {};
  }

  extractMethods(apml) {
    // Extract methods from user interactions
    const methods = {};
    
    // Add simple test method
    methods.testMethod = `testMethod() {
        console.log('Method called from Vue app');
      }`;
    
    return methods;
  }

  // Pattern Compilers
  compileFormInput(config) {
    let html = `<form @submit.prevent="${config.action || 'submitForm'}">`;
    
    // Check if this is a simple component definition
    if (config.type === 'text_area' && config.bind && config.placeholder) {
      html += `<textarea v-model="${config.bind}" placeholder="${config.placeholder}" rows="3"></textarea>`;
    } else if (config.elements && config.elements.length > 0) {
      config.elements.forEach(element => {
        switch (element.type) {
          case 'text_area':
            html += `<textarea v-model="${element.bind}" placeholder="${element.placeholder}" rows="${element.rows || 3}" ${element.required ? 'required' : ''}></textarea>`;
            break;
          case 'input':
            html += `<input v-model="${element.bind}" placeholder="${element.placeholder}" ${element.required ? 'required' : ''}>`;
            break;
          case 'button':
            html += `<button @click="${element.action}" :disabled="${element.disabled_when || 'false'}">${element.text}</button>`;
            break;
        }
      });
    }
    
    html += '</form>';
    return html;
  }

  compileActionList(config) {
    return `
      <div v-for="item in ${config.data_source}" :key="item.${config.key_field}" class="list-item">
        <span>{{ item.${config.display_field || 'text'} }}</span>
        ${config.actions?.map(action => 
          `<button @click="${action.action}(item.${config.key_field})">${action.text}</button>`
        ).join('') || ''}
      </div>
    `;
  }

  compileConditionalContent(config) {
    return `
      <div v-if="${config.condition}">
        ${this.compileElements(config.if_true?.elements || [])}
      </div>
      <div v-else>
        ${this.compileElements(config.if_false?.elements || [])}
      </div>
    `;
  }

  compileModalDialog(config) {
    return `
      <div v-if="${config.visible_when}" class="modal-overlay" @click="${config.overlay_click}">
        <div class="modal-content" @click.stop>
          <h3>{{ ${config.title} }}</h3>
          <div class="modal-body">{{ ${config.content} }}</div>
          <div class="modal-actions">
            ${config.actions?.map(action => 
              `<button @click="${action.action}" class="${action.style || 'secondary'}">${action.text}</button>`
            ).join('') || ''}
          </div>
        </div>
      </div>
    `;
  }

  compileDataTable(config) {
    return `
      <table>
        <thead>
          <tr>
            ${config.columns?.map(col => `<th>${col.label}</th>`).join('') || ''}
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in ${config.data_source}" :key="row.${config.key_field}">
            ${config.columns?.map(col => `<td>{{ row.${col.key} }}</td>`).join('') || ''}
          </tr>
        </tbody>
      </table>
    `;
  }

  compileWizardComponent(config) {
    return `
      <div class="wizard">
        <div class="steps">
          <div v-for="(step, index) in steps" :key="index" 
               :class="{ active: ${config.current_step} === index }">
            {{ step.title }}
          </div>
        </div>
        <div class="step-content">
          <component :is="steps[${config.current_step}].component" />
        </div>
        <div class="step-actions">
          <button @click="${config.navigation?.previous?.action || 'previousStep'}" 
                  :disabled="${config.navigation?.previous?.disabled_when || 'false'}">
            ${config.navigation?.previous?.text || 'Previous'}
          </button>
          <button @click="${config.navigation?.next?.action || 'nextStep'}" 
                  :disabled="${config.navigation?.next?.disabled_when || 'false'}">
            ${config.navigation?.next?.text || 'Next'}
          </button>
        </div>
      </div>
    `;
  }

  compileElements(elements) {
    return elements.map(element => {
      switch (element.type) {
        case 'heading':
          return `<h${element.level || 2}>${element.text}</h${element.level || 2}>`;
        case 'button':
          return `<button @click="${element.action}">${element.text}</button>`;
        case 'text':
          return `<p>${element.content}</p>`;
        default:
          return `<div>${element.text || element.content || ''}</div>`;
      }
    }).join('');
  }

  generateVueApp(apml, components, dataModel, methods) {
    const appName = apml.app_configuration?.name || apml.name || 'Generated App';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${appName}</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <style>
    ${this.generatePatternCSS()}
  </style>
</head>
<body>
  <div id="app">
    <div class="app-container">
      <h1>{{ appTitle }}</h1>
      ${this.generateComponentTemplates(components)}
    </div>
  </div>

  <script>
    // Wait for Vue to load
    function initApp() {
      if (typeof Vue === 'undefined') {
        setTimeout(initApp, 100);
        return;
      }
      
      const { createApp } = Vue;
      
      createApp({
        data() {
          return {
            appTitle: '${appName}',
            ${this.generateDataProperties(dataModel)}
          };
        },
        methods: {
          ${Object.values(methods).join(',\n')}
        },
        mounted() {
          console.log('${appName} loaded with pattern-based compilation');
        }
      }).mount('#app');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  </script>
</body>
</html>`;
  }

  generateComponentTemplates(components) {
    return components.map(component => {
      const pattern = this.patterns[component.config.type];
      if (pattern) {
        return `<div class="component ${component.name}" v-if="${component.config.visible_when || 'true'}">
          ${pattern.call(this, component.config)}
        </div>`;
      } else {
        return `<div class="component ${component.name}">
          <p>Component type '${component.config.type}' not yet implemented</p>
        </div>`;
      }
    }).join('\\n');
  }

  generateDataProperties(dataModel) {
    const properties = [];
    
    // Handle app_state properties
    if (dataModel.app_state) {
      Object.keys(dataModel.app_state).forEach(key => {
        const prop = dataModel.app_state[key];
        let defaultValue = prop.default || '';
        
        if (prop.type === 'array') {
          defaultValue = '[]';
        } else if (prop.type === 'object') {
          defaultValue = '{}';
        } else if (typeof defaultValue === 'string') {
          defaultValue = `"${defaultValue}"`;
        }
        
        properties.push(`${key}: ${defaultValue}`);
      });
    }
    
    // Handle other data model properties
    Object.keys(dataModel).forEach(key => {
      if (key !== 'app_state') {
        const prop = dataModel[key];
        let defaultValue = prop.default || '';
        
        if (prop.type === 'array') {
          defaultValue = '[]';
        } else if (prop.type === 'object') {
          defaultValue = '{}';
        } else if (typeof defaultValue === 'string') {
          defaultValue = `"${defaultValue}"`;
        }
        
        properties.push(`${key}: ${defaultValue}`);
      }
    });
    
    return properties.join(',\\n        ');
  }

  generatePatternCSS() {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0a0a0a;
        color: #ffffff;
        margin: 0;
        padding: 20px;
      }
      
      .app-container {
        max-width: 800px;
        margin: 0 auto;
      }
      
      .component {
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      
      /* Form Pattern Styles */
      form {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      textarea, input {
        padding: 12px;
        border: 1px solid #333;
        border-radius: 4px;
        background: #0a0a0a;
        color: #ffffff;
        font-family: inherit;
        font-size: 16px;
      }
      
      textarea {
        resize: vertical;
        min-height: 100px;
      }
      
      button {
        background: #00ff88;
        color: #000;
        border: none;
        padding: 12px 24px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 16px;
      }
      
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      button:hover:not(:disabled) {
        opacity: 0.9;
      }
      
      button.secondary {
        background: #333;
        color: #fff;
      }
      
      /* List Pattern Styles */
      .list-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #333;
      }
      
      .list-item:last-child {
        border-bottom: none;
      }
      
      /* Modal Pattern Styles */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      
      .modal-content {
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
      }
      
      .modal-actions {
        margin-top: 20px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      /* Table Pattern Styles */
      table {
        width: 100%;
        border-collapse: collapse;
      }
      
      th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #333;
      }
      
      th {
        background: #333;
        font-weight: 600;
      }
      
      h1 {
        color: #00ff88;
        text-align: center;
        margin-bottom: 30px;
      }
      
      h2, h3 {
        color: #00ff88;
        margin-bottom: 15px;
      }
    `;
  }

  // Pattern Compilers for specific components
  compileWelcomeCard(config) {
    return `
      <div class="welcome-card">
        <h1 class="welcome-title">${config.title}</h1>
        <h2 class="welcome-subtitle">${config.subtitle}</h2>
        <p class="welcome-description">${config.description}</p>
        <div class="welcome-meta">${config.meta_info}</div>
        <button @click="start_game" class="welcome-button">${config.action_text}</button>
      </div>
    `;
  }

  compileScenarioCard(config) {
    return `
      <div class="scenario-card">
        <h3 class="scenario-title">{{ ${config.title_bind} }}</h3>
        <p class="scenario-situation">{{ ${config.situation_bind} }}</p>
        <p class="scenario-question">{{ ${config.question_bind} }}</p>
        <div class="scenario-options">
          <div v-for="option in ${config.options_bind}" :key="option.id" 
               class="option-button" 
               @click="answer_first_question(option.id)">
            {{ option.text }}
          </div>
        </div>
      </div>
    `;
  }

  compileFollowupCard(config) {
    return `
      <div class="followup-card">
        <div class="previous-answer">
          <small>You chose: {{ ${config.previous_answer_bind} }}</small>
        </div>
        <p class="followup-question">{{ ${config.question_bind} }}</p>
        <div class="followup-options">
          <div v-for="option in ${config.options_bind}" :key="option.id" 
               class="option-button" 
               @click="answer_followup_question(option.id)">
            {{ option.text }}
          </div>
        </div>
      </div>
    `;
  }

  compileBreakthroughCard(config) {
    return `
      <div class="breakthrough-card">
        <h2 class="breakthrough-title">${config.title}</h2>
        <div class="breakthrough-analysis">
          <p>{{ ${config.pattern_analysis_bind} }}</p>
        </div>
        <div class="breakthrough-examples">
          <div v-for="gap in ${config.gap_examples_bind}" :key="gap.id" class="gap-example">
            <strong>{{ gap.scenario }}</strong>: {{ gap.description }}
          </div>
        </div>
        <p class="breakthrough-revelation">${config.revelation_text}</p>
        <button @click="show_results" class="breakthrough-button">${config.continue_text}</button>
      </div>
    `;
  }

  compileResultsCard(config) {
    return `
      <div class="results-card">
        <h2 class="results-title">${config.title}</h2>
        <div class="results-summary">
          <p>{{ ${config.summary_bind} }}</p>
        </div>
        <div class="results-insights">
          <div v-for="insight in ${config.pattern_insights_bind}" :key="insight.id" class="insight-item">
            <h4>{{ insight.title }}</h4>
            <p>{{ insight.description }}</p>
          </div>
        </div>
        <p class="results-next-steps">${config.next_steps_text}</p>
        <button @click="show_email_capture" class="results-button">Get Full Analysis</button>
      </div>
    `;
  }

  compileEmailForm(config) {
    return `
      <div class="email-form">
        <h3 class="email-title">${config.title}</h3>
        <p class="email-description">${config.description}</p>
        <form @submit.prevent="submit_email" class="email-form-container">
          <input v-model="user_email" 
                 type="email" 
                 placeholder="${config.placeholder}" 
                 class="email-input"
                 required>
          <button type="submit" class="email-button">${config.button_text}</button>
        </form>
        <small class="email-privacy">${config.privacy_note}</small>
      </div>
    `;
  }

  compileThriveCard(config) {
    return `
      <div class="thrive-card">
        <h2 class="thrive-title">${config.title}</h2>
        <p class="thrive-description">${config.description}</p>
        <div class="thrive-domains">
          <div v-for="domain in thrive_domains" :key="domain.letter" 
               class="domain-item"
               @click="select_domain(domain.letter)">
            <div class="domain-letter">{{ domain.letter }}</div>
            <div class="domain-info">
              <h4>{{ domain.name }}</h4>
              <p>{{ domain.description }}</p>
            </div>
          </div>
        </div>
        <p class="thrive-question">${config.question}</p>
      </div>
    `;
  }

  compileProgressBar(config) {
    return `
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" 
               :style="{ width: progress_percent + '%' }"></div>
        </div>
        <div class="progress-text">
          {{ ${config.current_step} }} of ${config.total_steps}
        </div>
      </div>
    `;
  }

  compileCardContainer(config) {
    const buttonsHTML = config.buttons?.map(button => {
      const conditionalAttr = button.conditional ? `v-if="${button.conditional === 'intent_detected' ? 'buildable_intent_detected' : button.conditional}"` : '';
      const tooltipAttr = button.tooltip ? `title="${button.tooltip}"` : '';
      return `<button class="btn btn-${button.style}" 
                      @click="${button.id === 'process_apml_button' ? 'generateProcessAPML' : 'generateSolutionAPML'}()" 
                      ${conditionalAttr} 
                      ${tooltipAttr}>
                ${button.text}
              </button>`;
    }).join('\\n          ') || '';

    return `
      <div class="card-container">
        <h2>${config.title}</h2>
        <p class="card-description">${config.description}</p>
        <div class="card-buttons">
          ${buttonsHTML}
        </div>
        <div class="feedback-area" v-if="feedback_message">
          {{ feedback_message }}
        </div>
      </div>
    `;
  }

  compileScrollablePanel(config) {
    return `
      <div class="scrollable-panel">
        <h2>${config.title}</h2>
        <div class="scrollable-content" id="conversationPanel">
          <div v-for="message in conversation_messages" :key="message.timestamp" 
               :class="'conversation-message ' + message.type">
            <div class="timestamp">{{ formatTime(message.timestamp) }}</div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
      </div>
    `;
  }

  compileTabbedPanel(config) {
    const tabsHTML = config.tabs?.map(tab => `
      <button class="tab-button" 
              :class="{ active: active_tab === '${tab.name.toLowerCase().replace(' ', '_')}' }"
              @click="active_tab = '${tab.name.toLowerCase().replace(' ', '_')}'">
        ${tab.icon} ${tab.name}
      </button>
    `).join('') || '';

    const tabContentHTML = config.tabs?.map(tab => {
      const tabKey = tab.name.toLowerCase().replace(' ', '_');
      return `
        <div v-if="active_tab === '${tabKey}'" class="tab-content">
          <div v-if="${tabKey} === 'process_apml'" class="apml-list">
            <div v-for="file in process_apml_files" :key="file.id" class="apml-file-item">
              <h4>{{ file.id }}</h4>
              <pre class="apml-content">{{ file.content }}</pre>
              <div class="file-actions">
                <button @click="viewFile(file.id)" class="btn btn-secondary">View</button>
                <button @click="editFile(file.id)" class="btn btn-secondary">Edit</button>
              </div>
            </div>
          </div>
          <div v-if="${tabKey} === 'solution_apml'" class="apml-list">
            <div v-for="file in solution_apml_files" :key="file.id" class="apml-file-item">
              <h4>{{ file.id }}</h4>
              <pre class="apml-content">{{ file.content }}</pre>
              <div class="file-actions">
                <button @click="viewFile(file.id)" class="btn btn-secondary">View</button>
                <button @click="editFile(file.id)" class="btn btn-secondary">Edit</button>
                <button @click="compileApp(file.id)" class="btn btn-primary">Compile</button>
                <button @click="deployApp(file.id)" class="btn btn-primary">Deploy</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('') || '';

    return `
      <div class="tabbed-panel">
        <h2>${config.title}</h2>
        <div class="tab-buttons">
          ${tabsHTML}
        </div>
        <div class="tab-content-area">
          ${tabContentHTML}
        </div>
      </div>
    `;
  }
}

module.exports = PatternVueCompiler;