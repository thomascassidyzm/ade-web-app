<template>
  <div class="visualize-panel">
    <div class="panel-container">
      <!-- Left Panel - Analyze -->
      <div class="panel panel-left">
        <div class="panel-header">
          <h3 class="panel-title">Analyze</h3>
          <span class="panel-icon">🔍</span>
        </div>
        <div class="panel-content">
          <slot name="analyze">
            <div class="placeholder">
              <p>Analyze phase content</p>
              <span class="placeholder-icon">📊</span>
            </div>
          </slot>
        </div>
      </div>

      <!-- Center Panel - Design -->
      <div class="panel panel-center">
        <div class="panel-header">
          <h3 class="panel-title">Design</h3>
          <span class="panel-icon">🎨</span>
        </div>
        <div class="panel-content">
          <slot name="design">
            <div class="placeholder">
              <p>Design phase content</p>
              <span class="placeholder-icon">✏️</span>
            </div>
          </slot>
        </div>
      </div>

      <!-- Right Panel - Eye Test -->
      <div class="panel panel-right">
        <div class="panel-header">
          <h3 class="panel-title">Eye Test</h3>
          <span class="panel-icon">👁️</span>
        </div>
        <div class="panel-content">
          <slot name="eyetest">
            <div class="placeholder">
              <p>Eye test phase content</p>
              <span class="placeholder-icon">🎯</span>
            </div>
          </slot>
        </div>
      </div>
    </div>

    <!-- Bottom Controls -->
    <div class="panel-controls">
      <button class="control-btn" @click="$emit('navigate', 'analyze')">
        <span class="btn-icon">🔍</span>
        Analyze
      </button>
      <button class="control-btn" @click="$emit('navigate', 'design')">
        <span class="btn-icon">🎨</span>
        Design
      </button>
      <button class="control-btn" @click="$emit('navigate', 'eyetest')">
        <span class="btn-icon">👁️</span>
        Eye Test
      </button>
    </div>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue'

const emit = defineEmits(['navigate'])
</script>

<style scoped>
.visualize-panel {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.panel-container {
  flex: 1;
  display: flex;
  gap: 2px;
  padding: 8px;
  overflow: hidden;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.panel:hover {
  border-color: #00ff88;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.panel-icon {
  font-size: 24px;
  opacity: 0.8;
}

.panel-left .panel-icon { color: #00ffff; }
.panel-center .panel-icon { color: #00ff88; }
.panel-right .panel-icon { color: #ff00ff; }

.panel-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
}

.placeholder-icon {
  font-size: 48px;
  opacity: 0.3;
}

.panel-controls {
  display: flex;
  gap: 8px;
  padding: 16px;
  background: #141414;
  border-top: 1px solid #2a2a2a;
}

.control-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #222;
  border-color: #00ff88;
  color: #00ff88;
  transform: translateY(-1px);
}

.control-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 18px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .panel-container {
    flex-direction: column;
  }
  
  .panel-controls {
    position: sticky;
    bottom: 0;
  }
}

/* Scrollbar styling */
.panel-content::-webkit-scrollbar {
  width: 8px;
}

.panel-content::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>