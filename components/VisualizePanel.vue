<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  phase: String
})

const activePanel = ref('wireframes')
const panels = ['wireframes', 'flows', 'journey']

// Wireframe data
const wireframeElements = ref([])
const selectedTool = ref('rectangle')

// Flow data
const flowNodes = ref([])
const flowConnections = ref([])

// Journey data
const journeySteps = ref([])

// Drawing functions
function addWireframeElement(event) {
  if (activePanel.value !== 'wireframes') return
  
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  wireframeElements.value.push({
    id: Date.now(),
    type: selectedTool.value,
    x,