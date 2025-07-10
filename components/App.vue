<template>
  <div class="ade-container h-screen flex flex-col bg-gray-50">
    <header class="h-16 bg-white border-b border-gray-200 flex items-center px-4">
      <h1 class="text-xl font-bold text-gray-800">ADE</h1>
      <span class="text-sm text-gray-500 ml-2">APML Development Engine</span>
    </header>
    
    <div class="flex-1 flex overflow-hidden">
      <div class="w-full flex items-center justify-center">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-gray-800 mb-4">Welcome to ADE! 🚀</h2>
          <p class="text-gray-600 mb-8">ChatGPT for building enterprise apps</p>
          <p class="text-lg text-gray-700">Build any app in 15 minutes through natural conversation</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  console.log('ADE is running!')
})
</script>