// main.js - ADE Entry Point
import { createApp } from 'vue'
import App from './components/App.vue'
import './style.css'

// Create Vue app
const app = createApp(App)

// Global properties for ADE
app.config.globalProperties.$ade = {
  version: '1.0.0',
  buildTime: new Date().toISOString(),
  mode: import.meta.env.MODE
}

// Mount app
app.mount('#app')

// Log startup
console.log('🚀 ADE (APML Development Engine) initialized')
console.log('📋 Ready to build apps in 15 minutes!')
