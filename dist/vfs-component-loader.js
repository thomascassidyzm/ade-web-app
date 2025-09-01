// Mount VFS Vue components
async function mountVFSComponents() {
  // Load Vue 3
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/vue@3/dist/vue.global.js';
  document.head.appendChild(script);
  
  script.onload = async () => {
    // Fetch and mount VisualizePanel
    const response = await fetch('/api/vfs/read/components/VisualizePanel.vue');
    const vueCode = await response.text();
    
    // Extract template and script
    const templateMatch = vueCode.match(/<template>([\s\S]*?)<\/template>/);
    const scriptMatch = vueCode.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    
    if (templateMatch && scriptMatch) {
      // Create Vue app
      const { createApp } = Vue;
      const app = createApp({
        template: templateMatch[1],
        setup() {
          // Component logic from script section
          return {};
        }
      });
      
      // Mount to visualize container
      const container = document.querySelector('.visualize-container');
      if (container) {
        container.innerHTML = '<div id="visualize-app"></div>';
        app.mount('#visualize-app');
      }
    }
  };
}

// Auto-mount when ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(mountVFSComponents, 1000);
});
