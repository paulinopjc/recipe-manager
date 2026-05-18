<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="$emit('cancel')"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 class="text-base font-semibold text-gray-900 mb-2">{{ title }}</h2>
        <p v-if="message" class="text-sm text-gray-500 mb-6">{{ message }}</p>
        <div class="flex justify-end gap-3">
          <button
            @click="$emit('cancel')"
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="$emit('confirm')"
            class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
}>(), {
  confirmLabel: 'Confirm',
})

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>