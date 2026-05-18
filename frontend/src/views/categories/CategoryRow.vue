<template>
  <tr class="hover:bg-gray-50">
    <td class="px-4 py-3 font-medium text-gray-900">
      <span :style="{ paddingLeft: depth * 20 + 'px' }" class="flex items-center gap-1.5">
        <span v-if="depth > 0" class="text-gray-300 select-none">└</span>
        <span :class="depth === 0 ? 'font-semibold' : ''">{{ cat.name }}</span>
        <span v-if="cat.is_home" class="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">Home</span>
      </span>
    </td>
    <td class="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">{{ cat.slug }}</td>
    <td class="px-4 py-3 hidden md:table-cell">
      <span :class="cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
        class="text-xs px-2 py-0.5 rounded-full font-medium">
        {{ cat.is_active ? 'Active' : 'Draft' }}
      </span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">
      <span v-if="cat.show_on_homepage"
        class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium capitalize">
        {{ cat.homepage_style }} · {{ cat.homepage_items }}
      </span>
      <span v-else class="text-gray-300 text-xs">—</span>
    </td>
    <td class="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{{ cat.show_on_homepage ? cat.homepage_position : '—' }}</td>
    <td class="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{{ cat.recipe_count ?? 0 }}</td>
    <td class="px-4 py-3">
      <div class="flex items-center gap-3 justify-end">
        <button @click="$emit('edit', cat)"
          class="text-xs text-indigo-600 hover:underline">Edit</button>
        <button @click="$emit('delete', cat)"
          class="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { Category } from '@/types/category'

defineProps<{ cat: Category; depth: number }>()
defineEmits<{ edit: [cat: Category]; delete: [cat: Category] }>()
</script>
