<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Users (Admin)</h1>

    <!-- Create user form -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6 max-w-xl">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Add a user</h2>
      <form @submit.prevent="onCreate" class="space-y-3">
        <div v-if="formError" class="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">
          {{ formError }}
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input v-model="form.name" type="text" required maxlength="255"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Gmail address</label>
          <input v-model="form.email" type="email" required maxlength="255" placeholder="friend@gmail.com"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select v-model="form.role" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button type="submit" :disabled="saving"
          class="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
          {{ saving ? 'Adding…' : 'Add user' }}
        </button>
      </form>
      <p class="text-xs text-gray-500 mt-3">
        The user will be able to sign in with Google using this Gmail. They must also be added as a test user in Google Cloud Console while the OAuth app is in Testing mode.
      </p>
    </div>

    <!-- User list -->
    <LoadingSpinner v-if="loading" />

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <table v-else class="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
      <thead class="bg-gray-50">
        <tr class="text-left text-xs font-semibold text-gray-600 uppercase">
          <th class="px-4 py-2 cursor-pointer select-none" @click="sort('name')">
            Name <span v-if="sortBy === 'name'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
          </th>
          <th class="px-4 py-2 cursor-pointer select-none" @click="sort('email')">
            Email <span v-if="sortBy === 'email'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
          </th>
          <th class="px-4 py-2 cursor-pointer select-none" @click="sort('role')">
            Role <span v-if="sortBy === 'role'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
          </th>
          <th class="px-4 py-2">Status</th>
          <th class="px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id" class="border-t border-gray-100">
          <td class="px-4 py-2">{{ u.name }}</td>
          <td class="px-4 py-2">{{ u.email }}</td>
          <td class="px-4 py-2 capitalize">{{ u.role }}</td>
          <td class="px-4 py-2">
            <span :class="u.is_active ? 'text-green-700' : 'text-gray-400'">
              {{ u.is_active ? 'Active' : 'Disabled' }}
            </span>
          </td>
          <td class="px-4 py-2 flex gap-3">
            <button @click="openEdit(u)" class="text-xs text-indigo-600 hover:underline">
              Edit
            </button>
            <button @click="toggle(u.id)" class="text-xs text-indigo-600 hover:underline">
              {{ u.is_active ? 'Disable' : 'Enable' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Edit user modal -->
    <div v-if="editTarget"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="closeEdit">
      <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Edit user</h2>

        <div v-if="editTarget.google_sub && editForm.email !== editTarget.email"
          class="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm text-amber-800 mb-3">
          Changing this email will disconnect the Google account. The user must sign in again with their new Gmail.
        </div>

        <div v-if="editError" class="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700 mb-3">
          {{ editError }}
        </div>

        <form @submit.prevent="onEdit" class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input v-model="editForm.name" type="text" required maxlength="255"
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input v-model="editForm.email" type="email" required maxlength="255"
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select v-model="editForm.role" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="flex gap-2 pt-1">
            <button type="submit" :disabled="editSaving"
              class="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
              {{ editSaving ? 'Saving…' : 'Save' }}
            </button>
            <button type="button" @click="closeEdit"
              class="text-sm px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue'
import { adminApi } from '@/api/adminApi'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import type { CreateUserInput, User, UserRole } from '@/types/auth'

// List state
const users    = ref<User[]>([])
const loading  = ref(true)
const error    = ref<string | null>(null)
const total    = ref(0)
const page     = ref(1)
const pageSize = ref(20)
const search   = ref('')
const sortBy   = ref<'name' | 'email' | 'role' | 'created_at'>('created_at')
const sortOrder = ref<'ASC' | 'DESC'>('DESC')


// Create form state
const form      = reactive<CreateUserInput>({ name: '', email: '', role: 'member' })
const saving    = ref(false)
const formError = ref<string | null>(null)

// Edit modal state
const editTarget = ref<User | null>(null)
const editForm   = reactive({ name: '', email: '', role: 'member' as UserRole })
const editSaving = ref(false)
const editError  = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await adminApi.listUsers({
      page: page.value, pageSize: pageSize.value,
      search: search.value,
      sortBy: sortBy.value, sortOrder: sortOrder.value,
    })
    users.value = result.data
    total.value = result.total
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err.message || 'Failed to load users.'
  } finally {
    loading.value = false
  }
}

// Debounce search — reset to page 1 on new term
let searchTimer: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
})

function sort(col: typeof sortBy.value) {
  if (sortBy.value === col) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortBy.value = col
    sortOrder.value = 'DESC'
  }
  page.value = 1
  load()
}


async function onCreate() {
  saving.value = true
  formError.value = null
  try {
    await adminApi.createUser({ ...form })
    form.name = ''
    form.email = ''
    form.role = 'member'
    await load()
  } catch (e: unknown) {
    const err = e as { message?: string }
    formError.value = err.message || 'Failed to add user.'
  } finally {
    saving.value = false
  }
}

async function toggle(id: number) {
  try {
    await adminApi.toggleUserActive(id)
    await load()
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err.message || 'Failed to toggle user.'
  }
}

function openEdit(u: User) {
  editTarget.value = u
  editForm.name  = u.name
  editForm.email = u.email
  editForm.role  = u.role
  editError.value = null
}

function closeEdit() {
  editTarget.value = null
}

async function onEdit() {
  if (!editTarget.value) return
  editSaving.value = true
  editError.value = null
  try {
    await adminApi.updateUser(editTarget.value.id, { ...editForm })
    closeEdit()
    await load()
  } catch (e: unknown) {
    const err = e as { message?: string }
    editError.value = err.message || 'Failed to save changes.'
  } finally {
    editSaving.value = false
  }
}

onMounted(load)
</script>