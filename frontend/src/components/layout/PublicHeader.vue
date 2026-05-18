<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
    <div class="max-w-7xl mx-auto px-[15px] h-16 flex items-center justify-between">
      <!-- Logo -->
      <RouterLink to="/" class="font-bold text-xl text-indigo-700 tracking-tight shrink-0">
        RecipeBook
      </RouterLink>

      <!-- Desktop nav -->
      <nav class="hidden md:relative md:flex items-center gap-1 text-sm font-medium"
        @mouseleave="closeDropdown">
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

          <!-- Parent trigger — keeps relative so dropdown centers under it -->
          <div v-else class="relative" @mouseenter="openDropdown(item.id)">
            <component
              :is="item.resolved_url ? (isExternal(item.resolved_url) ? 'a' : RouterLink) : 'button'"
              v-bind="item.resolved_url ? linkProps(item) : {}"
              class="flex items-center gap-1 px-3 py-2 rounded-md text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
              :class="{ 'text-indigo-700 bg-indigo-50': activeDropdown === item.id }"
              active-class="text-indigo-700"
            >
              {{ item.label }}
              <svg class="w-3 h-3 transition-transform" :class="{ 'rotate-180': activeDropdown === item.id }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </component>

            <!-- Dropdown: centered under trigger, right edge clamped to nav -->
            <div
              v-if="activeDropdown === item.id"
              :ref="el => setDropdownRef(el as HTMLElement | null, item.id)"
              class="absolute top-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 flex gap-6 px-5 py-4"
              :style="dropdownStyle(item.id)"
            >
              <div v-for="child in item.children?.filter(c => c.children?.length)" :key="child.id" class="flex flex-col whitespace-nowrap">
                <component
                  :is="child.resolved_url ? (isExternal(child.resolved_url) ? 'a' : RouterLink) : 'span'"
                  v-bind="child.resolved_url ? linkProps(child) : {}"
                  class="text-sm font-semibold text-gray-700 hover:text-indigo-700 transition-colors mb-1.5"
                  active-class="text-indigo-700"
                  @click="closeDropdown"
                >
                  {{ child.label }}
                </component>
                <component
                  v-for="gc in child.children" :key="gc.id"
                  :is="isExternal(gc.resolved_url) ? 'a' : RouterLink"
                  v-bind="linkProps(gc)"
                  class="pl-3 py-0.5 text-sm text-gray-500 hover:text-indigo-700 transition-colors"
                  active-class="text-indigo-700"
                  @click="closeDropdown"
                >
                  {{ gc.label }}
                </component>
              </div>
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
    <div v-if="menuOpen" class="md:hidden border-t border-gray-100 bg-white px-[15px] py-3 flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <template v-if="navItems.length > 0">
        <template v-for="item in navItems" :key="item.id">

          <!-- Level 1: no children — plain link -->
          <component
            v-if="!item.children?.length"
            :is="isExternal(item.resolved_url) ? 'a' : RouterLink"
            v-bind="item.resolved_url ? linkProps(item) : {}"
            class="py-2.5 px-3 text-sm font-medium text-gray-700 hover:text-indigo-700 rounded-md hover:bg-indigo-50 transition-colors"
            @click="menuOpen = false"
          >
            {{ item.label }}
          </component>

          <!-- Level 1: has children — name link + toggle -->
          <div v-else>
            <div class="flex items-center rounded-md hover:bg-indigo-50 transition-colors">
              <component
                :is="item.resolved_url ? (isExternal(item.resolved_url) ? 'a' : RouterLink) : 'span'"
                v-bind="item.resolved_url ? linkProps(item) : {}"
                class="flex-1 py-2.5 pl-3 text-sm font-medium text-gray-700 hover:text-indigo-700 transition-colors"
                @click="item.resolved_url ? (menuOpen = false) : undefined"
              >
                {{ item.label }}
              </component>
              <button
                class="px-3 py-2.5 text-gray-400 hover:text-indigo-600 transition-colors text-base leading-none"
                @click="toggleMobile(item.id)"
              >
                {{ mobileOpen.has(item.id) ? '−' : '+' }}
              </button>
            </div>

            <!-- Level 2 children -->
            <div v-if="mobileOpen.has(item.id)" class="flex flex-col gap-0.5 mt-0.5">
              <template v-for="child in item.children" :key="child.id">

                <!-- Level 2: no children — plain link indented -->
                <component
                  v-if="!child.children?.length"
                  :is="isExternal(child.resolved_url) ? 'a' : RouterLink"
                  v-bind="child.resolved_url ? linkProps(child) : {}"
                  class="py-2 pl-7 pr-3 text-sm text-gray-600 hover:text-indigo-700 rounded-md hover:bg-indigo-50 transition-colors"
                  @click="menuOpen = false"
                >
                  {{ child.label }}
                </component>

                <!-- Level 2: has children — name link + toggle -->
                <div v-else>
                  <div class="flex items-center rounded-md hover:bg-indigo-50 transition-colors">
                    <component
                      :is="child.resolved_url ? (isExternal(child.resolved_url) ? 'a' : RouterLink) : 'span'"
                      v-bind="child.resolved_url ? linkProps(child) : {}"
                      class="flex-1 py-2 pl-7 text-sm text-gray-600 hover:text-indigo-700 transition-colors"
                      @click="child.resolved_url ? (menuOpen = false) : undefined"
                    >
                      {{ child.label }}
                    </component>
                    <button
                      class="px-3 py-2 text-gray-400 hover:text-indigo-600 transition-colors text-base leading-none"
                      @click="toggleMobile(child.id)"
                    >
                      {{ mobileOpen.has(child.id) ? '−' : '+' }}
                    </button>
                  </div>

                  <!-- Level 3 grandchildren -->
                  <div v-if="mobileOpen.has(child.id)" class="flex flex-col gap-0.5 mt-0.5">
                    <component
                      v-for="gc in child.children" :key="gc.id"
                      :is="isExternal(gc.resolved_url) ? 'a' : RouterLink"
                      v-bind="linkProps(gc)"
                      class="py-2 pl-12 pr-3 text-sm text-gray-500 hover:text-indigo-700 rounded-md hover:bg-indigo-50 transition-colors"
                      @click="menuOpen = false"
                    >
                      {{ gc.label }}
                    </component>
                  </div>
                </div>

              </template>
            </div>
          </div>

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
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { publicApi } from '@/api/publicApi'
import type { NavItem } from '@/types/navItem'

const menuOpen        = ref(false)
const activeDropdown  = ref<number | null>(null)
const navItems        = ref<NavItem[]>([])
const mobileOpen      = ref(new Set<number>())
const dropdownRefs    = new Map<number, HTMLElement>()
const dropdownOffsets = ref<Record<number, string>>({})

onMounted(async () => {
  try { navItems.value = await publicApi.nav() } catch { /* use fallback */ }
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => document.removeEventListener('click', onDocClick))

function onDocClick(e: MouseEvent) {
  if (!(e.target as Element).closest('header')) closeDropdown()
}

function setDropdownRef(el: HTMLElement | null, itemId: number) {
  if (el) dropdownRefs.set(itemId, el)
  else dropdownRefs.delete(itemId)
}

// Default: centered under trigger via left:50% translateX(-50%).
// After render, shift left if the right edge overflows past the nav.
function dropdownStyle(itemId: number) {
  const offset = dropdownOffsets.value[itemId] ?? '0px'
  return { left: '50%', transform: `translateX(calc(-50% - ${offset}))` }
}

async function openDropdown(id: number) {
  activeDropdown.value = id
  dropdownOffsets.value = { ...dropdownOffsets.value, [id]: '0px' }
  await nextTick()
  const el = dropdownRefs.get(id)
  if (!el) return
  const navEl = el.closest('nav')
  if (!navEl) return
  const { right: elRight } = el.getBoundingClientRect()
  const { right: navRight } = navEl.getBoundingClientRect()
  if (elRight > navRight) {
    dropdownOffsets.value = { ...dropdownOffsets.value, [id]: `${elRight - navRight}px` }
  }
}

function closeDropdown() { activeDropdown.value = null }

function toggleMobile(id: number) {
  const s = new Set(mobileOpen.value)
  s.has(id) ? s.delete(id) : s.add(id)
  mobileOpen.value = s
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
