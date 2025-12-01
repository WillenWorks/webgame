<!-- frontend/pages/game.vue -->
<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
    <div class="max-w-md text-center space-y-3">
      <p class="text-xs tracking-[0.25em] text-sky-400 uppercase">
        IGI // International Geointelligence Initiative
      </p>
      <h1 class="text-xl font-bold text-slate-50">
        Redirecionando para o novo modo de investigação
      </h1>
      <p class="text-sm text-slate-300">
        O caso piloto agora usa o sistema de múltiplos casos com dossiês e integração com IA.
        Você será enviado para o Centro de Operações atualizado.
      </p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router"
import { onMounted } from "vue"

const router = useRouter()

onMounted(() => {
  // Usa replace pra não deixar /game no histórico
  router.replace("/cases")
})
</script>
