<template>
  <div class="visualize-flow" ref="flowContainer">
    <!-- Canvas for connections -->
    <svg class="flow-canvas" :width="canvasWidth" :height="canvasHeight">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="#00ff88"
          />
        </marker>
      </defs>
      
      <path
        v-for="connection in connections"
        :key="connection.id"
        :d="getConnectionPath(connection)"
        class="flow-connection"
        marker-end="url(#arrowhead)"
      />
    </svg>

    <!-- Nodes -->
    <div
      v-for="node in nodes"
      :key="node.id"
      class="flow-node"
      :class="[`node-${node.type}`, { 'node-selected': node.selected }]"
      :style="{
        left: node.x + 'px',
        top: node.y + 'px'
      }"
      @mousedown="startDrag(node, $event)"
      @click="selectNode(node)"
    >
      <div class="node-header">
        <span class="node-icon">{{ getNodeIcon(node.type) }}</span>
        <span class="node-title">{{ node.title }}</span>
      </div>
      <div class="node-content">
        {{ node.content }}
      </div>
      
      <!-- Input/Output ports -->
      <div class="node-port port-input" @click.stop="handlePortClick(node, 'input')"></div>
      <div class="node-port port-output" @click.stop="handlePortClick(node, 'output')"></div>
    </div>

    <!-- Toolbar -->
    <div class="flow-toolbar">
      <button class="toolbar-btn" @click="addNode('analyze')" title="Add Analyze Node">
        <span class="btn-icon">🔍</span>
      </button>
      <button class="toolbar-btn" @click="addNode('design')" title="Add Design Node">
        <span class="btn-icon">🎨</span>
      </button>
      <button class="toolbar-btn" @click="addNode('eyetest')" title="Add Eye Test Node">
        <span class="btn-icon">👁️</span>
      </button>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" @click="clearFlow" title="Clear Flow">
        <span class="btn-icon">🗑️</span>
      </button>
      <button class="toolbar-btn" @click="autoLayout" title="Auto Layout">
        <span class="btn-icon">📐</span>
      </button>
    </div>

    <!-- Connection Preview -->
    <svg
      v-if="isConnecting"
      class="connection-preview"
      :width="canvasWidth"
      :height="canvasHeight"
    >
      <path
        :d="previewPath"
        class="flow-connection preview"
      />
    </svg>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const flowContainer = ref(null)
const canvasWidth = ref(2000)
const canvasHeight = ref(2000)

const nodes = reactive([
  {
    id: 'node-1',
    type: 'analyze',
    title: 'Data Analysis',
    content: 'Process incoming data',
    x: 100,
    y: 100,
    selected: false
  },
  {
    id: 'node-2',
    type: 'design',
    title: 'UI Design',
    content: 'Create interface',
    x: 400,
    y: 150,
    selected: false
  }
])

const connections = reactive([
  {
    id: 'conn-1',
    from: 'node-1',
    to: 'node-2'
  }
])

const dragState = reactive({
  isDragging: false,
  dragNode: null,
  offsetX: 0,
  offsetY: 0
})

const connectionState = reactive({
  isConnecting: false,
  fromNode: null,
  fromPort: null,
  mouseX: 0,
  mouseY: 0
})

const isConnecting = computed(() => connectionState.isConnecting)

const previewPath = computed(() => {
  if (!connectionState.fromNode) return ''
  
  const fromNode = nodes.find(n => n.id === connectionState.fromNode)
  if (!fromNode) return ''
  
  const startX = fromNode.x + (connectionState.fromPort === 'output' ? 200 : 0)
  const startY = fromNode.y + 40
  
  return `M ${startX} ${startY} C ${startX + 100} ${startY}, ${connectionState.mouseX - 100} ${connectionState.mouseY}, ${connectionState.mouseX} ${connectionState.mouseY}`
})

function getNodeIcon(type) {
  const icons = {
    analyze: '🔍',
    design: '🎨',
    eyetest: '👁️'
  }
  return icons[type] || '📦'
}

function getConnectionPath(connection) {
  const fromNode = nodes.find(n => n.id === connection.from)
  const toNode = nodes.find(n => n.id === connection.to)
  
  if (!fromNode || !toNode) return ''
  
  const startX = fromNode.x + 200  // Right side of node
  const startY = fromNode.y + 40   // Middle height
  const endX = toNode.x            // Left side of node
  const endY = toNode.y + 40       // Middle height
  
  // Bezier curve for smooth connection
  const controlX1 = startX + (endX - startX) / 3
  const controlY1 = startY
  const controlX2 = endX - (endX - startX) / 3
  const controlY2 = endY
  
  return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
}

function startDrag(node, event) {
  dragState.isDragging = true
  dragState.dragNode = node
  dragState.offsetX = event.clientX - node.x
  dragState.offsetY = event.clientY - node.y
}

function handleMouseMove(event) {
  if (dragState.isDragging && dragState.dragNode) {
    dragState.dragNode.x = event.clientX - dragState.offsetX
    dragState.dragNode.y = event.clientY - dragState.offsetY
  }
  
  if (connectionState.isConnecting) {
    const rect = flowContainer.value.getBoundingClientRect()
    connectionState.mouseX = event.clientX - rect.left
    connectionState.mouseY = event.clientY - rect.top
  }
}

function handleMouseUp() {
  dragState.isDragging = false
  dragState.dragNode = null
  
  if (connectionState.isConnecting) {
    connectionState.isConnecting = false
    connectionState.fromNode = null
    connectionState.fromPort = null
  }
}

function selectNode(node) {
  nodes.forEach(n => n.selected = false)
  node.selected = true
}

function handlePortClick(node, portType) {
  if (!connectionState.isConnecting) {
    // Start connection
    connectionState.isConnecting = true
    connectionState.fromNode = node.id
    connectionState.fromPort = portType
  } else {
    // Complete connection
    if (connectionState.fromNode !== node.id && connectionState.fromPort !== portType) {
      const newConnection = {
        id: `conn-${Date.now()}`,
        from: connectionState.fromPort === 'output' ? connectionState.fromNode : node.id,
        to: connectionState.fromPort === 'output' ? node.id : connectionState.fromNode
      }
      connections.push(newConnection)
    }
    
    connectionState.isConnecting = false
    connectionState.fromNode = null
    connectionState.fromPort = null
  }
}

function addNode(type) {
  const newNode = {
    id: `node-${Date.now()}`,
    type,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
    content: 'New node',
    x: Math.random() * 500 + 50,
    y: Math.random() * 300 + 50,
    selected: false
  }
  nodes.push(newNode)
}

function clearFlow() {
  nodes.splice(0)
  connections.splice(0)
}

function autoLayout() {
  const nodeWidth = 220
  const nodeHeight = 100
  const horizontalGap = 150
  const verticalGap = 100
  
  nodes.forEach((node, index) => {
    const row = Math.floor(index / 3)
    const col = index % 3
    node.x = col * (nodeWidth + horizontalGap) + 50
    node.y = row * (nodeHeight + verticalGap) + 50
  })
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.visualize-flow {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  background-image: 
    linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  overflow: auto;
}

.flow-canvas,
.connection-preview {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.flow-connection {
  fill: none;
  stroke: #00ff88;
  stroke-width: 2;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.flow-connection.preview {
  stroke: #00ffff;
  stroke-dasharray: 5, 5;
  opacity: 0.8;
}

.flow-node {
  position: absolute;
  width: 200px;
  background: #141414;
  border: 2px solid #2a2a2a;
  border-radius: 8px;
  cursor: move;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.flow-node:hover {
  border-color: #3a3a3a;
}

.node-selected {
  border-color: #00ff88 !important;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}

.node-analyze { border-left: 4px solid #00ffff; }
.node-design { border-left: 4px solid #00ff88; }
.node-eyetest { border-left: 4px solid #ff00ff; }

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  border-radius: 6px 6px 0 0;
}

.node-icon {
  font-size: 20px;
}

.node-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.node-content {
  padding: 12px;
  font-size: 13px;
  color: #999;
}

.node-port {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #1a1a1a;
  border: 2px solid #00ff88;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.node-port:hover {
  transform: scale(1.3);
  background: #00ff88;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.port-input {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.port-output {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.flow-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.toolbar-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: #222;
  border-color: #00ff88;
  transform: translateY(-1px);
}

.toolbar-separator {
  width: 1px;
  background: #2a2a2a;
  margin: 0 4px;
}

.btn-icon {
  font-size: 20px;
}
</style>