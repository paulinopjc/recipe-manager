<template>
  <footer class="bg-white border-t border-gray-200 mt-16">
    <div class="max-w-7xl mx-auto px-[15px] py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
      <span class="font-semibold text-gray-700">RecipeBook</span>
      <nav class="flex gap-6">
        <RouterLink to="/" class="hover:text-indigo-700 transition-colors">Home</RouterLink>
        <RouterLink to="/recipes" class="hover:text-indigo-700 transition-colors">Recipes</RouterLink>
      </nav>
      <span>&copy; {{ year }} RecipeBook. All rights reserved.</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
