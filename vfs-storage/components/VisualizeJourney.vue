<template>
  <div class="visualize-journey">
    <!-- Timeline Header -->
    <div class="journey-header">
      <h3 class="journey-title">User Journey Timeline</h3>
      <div class="journey-controls">
        <button class="control-btn" @click="zoomIn" title="Zoom In">
          <span class="btn-icon">🔍+</span>
        </button>
        <button class="control-btn" @click="zoomOut" title="Zoom Out">
          <span class="btn-icon">🔍-</span>
        </button>
        <button class="control-btn" @click="resetView" title="Reset View">
          <span class="btn-icon">↻</span>
        </button>
      </div>
    </div>

    <!-- Timeline Container -->
    <div class="timeline-container" ref="timelineContainer">
      <div class="timeline-track" :style="{ transform: `scaleX(${zoomLevel})` }">
        <!-- Time Markers -->
        <div class="time-markers">
          <div
            v-for="marker in timeMarkers"
            :key="marker.time"
            class="time-marker"
            :style="{ left: marker.position + '%' }"
          >
            <span class="marker-label">{{ marker.label }}</span>
            <div class="marker-line"></div>
          </div>
        </div>

        <!-- Phase Lanes -->
        <div class="phase-lanes">
          <!-- Analyze Lane -->
          <div class="phase-lane analyze-lane">
            <div class="lane-header">
              <span class="lane-icon">🔍</span>
              <span class="lane-title">Analyze</span>
            </div>
            <div class="lane-content">
              <div
                v-for="event in analyzeEvents"
                :key="event.id"
                class="timeline-event"
                :class="{ 'event-active': event.active }"
                :style="{
                  left: event.startPercent + '%',
                  width: event.widthPercent + '%'
                }"
                @click="selectEvent(event)"
              >
                <div class="event-content">
                  <span class="event-title">{{ event.title }}</span>
                  <span class="event-duration">{{ event.duration }}ms</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Design Lane -->
          <div class="phase-lane design-lane">
            <div class="lane-header">
              <span class="lane-icon">🎨</span>
              <span class="lane-title">Design</span>
            </div>
            <div class="lane-content">
              <div
                v-for="event in designEvents"
                :key="event.id"
                class="timeline-event"
                :class="{ 'event-active': event.active }"
                :style="{
                  left: event.startPercent + '%',
                  width: event.widthPercent + '%'
                }"
                @click="selectEvent(event)"
              >
                <div class="event-content">
                  <span class="event-title">{{ event.title }}</span>
                  <span class="event-duration">{{ event.duration }}ms</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Eye Test Lane -->
          <div class="phase-lane eyetest-lane">
            <div class="lane-header">
              <span class="lane-icon">👁️</span>
              <span class="lane-title">Eye Test</span>
            </div>
            <div class="lane-content">
              <div
                v-for="event in eyeTestEvents"
                :key="event.id"
                class="timeline-event"
                :class="{ 'event-active': event.active }"
                :style="{
                  left: event.startPercent + '%',
                  width: event.widthPercent + '%'
                }"
                @click="selectEvent(event)"
              >
                <div class="event-content">
                  <span class="event-title">{{ event.title }}</span>
                  <span class="event-duration">{{ event.duration }}ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Time Indicator -->
        <div class="current-time-indicator" :style="{ left: currentTimePercent + '%' }">
          <div class="time-indicator-line"></div>
          <div class="time-indicator-label">{{ currentTimeLabel }}</div>
        </div>
      </div>
    </div>

    <!-- Event Details Panel -->
    <div v-if="selectedEvent" class="event-details">
      <div class="details-header">
        <h4 class="details-title">{{ selectedEvent.title }}</h4>
        <button class="close-btn" @click="selectedEvent = null">✕</button>
      </div>
      <div class="details-content">
        <div class="detail-item">
          <span class="detail-label">Phase:</span>
          <span class="detail-value">{{ selectedEvent.phase }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Start Time:</span>
          <span class="detail-value">{{ selectedEvent.startTime }}ms</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Duration:</span>
          <span class="detail-value">{{ selectedEvent.duration }}ms</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Status:</span>
          <span class="detail-value" :class="`status-${selectedEvent.status}`">
            {{ selectedEvent.status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const timelineContainer = ref(null)
const zoomLevel = ref(1)
const selectedEvent = ref(null)
const currentTime = ref(2500)
const totalDuration = 10000 // 10 seconds total

const currentTimePercent = computed(() => (currentTime.value / totalDuration) * 100)
const currentTimeLabel = computed(() => `${(currentTime.value / 1000).toFixed(1)}s`)

const timeMarkers = computed(() => {
  const markers = []
  const step = 1000 // 1 second intervals
  for (let time = 0; time <= totalDuration; time += step) {
    markers.push({
      time,
      position: (time / totalDuration) * 100,
      label: `${time / 1000}s`
    })
  }
  return markers
})

const analyzeEvents = reactive([
  {
    id: 'a1',
    phase: 'analyze',
    title: 'Data Collection',
    startTime: 0,
    duration: 1500,
    startPercent: 0,
    widthPercent: 15,
    status: 'completed',
    active: false
  },
  {
    id: 'a2',
    phase: 'analyze',
    title: 'Pattern Analysis',
    startTime: 1600,
    duration: 2000,
    startPercent: 16,
    widthPercent: 20,
    status: 'completed',
    active: false
  }
])

const designEvents = reactive([
  {
    id: 'd1',
    phase: 'design',
    title: 'Layout Design',
    startTime: 2000,
    duration: 1800,
    startPercent: 20,
    widthPercent: 18,
    status: 'active',
    active: true
  },
  {
    id: 'd2',
    phase: 'design',
    title: 'Style Application',
    startTime: 4000,
    duration: 1200,
    startPercent: 40,
    widthPercent: 12,
    status: 'pending',
    active: false
  }
])

const eyeTestEvents = reactive([
  {
    id: 'e1',
    phase: 'eyetest',
    title: 'A/B Test Setup',
    startTime: 5500,
    duration: 1000,
    startPercent: 55,
    widthPercent: 10,
    status: 'pending',
    active: false
  },
  {
    id: 'e2',
    phase: 'eyetest',
    title: 'User Testing',
    startTime: 7000,
    duration: 2500,
    startPercent: 70,
    widthPercent: 25,
    status: 'pending',
    active: false
  }
])

function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value * 1.2, 5)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value / 1.2, 0.5)
}

function resetView() {
  zoomLevel.value = 1
}

function selectEvent(event) {
  // Deselect all events
  [...analyzeEvents, ...designEvents, ...eyeTestEvents].forEach(e => e.active = false)
  
  // Select clicked event
  event.active = true
  selectedEvent.value = event
}

// Animate timeline
let animationFrame
function animateTimeline() {
  currentTime.value = (currentTime.value + 20) % totalDuration
  animationFrame = requestAnimationFrame(animateTimeline)
}

onMounted(() => {
  animationFrame = requestAnimationFrame(animateTimeline)
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>

<style scoped>
.visualize-journey {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.journey-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
}

.journey-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.journey-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  padding: 8px 12px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #222;
  border-color: #00ff88;
}

.btn-icon {
  font-size: 16px;
}

.timeline-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 20px;
}

.timeline-track {
  position: relative;
  min-width: 100%;
  height: 100%;
  transform-origin: left center;
  transition: transform 0.3s ease;
}

.time-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  border-bottom: 1px solid #2a2a2a;
}

.time-marker {
  position: absolute;
  height: 100%;
}

.marker-label {
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #666;
}

.marker-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 1px;
  height: 10px;
  background: #333;
}

.phase-lanes {
  position: relative;
  margin-top: 50px;
  height: calc(100% - 80px);
}

.phase-lane {
  position: relative;
  height: 100px;
  margin-bottom: 20px;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.lane-header {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 120px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: #1a1a1a;
  border-right: 1px solid #2a2a2a;
}

.lane-icon {
  font-size: 24px;
}

.lane-title {
  font-size: 14px;
  font-weight: 500;
}

.analyze-lane .lane-icon { color: #00ffff; }
.design-lane .lane-icon { color: #00ff88; }
.eyetest-lane .lane-icon { color: #ff00ff; }

.lane-content {
  position: relative;
  margin-left: 120px;
  height: 100%;
}

.timeline-event {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 60px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.timeline-event:hover {
  border-color: #00ff88;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
}

.event-active {
  border-color: #00ff88 !important;
  background: #1f2f1f;
}

.event-content {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}

.event-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.event-duration {
  font-size: 11px;
  color: #666;
}

.current-time-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  pointer-events: none;
}

.time-indicator-line {
  width: 2px;
  height: 100%;
  background: #00ffff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.time-indicator-label {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 8px;
  background: #00ffff;
  color: #000;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.event-details {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: 300px;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #2a2a2a;
}

.details-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  cursor: pointer;
}

.close-btn:hover {
  background: #222;
  border-color: #ff4444;
}

.details-content {
  padding: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.detail-label {
  font-size: 13px;
  color: #666;
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
}

.status-completed { color: #00ff88; }
.status-active { color: #00ffff; }
.status-pending { color: #666; }
</style>