/**
 * APML Component Mapper
 * Maps APML specifications to Vue components for the ADE system
 */

const fs = require('fs').promises;
const path = require('path');

class APMLComponentMapper {
  constructor() {
    this.componentMap = new Map();
    this.apmlSpecs = new Map();
    this.vueComponents = new Map();
    
    // Define phase-to-component mappings
    this.phaseComponentMap = {
      analyze: {
        panel: 'VisualizePanel',
        flow: 'VisualizeFlow',
        journey: 'VisualizeJourney'
      },
      design: {
        panel: 'VisualizePanel',
        flow: 'VisualizeFlow',
        wireframe: 'VisualizeWireframe'
      },
      eyetest: {
        panel: 'VisualizePanel',
        compare: 'EyeTestCompare',
        journey: 'VisualizeJourney'
      }
    };
    
    // APML element to Vue component mapping
    this.elementComponentMap = {
      'container': 'div',
      'panel': 'VisualizePanel',
      'flow-editor': 'VisualizeFlow',
      'timeline': 'VisualizeJourney',
      'compare-view': 'EyeTestCompare',
      'button': 'button',
      'input': 'input',
      'display': 'div',
      'text': 'span',
      'heading': 'h3',
      'list': 'ul',
      'item': 'li'
    };
  }

  /**
   * Load APML spec from file
   */
  async loadAPMLSpec(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const spec = this.parseAPML(content);
      const specId = path.basename(filePath, '.apml');
      this.apmlSpecs.set(specId, spec);
      return spec;
    } catch (error) {
      console.error(`Error loading APML spec: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse APML content into structured object
   */
  parseAPML(content) {
    const lines = content.split('\n');
    const spec = {
      metadata: {},
      phases: {},
      components: [],
      interactions: []
    };

    let currentSection = null;
    let currentPhase = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse metadata
      if (trimmed.startsWith('@')) {
        const [key, ...valueParts] = trimmed.substring(1).split(':');
        spec.metadata[key.trim()] = valueParts.join(':').trim();
        continue;
      }

      // Parse phase declarations
      if (trimmed.startsWith('phase:')) {
        currentPhase = trimmed.split(':')[1].trim();
        spec.phases[currentPhase] = {
          components: [],
          properties: {}
        };
        currentSection = 'phase';
        continue;
      }

      // Parse component declarations
      if (trimmed.startsWith('component:')) {
        const componentDef = trimmed.split(':')[1].trim();
        const [type, ...props] = componentDef.split(' ');
        
        const component = {
          type,
          properties: this.parseProperties(props.join(' ')),
          phase: currentPhase
        };
        
        if (currentPhase) {
          spec.phases[currentPhase].components.push(component);
        } else {
          spec.components.push(component);
        }
        continue;
      }

      // Parse interactions
      if (trimmed.startsWith('interaction:')) {
        const interaction = trimmed.split(':')[1].trim();
        spec.interactions.push(this.parseInteraction(interaction));
        continue;
      }
    }

    return spec;
  }

  /**
   * Parse property string into object
   */
  parseProperties(propString) {
    const props = {};
    const matches = propString.matchAll(/(\w+)="([^"]*)"/g);
    
    for (const match of matches) {
      props[match[1]] = match[2];
    }
    
    return props;
  }

  /**
   * Parse interaction definition
   */
  parseInteraction(interactionString) {
    const [trigger, ...actionParts] = interactionString.split('->');
    return {
      trigger: trigger.trim(),
      action: actionParts.join('->').trim()
    };
  }

  /**
   * Map APML spec to Vue components
   */
  mapSpecToComponents(specId) {
    const spec = this.apmlSpecs.get(specId);
    if (!spec) {
      throw new Error(`APML spec '${specId}' not found`);
    }

    const componentStructure = {
      specId,
      metadata: spec.metadata,
      components: []
    };

    // Map global components
    for (const component of spec.components) {
      componentStructure.components.push(
        this.mapComponentToVue(component)
      );
    }

    // Map phase-specific components
    for (const [phase, phaseData] of Object.entries(spec.phases)) {
      for (const component of phaseData.components) {
        componentStructure.components.push(
          this.mapComponentToVue(component, phase)
        );
      }
    }

    return componentStructure;
  }

  /**
   * Map individual APML component to Vue component
   */
  mapComponentToVue(apmlComponent, phase = null) {
    const vueComponentName = this.elementComponentMap[apmlComponent.type] || 'div';
    
    // Check if it's a custom phase component
    if (phase && this.phaseComponentMap[phase]) {
      const phaseComponents = this.phaseComponentMap[phase];
      
      // Match component type to phase-specific component
      if (apmlComponent.type === 'panel' && phaseComponents.panel) {
        return {
          component: phaseComponents.panel,
          props: {
            ...apmlComponent.properties,
            phase
          },
          slot: phase
        };
      }
      
      if (apmlComponent.type === 'flow-editor' && phaseComponents.flow) {
        return {
          component: phaseComponents.flow,
          props: apmlComponent.properties
        };
      }
      
      if (apmlComponent.type === 'timeline' && phaseComponents.journey) {
        return {
          component: phaseComponents.journey,
          props: apmlComponent.properties
        };
      }
      
      if (apmlComponent.type === 'compare-view' && phaseComponents.compare) {
        return {
          component: phaseComponents.compare,
          props: apmlComponent.properties
        };
      }
    }

    return {
      component: vueComponentName,
      props: apmlComponent.properties,
      phase
    };
  }

  /**
   * Generate Vue template from mapped components
   */
  generateVueTemplate(componentStructure) {
    let template = '<template>\n';
    template += '  <div class="apml-generated">\n';

    for (const comp of componentStructure.components) {
      if (comp.component === 'VisualizePanel') {
        template += this.generatePanelTemplate(comp, componentStructure.components);
      } else {
        template += this.generateComponentTemplate(comp, 2);
      }
    }

    template += '  </div>\n';
    template += '</template>';

    return template;
  }

  /**
   * Generate panel template with slots
   */
  generatePanelTemplate(panelComp, allComponents) {
    let template = '    <VisualizePanel';
    
    // Add props
    if (Object.keys(panelComp.props).length > 0) {
      for (const [key, value] of Object.entries(panelComp.props)) {
        template += `\n      :${key}="${value}"`;
      }
    }
    
    template += '>\n';

    // Add components to appropriate slots
    const phases = ['analyze', 'design', 'eyetest'];
    
    for (const phase of phases) {
      const phaseComponents = allComponents.filter(
        c => c.phase === phase && c.component !== 'VisualizePanel'
      );
      
      if (phaseComponents.length > 0) {
        template += `      <template #${phase}>\n`;
        
        for (const comp of phaseComponents) {
          template += this.generateComponentTemplate(comp, 4);
        }
        
        template += '      </template>\n';
      }
    }

    template += '    </VisualizePanel>\n';
    
    return template;
  }

  /**
   * Generate individual component template
   */
  generateComponentTemplate(comp, indent = 0) {
    const spaces = ' '.repeat(indent);
    let template = `${spaces}<${comp.component}`;
    
    // Add props
    if (comp.props && Object.keys(comp.props).length > 0) {
      for (const [key, value] of Object.entries(comp.props)) {
        template += `\n${spaces}  :${key}="${value}"`;
      }
    }
    
    template += ` />\n`;
    
    return template;
  }

  /**
   * Generate component imports
   */
  generateImports(componentStructure) {
    const uniqueComponents = new Set();
    
    for (const comp of componentStructure.components) {
      if (comp.component.startsWith('Visualize') || comp.component.startsWith('EyeTest')) {
        uniqueComponents.add(comp.component);
      }
    }

    let imports = '';
    for (const component of uniqueComponents) {
      imports += `import ${component} from './components/${component}.vue'\n`;
    }

    return imports;
  }

  /**
   * Save mapping to file
   */
  async saveMapping(componentStructure, outputPath) {
    const mapping = {
      specId: componentStructure.specId,
      metadata: componentStructure.metadata,
      components: componentStructure.components,
      generatedAt: new Date().toISOString()
    };

    await fs.writeFile(
      outputPath,
      JSON.stringify(mapping, null, 2),
      'utf-8'
    );
  }

  /**
   * Generate complete Vue component from APML spec
   */
  async generateVueComponent(specPath, outputPath) {
    // Load and parse APML spec
    const spec = await this.loadAPMLSpec(specPath);
    const specId = path.basename(specPath, '.apml');
    
    // Map to Vue components
    const componentStructure = this.mapSpecToComponents(specId);
    
    // Generate Vue file content
    const template = this.generateVueTemplate(componentStructure);
    const imports = this.generateImports(componentStructure);
    
    const vueContent = `${template}

<script setup>
${imports}
</script>

<style scoped>
.apml-generated {
  height: 100%;
  width: 100%;
}
</style>
`;

    // Save Vue component
    await fs.writeFile(outputPath, vueContent, 'utf-8');
    
    // Save mapping
    const mappingPath = outputPath.replace('.vue', '-mapping.json');
    await this.saveMapping(componentStructure, mappingPath);
    
    return {
      componentPath: outputPath,
      mappingPath,
      componentStructure
    };
  }
}

// Export for use in other modules
module.exports = APMLComponentMapper;

// CLI usage
if (require.main === module) {
  const mapper = new APMLComponentMapper();
  
  // Example usage
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node apml-component-mapper.js <apml-spec-path> <output-vue-path>');
    process.exit(1);
  }
  
  const [specPath, outputPath] = args;
  
  mapper.generateVueComponent(specPath, outputPath)
    .then(result => {
      console.log('✅ Vue component generated successfully!');
      console.log(`   Component: ${result.componentPath}`);
      console.log(`   Mapping: ${result.mappingPath}`);
    })
    .catch(error => {
      console.error('❌ Error generating Vue component:', error.message);
      process.exit(1);
    });
}