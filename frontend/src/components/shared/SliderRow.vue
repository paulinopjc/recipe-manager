<template>
  <div class="relative">
    <!-- Left arrow -->
    <button
      v-if="canScrollLeft"
      @click="scrollPrev"
      class="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10
             rounded-full bg-white shadow-md items-center justify-center
             text-gray-500 hover:text-indigo-600 transition-colors -ml-5"
      aria-label="Scroll left">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <!-- Scroll container -->
    <div ref="scrollEl" @scroll="sync"
      class="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth
             [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <slot />
    </div>

    <!-- Right arrow -->
    <button
      v-if="canScrollRight"
      @click="scrollNext"
      class="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10
             rounded-full bg-white shadow-md items-center justify-center
             text-gray-500 hover:text-indigo-600 transition-colors -mr-5"
      aria-label="Scroll right">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const scrollEl       = ref<HTMLElement | null>(null)
const canScrollLeft  = ref(false)
const canScrollRight = ref(false)

function sync() {
  const el = scrollEl.value
  if (!el) return
  canScrollLeft.value  = el.scrollLeft > 0
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function scrollPrev() { scrollEl.value?.scrollBy({ left: -280, behavior: 'smooth' }) }
function scrollNext() { scrollEl.value?.scrollBy({ left: 280,  behavior: 'smooth' }) }

onMounted(() => {
  sync()
  window.addEventListener('resize', sync)
})

onUnmounted(() => {
  window.removeEventListener('resize', sync)
})
</script>
