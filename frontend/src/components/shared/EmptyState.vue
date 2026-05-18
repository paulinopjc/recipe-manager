<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <h3 class="text-sm font-medium text-gray-900 mb-1">{{ title }}</h3>
    <p v-if="message" class="text-sm text-gray-500">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  message?: string
}>()
</script>