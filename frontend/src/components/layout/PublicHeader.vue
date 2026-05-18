<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
    <div class="max-w-7xl mx-auto px-[15px] h-16 flex items-center justify-between">
      <!-- Logo -->
      <RouterLink to="/" class="font-bold text-xl text-indigo-700 tracking-tight shrink-0">
        RecipeBook
      </RouterLink>

      <!-- Desktop nav -->
      <nav class="hidden md:flex items-center gap-1 text-sm font-medium">
        <template v-for="item in navItems" :key="item.id">
          <!-- Simple link (no children) -->
          <component
            v-if="!item.children?.length"
            :is="isExternal(item.resolved_url) ? 'a' : RouterLink"
            v-bind="linkProps(item)"
            class="px-3 py-2 rounded-md text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
            active-class="text-indigo-700"
          >
            {{ item.label }}
          </component>

          <!-- Dropdown parent -->
          <div v-else class="relative" @mouseenter="openDropdown(item.id)" @mouseleave="closeDropdown">
            <component
              :is="item.resolved_url ? (isExternal(item.resolved_url) ? 'a' : RouterLink) : 'button'"
              v-bind="item.resolved_url ? linkProps(item) : {}"
              class="flex items-center gap-1 px-3 py-2 rounded-md text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
              active-class="text-indigo-700"
              @click="item.resolved_url ? undefined : toggleDropdown(item.id)"
            >
              {{ item.label }}
              <svg class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': activeDropdown === item.id }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </component>

            <!-- Dropdown panel -->
            <div v-if="activeDropdown === item.id"
              class="absolute top-full left-0 mt-1 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
              <component
                v-for="child in item.children" :key="child.id"
                :is="isExternal(child.resolved_url) ? 'a' : RouterLink"
                v-bind="linkProps(child)"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                active-class="text-indigo-700 bg-indigo-50"
                @click="closeDropdown"
              >
                {{ child.label }}
              </component>
            </div>
          </div>
        </template>

        <!-- Fallback static links when no nav items configured -->
        <template v-if="navItems.length === 0">
          <RouterLink to="/" class="px-3 py-2 rounded-md text-gray-600 hover:text-indigo-700 transition-colors" active-class="text-indigo-700">
            Home
          </RouterLink>
          <RouterLink to="/recipes" class="px-3 py-2 rounded-md text-gray-600 hover:text-indigo-700 transition-colors" active-class="text-indigo-700">
            Recipes
          </RouterLink>
        </template>
      </nav>

      <!-- Mobile hamburger -->
      <button
        @click="menuOpen = !menuOpen"
        class="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle menu">
        <svg v-if="!menuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <div v-if="menuOpen" class="md:hidden border-t border-gray-100 bg-white px-[15px] py-3 flex flex-col gap-1">
      <template v-if="navItems.length > 0">
        <template v-for="item in navItems" :key="item.id">
          <component
            :is="item.resolved_url ? (isExternal(item.resolved_url) ? 'a' : RouterLink) : 'div'"
            v-bind="item.resolved_url ? linkProps(item) : {}"
            class="py-2.5 px-3 text-sm font-medium text-gray-700 hover:text-indigo-700 rounded-md hover:bg-indigo-50"
            @click="item.resolved_url ? (menuOpen = false) : undefined"
          >
            {{ item.label }}
          </component>
          <component
            v-for="child in item.children" :key="child.id"
            :is="isExternal(child.resolved_url) ? 'a' : RouterLink"
            v-bind="linkProps(child)"
            class="py-2 pl-8 pr-3 text-sm text-gray-600 hover:text-indigo-700 rounded-md hover:bg-indigo-50"
            @click="menuOpen = false"
          >
            {{ child.label }}
          </component>
        </template>
      </template>
      <template v-else>
        <RouterLink to="/" class="py-2.5 px-3 text-sm font-medium text-gray-700 hover:text-indigo-700" @click="menuOpen = false">
          Home
        </RouterLink>
        <RouterLink to="/recipes" class="py-2.5 px-3 text-sm font-medium text-gray-700 hover:text-indigo-700" @click="menuOpen = false">
          Recipes
        </RouterLink>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { publicApi } from '@/api/publicApi'
import type { NavItem } from '@/types/navItem'

const menuOpen      = ref(false)
const activeDropdown = ref<number | null>(null)
const navItems      = ref<NavItem[]>([])

onMounted(async () => {
  try { navItems.value = await publicApi.nav() } catch { /* use fallback */ }
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => document.removeEventListener('click', onDocClick))

function onDocClick(e: MouseEvent) {
  if (!(e.target as Element).closest('.relative')) closeDropdown()
}

function openDropdown(id: number)  { activeDropdown.value = id }
function closeDropdown()           { activeDropdown.value = null }
function toggleDropdown(id: number) {
  activeDropdown.value = activeDropdown.value === id ? null : id
}

function isExternal(url: string | null): boolean {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'))
}

function linkProps(item: NavItem) {
  const url = item.resolved_url
  if (!url) return {}
  if (isExternal(url)) return { href: url, target: '_blank', rel: 'noopener noreferrer' }
  return { to: url }
}
</script>
