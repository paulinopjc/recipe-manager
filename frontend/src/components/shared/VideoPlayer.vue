<template>
  <div v-if="embedUrl" class="relative w-full" style="padding-bottom: 56.25%">
    <iframe
      :src="embedUrl"
      class="absolute inset-0 w-full h-full rounded-lg"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      :title="title"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  url: string
  title?: string
}>()

const embedUrl = computed(() => {
  try {
    const u = new URL(props.url)

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    // Vimeo: vimeo.com/123456789
    if (u.hostname === 'vimeo.com' || u.hostname === 'www.vimeo.com') {
      const id = u.pathname.replace(/\D/g, '')
      return id ? `https://player.vimeo.com/video/${id}` : null
    }

    return null
  } catch {
    return null
  }
})
</script>
