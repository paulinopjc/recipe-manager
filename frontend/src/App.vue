<template>
  <AppLayout v-if="isAppRoute">
    <router-view />
  </AppLayout>
  <router-view v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()
const isAppRoute = computed(() =>
  !!(route.meta.requiresAuth || route.meta.requiresAdmin || route.meta.guestOnly)
)
</script>
