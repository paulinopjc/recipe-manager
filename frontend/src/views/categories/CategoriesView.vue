<template>
    <div class="mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold text-gray-900">Categories</h1>
        <button @click="openCreate"
          class="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700">
          + New category
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

      <div v-else-if="tree.length === 0" class="text-center py-16 text-gray-400">
        No categories yet. Create one to get started.
      </div>

      <!-- Tree table -->
      <div v-else class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Slug</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Status</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Homepage</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Pos</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Recipes</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="cat in tree" :key="cat.id">
              <CategoryRow :cat="cat" :depth="0" @edit="openEdit" @delete="confirmDelete" />
              <template v-for="child in cat.children" :key="child.id">
                <CategoryRow :cat="child" :depth="1" @edit="openEdit" @delete="confirmDelete" />
                <CategoryRow v-for="gc in child.children" :key="gc.id"
                  :cat="gc" :depth="2" @edit="openEdit" @delete="confirmDelete" />
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/edit modal -->
    <CategoryFormModal
      v-if="modal.open"
      :initial="modal.category"
      :all-categories="flat"
      @save="onSave"
      @close="modal.open = false"
    />

    <!-- Delete confirmation -->
    <ConfirmModal
      v-if="deleteTarget"
      :open="true"
      title="Delete category"
      :message="`Delete '${deleteTarget.name}'? Recipes tagged only to this category will lose the tag.`"
      confirm-label="Delete"
      @confirm="doDelete"
      @cancel="deleteTarget = null"
    />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { categoryApi } from '@/api/categoryApi'
import type { Category } from '@/types/category'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'
import CategoryFormModal from './CategoryFormModal.vue'
import CategoryRow from './CategoryRow.vue'

const flat    = ref<Category[]>([])
const loading = ref(true)

const deleteTarget = ref<Category | null>(null)
const modal = ref<{ open: boolean; category: Category | null }>({ open: false, category: null })

type TreeNode = Category & { children: TreeNode[] }

const tree = computed<TreeNode[]>(() => {
  const map = new Map<number, TreeNode>()
  for (const c of flat.value) map.set(c.id, { ...c, children: [] })
  const roots: TreeNode[] = []
  for (const node of map.values()) {
    if (node.parent_id === null) roots.push(node)
    else map.get(node.parent_id)?.children.push(node)
  }
  roots.sort((a, b) => a.name.localeCompare(b.name))
  return roots
})

async function load() {
  loading.value = true
  try { flat.value = await categoryApi.list() }
  finally { loading.value = false }
}

onMounted(load)

function openCreate() {
  modal.value = { open: true, category: null }
}

function openEdit(cat: Category) {
  modal.value = { open: true, category: cat }
}

function confirmDelete(cat: Category) {
  deleteTarget.value = cat
}

async function doDelete() {
  if (!deleteTarget.value) return
  await categoryApi.remove(deleteTarget.value.id)
  deleteTarget.value = null
  await load()
}

async function onSave() {
  modal.value.open = false
  await load()
}
</script>
