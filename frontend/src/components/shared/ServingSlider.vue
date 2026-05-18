<template>
  <div class="flex items-center gap-4">
    <label class="text-sm font-medium text-gray-700 shrink-0">Servings</label>
    <input
      :value="modelValue"
      @input="onInput"
      type="range"
      :min="min"
      :max="max"
      class="flex-1 accent-indigo-600 h-2 rounded cursor-pointer"
    />
    <span class="text-sm font-semibold text-indigo-700 w-8 text-center">{{ modelValue }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
}>(), {
  min: 1,
  max: 20,
})

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function onInput(e: Event) {
  emit('update:modelValue', Number((e.target as HTMLInputElement).value))
}
</script>
