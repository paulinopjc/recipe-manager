<template>
  <div class="mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-gray-900">Navigation</h1>
      <button @click="openCreate(null)"
        class="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700">
        + New item
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <div v-else-if="items.length === 0" class="text-center py-16 text-gray-400">
      No nav items yet. Create one to populate the public menu.
    </div>

    <!-- Item list -->
    <div v-else class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-12">Pos</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Label</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Link</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Active</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <template v-for="item in items" :key="item.id">
            <!-- Top-level row -->
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-500 text-xs">{{ item.position }}</td>
              <td class="px-4 py-3 font-medium text-gray-900">{{ item.label }}</td>
              <td class="px-4 py-3 hidden sm:table-cell">
                <span :class="typeBadge(item.type)" class="text-xs px-2 py-0.5 rounded-full font-medium capitalize">
                  {{ item.type }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs hidden md:table-cell truncate max-w-[180px]">
                {{ item.resolved_url ?? '—' }}
              </td>
              <td class="px-4 py-3 hidden sm:table-cell">
                <span :class="item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  class="text-xs px-2 py-0.5 rounded-full font-medium">
                  {{ item.is_active ? 'Active' : 'Hidden' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openCreate(item.id)"
                    title="Add child item"
                    class="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50">
                    + child
                  </button>
                  <button @click="openEdit(item)" class="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">
                    Edit
                  </button>
                  <button @click="confirmDelete(item)" class="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <!-- Child rows -->
            <tr v-for="child in item.children" :key="child.id" class="bg-gray-50/50 hover:bg-gray-50">
              <td class="px-4 py-2.5 text-gray-400 text-xs pl-8">{{ child.position }}</td>
              <td class="px-4 py-2.5 text-gray-700 pl-8">
                <span class="text-gray-400 mr-1">↳</span>{{ child.label }}
              </td>
              <td class="px-4 py-2.5 hidden sm:table-cell">
                <span :class="typeBadge(child.type)" class="text-xs px-2 py-0.5 rounded-full font-medium capitalize">
                  {{ child.type }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell truncate max-w-[180px]">
                {{ child.resolved_url ?? '—' }}
              </td>
              <td class="px-4 py-2.5 hidden sm:table-cell">
                <span :class="child.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  class="text-xs px-2 py-0.5 rounded-full font-medium">
                  {{ child.is_active ? 'Active' : 'Hidden' }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openEdit(child)" class="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">
                    Edit
                  </button>
                  <button @click="confirmDelete(child)" class="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <NavItemFormModal
      v-if="modal.open"
      :initial="modal.item"
      :preset-parent-id="modal.presetParentId"
      :all-items="flatItems"
      @save="onSave"
      @close="modal.open = false"
    />

    <ConfirmModal
      v-if="deleteTarget"
      :open="true"
      title="Delete nav item"
      :message="`Delete '${deleteTarget.label}'? Any child items will also be deleted.`"
      confirm-label="Delete"
      @confirm="doDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navItemApi } from '@/api/navItemApi'
import type { NavItem } from '@/types/navItem'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'
import NavItemFormModal from './NavItemFormModal.vue'

const items   = ref<NavItem[]>([])
const loading = ref(true)
const deleteTarget = ref<NavItem | null>(null)
const modal = ref<{ open: boolean; item: NavItem | null; presetParentId: number | null }>({
  open: false, item: null, presetParentId: null,
})

const flatItems = computed<NavItem[]>(() => {
  const result: NavItem[] = []
  for (const item of items.value) {
    result.push(item)
    for (const child of item.children ?? []) result.push(child)
  }
  return result
})

async function load() {
  loading.value = true
  try { items.value = await navItemApi.list().then(buildTree) }
  finally { loading.value = false }
}

function buildTree(flat: NavItem[]): NavItem[] {
  const map = new Map<number, NavItem>()
  for (const item of flat) map.set(item.id, { ...item, children: [] })
  const roots: NavItem[] = []
  for (const node of map.values()) {
    if (node.parent_id === null) roots.push(node)
    else map.get(node.parent_id)?.children!.push(node)
  }
  roots.sort((a, b) => a.position - b.position || a.id - b.id)
  for (const r of roots) r.children!.sort((a, b) => a.position - b.position || a.id - b.id)
  return roots
}

onMounted(load)

function openCreate(parentId: number | null) {
  modal.value = { open: true, item: null, presetParentId: parentId }
}
function openEdit(item: NavItem) {
  modal.value = { open: true, item, presetParentId: null }
}
function confirmDelete(item: NavItem) { deleteTarget.value = item }

async function doDelete() {
  if (!deleteTarget.value) return
  await navItemApi.remove(deleteTarget.value.id)
  deleteTarget.value = null
  await load()
}

async function onSave() {
  modal.value.open = false
  await load()
}

function typeBadge(type: string) {
  return {
    'bg-indigo-100 text-indigo-700': type === 'category',
    'bg-amber-100  text-amber-700':  type === 'recipe',
    'bg-gray-100   text-gray-600':   type === 'custom',
  }
}
</script>
