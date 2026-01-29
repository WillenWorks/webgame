<template>
  <div class="min-h-screen flex flex-col relative overflow-hidden bg-slate-950">
    <!-- CRT Effects -->
    <div class="scanline pointer-events-none"></div>
    <div class="crt-overlay pointer-events-none"></div>

    <!-- Header / Status Bar -->
    <header class="relative z-50 border-b-4 border-amber-500 bg-slate-900 p-4 shadow-lg">
      <div class="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        
        <!-- Logo Area -->
        <div class="flex items-center gap-4">
           <div class="w-10 h-10 bg-amber-500 flex items-center justify-center font-black text-slate-900 text-xl rounded">
             IGI
           </div>
           <div>
             <h1 class="text-xl md:text-2xl text-amber-400 mb-0 font-display tracking-wider">OPERAÇÃO MUNDO</h1>
             <p class="text-[10px] md:text-xs font-mono text-cyan-400 tracking-[0.2em] uppercase">Sistema de Inteligência Geográfica</p>
           </div>
        </div>

        <!-- Global Clock Component (Only visible if game is active/time exists) -->
        <div class="flex-1 flex justify-center md:justify-end">
           <GameClock />
        </div>

      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 container mx-auto p-4 md:p-6 relative z-10 flex flex-col min-h-0">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="relative z-10 p-2 text-center text-[10px] font-mono text-slate-600 border-t border-slate-800 bg-slate-900">
      IGI TERMINAL v3.0.1 (NUXT EDITION) // UNAUTHORIZED ACCESS IS A FELONY
    </footer>
  </div>
</template>

<script setup>
import GameClock from '@/components/GameClock.vue'
</script>

<style>
/* Global transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease-out;
  transform: scale(1);
  opacity: 1;
  filter: blur(0);
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: scale(0.98);
  filter: blur(4px);
}

/* CRT Scanline Animation */
.scanline {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(0, 0, 0, 0.1) 51%
  );
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 9998;
}

.crt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 100%);
  pointer-events: none;
  z-index: 9999;
}
</style>
