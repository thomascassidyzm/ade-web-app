#!/bin/bash

# Create all VFS files locally
echo "Setting up ADE from VFS..."

# Copy main.js
cat > main.js << 'EOF'
import { createApp } from 'vue'
import App from './components/App.vue'
import './style.css'

const app = createApp(App)
app.config.globalProperties.$ade = {
  version: '1.0.0',
  buildTime: new Date().toISOString(),
  mode: import.meta.env.MODE
}
app.mount('#app')
console.log('🚀 ADE (APML Development Engine) initialized')
EOF

# Copy vite.config.js
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    host: true
  }
})
EOF

# Copy tailwind.config.js
cat > tailwind.config.js << 'EOF'
export default {
  content: [
    "./index.html",
    "./components/**/*.{vue,js}",
  ],
  theme: {
    extend: {}
  },
  plugins: [],
}
EOF

# Copy style.css
cat > style.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

echo "Basic files created. Installing dependencies..."
npm install

echo "Ready to start ADE!"