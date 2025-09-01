// VFS Component Integration
const { createApp, ref, computed, reactive, watch } = Vue;

class VFSComponentLoader {
  constructor() {
    this.components = {};
    this.componentCache = new Map();
    this.baseUrl = 'http://localhost:3001';
  }

  async fetchComponent(componentPath) {
    try {
      const response = await fetch(`${this.baseUrl}/api/vfs/read/${componentPath}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch component: ${response.statusText}`);
      }
      const componentSource = await response.text();
      return this.parseSFC(componentSource);
    } catch (error) {
      console.error(`Error fetching component ${componentPath}:`, error);
      return null;
    }
  }

  parseSFC(source) {
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);
    const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
    const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);

    const template = templateMatch ? templateMatch[1].trim() : '';
    const script = scriptMatch ? scriptMatch[1].trim() : '';
    const style = styleMatch ? styleMatch[1].trim() : '';

    // Extract component definition from script
    let componentDef = {};
    if (script) {
      try {
        // Remove export default
        const cleanScript = script.replace(/export\s+default\s*/, '');
        // Evaluate the component definition
        componentDef = eval(`(${cleanScript})`);
      } catch (error) {
        console.error('Error parsing component script:', error);
      }
    }

    // Add template to component definition
    if (template) {
      componentDef.template = template;
    }

    // Add styles to document if present
    if (style) {
      const styleElement = document.createElement('style');
      styleElement.textContent = style;
      document.head.appendChild(styleElement);
    }

    return componentDef;
  }

  async loadComponents() {
    const componentPaths = [
      'components/VisualizePanel.vue',
      'components/VisualizeFlow.vue',
      'components/VisualizeJourney.vue',
      'components/EyeTestCompare.vue'
    ];

    for (const path of componentPaths) {
      const component = await this.fetchComponent(path);
      if (component) {
        const name = path.split('/').pop().replace('.vue', '');
        this.components[name] = component;
      }
    }

    return this.components;
  }

  mountToPhaseContainers() {
    // Mount VisualizePanel to visualize phase
    const visualizeContainer = document.querySelector('.visualize-container');
    if (visualizeContainer && this.components.VisualizePanel) {
      const app = createApp({
        components: {
          VisualizePanel: this.components.VisualizePanel,
          VisualizeFlow: this.components.VisualizeFlow,
          VisualizeJourney: this.components.VisualizeJourney
        },
        template: `
          <div class="vfs-visualize-wrapper">
            <VisualizePanel>
              <template #flow>
                <VisualizeFlow v-if="activeTab === 'flow'" />
              </template>
              <template #journey>
                <VisualizeJourney v-if="activeTab === 'journey'" />
              </template>
            </VisualizePanel>
          </div>
        `,
        setup() {
          const activeTab = ref('flow');
          
          // Wire up tab switching
          window.addEventListener('vfs:tab-change', (event) => {
            activeTab.value = event.detail.tab;
          });
          
          return { activeTab };
        }
      });
      
      // Create mount point
      const mountPoint = document.createElement('div');
      mountPoint.id = 'vfs-visualize-app';
      visualizeContainer.appendChild(mountPoint);
      app.mount('#vfs-visualize-app');
    }

    // Mount EyeTestCompare to eyetest phase
    const eyetestContainer = document.querySelector('.eyetest-container');
    if (eyetestContainer && this.components.EyeTestCompare) {
      const app = createApp({
        components: {
          EyeTestCompare: this.components.EyeTestCompare
        },
        template: '<EyeTestCompare />',
        setup() {
          // Provide any necessary data or methods
          const optionA = ref({});
          const optionB = ref({});
          
          // Listen for eye test updates
          window.addEventListener('vfs:eyetest-update', (event) => {
            optionA.value = event.detail.optionA;
            optionB.value = event.detail.optionB;
          });
          
          return { optionA, optionB };
        }
      });
      
      // Create mount point
      const mountPoint = document.createElement('div');
      mountPoint.id = 'vfs-eyetest-app';
      eyetestContainer.appendChild(mountPoint);
      app.mount('#vfs-eyetest-app');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const loader = new VFSComponentLoader();
  
  console.log('Loading VFS components...');
  await loader.loadComponents();
  
  console.log('Mounting components to phase containers...');
  loader.mountToPhaseContainers();
  
  console.log('VFS integration complete');
  
  // Expose loader for debugging
  window.vfsLoader = loader;
});