<template>
  <aside class="w-56 min-h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200 py-4">
    <nav class="flex flex-col gap-1 px-3">
      <RouterLink
        :to="`/${ADMIN_PREFIX}/recipes`"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        active-class="bg-indigo-50 text-indigo-700 font-medium"
      >
        Recipes
      </RouterLink>
      <RouterLink
        :to="`/${ADMIN_PREFIX}/categories`"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        active-class="bg-indigo-50 text-indigo-700 font-medium"
      >
        Categories
      </RouterLink>
      <RouterLink
        :to="`/${ADMIN_PREFIX}/nav-items`"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        active-class="bg-indigo-50 text-indigo-700 font-medium"
      >
        Navigation
      </RouterLink>
      <RouterLink
        :to="`/${ADMIN_PREFIX}/homepage-sections`"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        active-class="bg-indigo-50 text-indigo-700 font-medium"
      >
        Homepage Sections
      </RouterLink>
      <RouterLink
        v-if="auth.isAdmin"
        :to="`/${ADMIN_PREFIX}/admin/users`"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        active-class="bg-indigo-50 text-indigo-700 font-medium"
      >
        Users
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_PREFIX } from '@/config'

const auth = useAuthStore()
</script>
