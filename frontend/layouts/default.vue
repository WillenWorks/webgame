      
<template>
  <div class="min-h-screen flex flex-col relative overflow-hidden">
    <!-- CRT Effects -->
    <div class="scanline"></div>
    <div class="crt-overlay"></div>

    <!-- Header / Status Bar -->
    <header class="relative z-10 border-b-4 border-amber-500 bg-slate-900 p-4">
      <div class="container mx-auto flex justify-between items-end">
        <div>
          <h1 class="text-xl md:text-2xl text-amber-400 mb-1 animate-pulse">IGI // OPERAÇÃO MUNDO</h1>
          <p class="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.2em]">SISTEMA DE INTELIGÊNCIA GEOGRÁFICA</p>
        </div>
        <div class="hidden md:block text-right">
          <p class="font-mono text-red-400 text-sm">{{ currentDate }}</p>
          <p class="font-mono text-xs text-slate-500">CONN: SECURE</p>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 container mx-auto p-4 md:p-8 relative z-10">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="relative z-10 p-2 text-center text-[10px] font-mono text-slate-600 border-t border-slate-800">
      IGI TERMINAL v3.0.1 (NUXT EDITION) // UNAUTHORIZED ACCESS IS A FELONY
    </footer>
  </div>
</template>

<script setup>
const currentDate = new Date().toISOString().split('T')[0]
</script>

<style>
/* Global transitions can go here */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s;
  filter: blur(0);
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(4px) brightness(2);
}
</style>

    