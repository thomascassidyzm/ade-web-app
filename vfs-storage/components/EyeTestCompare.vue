<template>
  <div class="eye-test-compare">
    <!-- Header -->
    <div class="compare-header">
      <h3 class="compare-title">Eye Test A/B Comparison</h3>
      <div class="compare-controls">
        <div class="view-mode-toggle">
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'side-by-side' }"
            @click="viewMode = 'side-by-side'"
          >
            Side by Side
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'overlay' }"
            @click="viewMode = 'overlay'"
          >
            Overlay
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'diff' }"
            @click="viewMode = 'diff'"
          >
            Difference
          </button>
        </div>
      </div>
    </div>

    <!-- Comparison Container -->
    <div class="comparison-container" :class="`mode-${viewMode}`">
      <!-- Side by Side Mode -->
      <template v-if="viewMode === 'side-by-side'">
        <div class="compare-panel panel-a">
          <div class="panel-label">Version A</div>
          <div class="panel-content">
            <slot name="version-a">
              <div class="version-placeholder">
                <span class="placeholder-icon">🅰️</span>
                <p>Version A Content</p>
              </div>
            </slot>
          </div>
          <div class="panel-metrics">
            <div class="metric">
              <span class="metric-label">Performance</span>
              <span class="metric-value">{{ metricsA.performance }}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Engagement</span>
              <span class="metric-value">{{ metricsA.engagement }}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Conversion</span>
              <span class="metric-value">{{ metricsA.conversion }}%</span>
            </div>
          </div>
        </div>

        <div class="compare-divider">
          <div class="divider-handle" @mousedown="startResize"></div>
        </div>

        <div class="compare-panel panel-b">
          <div class="panel-label">Version B</div>
          <div class="panel-content">
            <slot name="version-b">
              <div class="version-placeholder">
                <span class="placeholder-icon">🅱️</span>
                <p>Version B Content</p>
              </div>
            </slot>
          </div>
          <div class="panel-metrics">
            <div class="metric">
              <span class="metric-label">Performance</span>
              <span class="metric-value" :class="getMetricClass('performance')">
                {{ metricsB.performance }}%
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">Engagement</span>
              <span class="metric-value" :class="getMetricClass('engagement')">
                {{ metricsB.engagement }}%
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">Conversion</span>
              <span class="metric-value" :class="getMetricClass('conversion')">
                {{ metricsB.conversion }}%
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Overlay Mode -->
      <template v-else-if="viewMode === 'overlay'">
        <div class="overlay-container">
          <div class="overlay-layer layer-a" :style="{ opacity: overlayOpacityA }">
            <slot name="version-a">
              <div class="version-placeholder">
                <span class="placeholder-icon">🅰️</span>
                <p>Version A Content</p>
              </div>
            </slot>
          </div>
          <div class="overlay-layer layer-b" :style="{ opacity: overlayOpacityB }">
            <slot name="version-b">
              <div class="version-placeholder">
                <span class="placeholder-icon">🅱️</span>
                <p>Version B Content</p>
              </div>
            </slot>
          </div>
          
          <div class="overlay-controls">
            <div class="opacity-slider">
              <label>Version A</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                v-model.number="overlayOpacityA"
              />
              <span>{{ Math.round(overlayOpacityA * 100) }}%</span>
            </div>
            <div class="opacity-slider">
              <label>Version B</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                v-model.number="overlayOpacityB"
              />
              <span>{{ Math.round(overlayOpacityB * 100) }}%</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Diff Mode -->
      <template v-else-if="viewMode === 'diff'">
        <div class="diff-container">
          <div class="diff-visualization">
            <canvas ref="diffCanvas" width="800" height="600"></canvas>
          </div>
          <div class="diff-legend">
            <div class="legend-item">
              <span class="legend-color" style="background: #00ff88"></span>
              <span>Added in B</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background: #ff4444"></span>
              <span>Removed from A</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background: #ffaa00"></span>
              <span>Modified</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Heatmap Toggle -->
    <div class="heatmap-toggle">
      <label class="toggle-switch">
        <input type="checkbox" v-model="showHeatmap" />
        <span class="toggle-slider"></span>
      </label>
      <span>Show Heatmap</span>
    </div>

    <!-- Results Summary -->
    <div class="results-summary">
      <h4 class="summary-title">Test Results</h4>
      <div class="summary-content">
        <div class="winner-badge" v-if="winner">
          <span class="badge-icon">🏆</span>
          <span class="badge-text">Version {{ winner }} Wins!</span>
        </div>
        <div class="improvement-metrics">
          <div class="improvement-item">
            <span class="improvement-label">Performance Improvement:</span>
            <span class="improvement-value" :class="{ positive: performanceImprovement > 0 }">
              {{ performanceImprovement > 0 ? '+' : '' }}{{ performanceImprovement }}%
            </span>
          </div>
          <div class="improvement-item">
            <span class="improvement-label">Engagement Improvement:</span>
            <span class="improvement-value" :class="{ positive: engagementImprovement > 0 }">
              {{ engagementImprovement > 0 ? '+' : '' }}{{ engagementImprovement }}%
            </span>
          </div>
          <div class="improvement-item">
            <span class="improvement-label">Conversion Improvement:</span>
            <span class="improvement-value" :class="{ positive: conversionImprovement > 0 }">
              {{ conversionImprovement > 0 ? '+' : '' }}{{ conversionImprovement }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const viewMode = ref('side-by-side')
const showHeatmap = ref(false)
const overlayOpacityA = ref(0.5)
const overlayOpacityB = ref(0.5)
const diffCanvas = ref(null)

const metricsA = reactive({
  performance: 85,
  engagement: 72,
  conversion: 12
})

const metricsB = reactive({
  performance: 92,
  engagement: 78,
  conversion: 15
})

const performanceImprovement = computed(() => metricsB.performance - metricsA.performance)
const engagementImprovement = computed(() => metricsB.engagement - metricsA.engagement)
const conversionImprovement = computed(() => metricsB.conversion - metricsA.conversion)

const winner = computed(() => {
  const scoreA = metricsA.performance + metricsA.engagement + metricsA.conversion
  const scoreB = metricsB.performance + metricsB.engagement + metricsB.conversion
  return scoreB > scoreA ? 'B' : scoreA > scoreB ? 'A' : null
})

function getMetricClass(metric) {
  const improvement = metricsB[metric] - metricsA[metric]
  return improvement > 0 ? 'metric-better' : improvement < 0 ? 'metric-worse' : ''
}

// Resize functionality
let isResizing = false
let startX = 0
let startSplit = 50

function startResize(event) {
  isResizing = true
  startX = event.clientX
  startSplit = 50 // Current split percentage
}

function handleMouseMove(event) {
  if (!isResizing) return
  
  const deltaX = event.clientX - startX
  const containerWidth = event.target.parentElement.offsetWidth
  const deltaPercent = (deltaX / containerWidth) * 100
  
  // Update panel widths
  const newSplit = Math.max(20, Math.min(80, startSplit + deltaPercent))
  // Implementation would update panel widths here
}

function handleMouseUp() {
  isResizing = false
}

// Draw diff visualization
function drawDiff() {
  if (!diffCanvas.value) return
  
  const ctx = diffCanvas.value.getContext('2d')
  const width = diffCanvas.value.width
  const height = diffCanvas.value.height
  
  // Clear canvas
  ctx.fillStyle = '#141414'
  ctx.fillRect(0, 0, width, height)
  
  // Draw example diff visualization
  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 1
  
  // Grid
  for (let x = 0; x < width; x += 50) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  
  for (let y = 0; y < height; y += 50) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // Example diff regions
  ctx.fillStyle = 'rgba(0, 255, 136, 0.3)'
  ctx.fillRect(100, 100, 150, 80)
  
  ctx.fillStyle = 'rgba(255, 68, 68, 0.3)'
  ctx.fillRect(300, 200, 100, 60)
  
  ctx.fillStyle = 'rgba(255, 170, 0, 0.3)'
  ctx.fillRect(200, 350, 200, 100)
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  if (viewMode.value === 'diff') {
    drawDiff()
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.eye-test-compare {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
}

.compare-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.view-mode-toggle {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #1a1a1a;
  border-radius: 8px;
}

.toggle-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn.active {
  background: #00ff88;
  color: #000;
  font-weight: 600;
}

.toggle-btn:hover:not(.active) {
  background: #222;
  color: #fff;
}

.comparison-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Side by Side Mode */
.mode-side-by-side {
  display: flex;
  padding: 20px;
  gap: 0;
}

.compare-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.panel-a {
  border-radius: 8px 0 0 8px;
}

.panel-b {
  border-radius: 0 8px 8px 0;
}

.panel-label {
  padding: 12px 16px;
  background: #1a1a1a;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid #2a2a2a;
}

.panel-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.version-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
}

.placeholder-icon {
  font-size: 64px;
}

.panel-metrics {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #1a1a1a;
  border-top: 1px solid #2a2a2a;
}

.metric {
  flex: 1;
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.metric-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
}

.metric-better {
  color: #00ff88;
}

.metric-worse {
  color: #ff4444;
}

.compare-divider {
  position: relative;
  width: 8px;
  background: #0a0a0a;
  cursor: col-resize;
}

.divider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 40px;
  background: #333;
  border-radius: 2px;
  transition: background 0.2s ease;
}

.compare-divider:hover .divider-handle {
  background: #00ff88;
}

/* Overlay Mode */
.overlay-container {
  position: relative;
  height: 100%;
  padding: 20px;
}

.overlay-layer {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  bottom: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
}

.overlay-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 30px;
  padding: 16px 24px;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
}

.opacity-slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.opacity-slider label {
  font-size: 14px;
  font-weight: 500;
}

.opacity-slider input[type="range"] {
  width: 100px;
}

.opacity-slider span {
  font-size: 13px;
  color: #666;
  width: 40px;
}

/* Diff Mode */
.diff-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.diff-visualization {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 20px;
}

.diff-legend {
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 16px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

/* Heatmap Toggle */
.heatmap-toggle {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #333;
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background: #00ff88;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* Results Summary */
.results-summary {
  padding: 20px;
  background: #141414;
  border-top: 1px solid #2a2a2a;
}

.summary-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.summary-content {
  display: flex;
  gap: 30px;
  align-items: center;
}

.winner-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a1a1a;
  border: 2px solid #00ff88;
  border-radius: 8px;
}

.badge-icon {
  font-size: 24px;
}

.badge-text {
  font-size: 16px;
  font-weight: 600;
  color: #00ff88;
}

.improvement-metrics {
  flex: 1;
  display: flex;
  gap: 24px;
}

.improvement-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.improvement-label {
  font-size: 13px;
  color: #666;
}

.improvement-value {
  font-size: 18px;
  font-weight: 600;
}

.improvement-value.positive {
  color: #00ff88;
}
</style>