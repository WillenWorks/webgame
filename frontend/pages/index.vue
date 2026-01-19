<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center space-y-6 max-w-lg w-full">
      
      <div class="space-y-2">
        <h2 class="text-3xl md:text-4xl text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
          INICIALIZANDO...
        </h2>
        <p class="font-mono text-amber-500 animate-pulse text-sm">
          CARREGANDO MÓDULOS DE RASTREAMENTO
        </p>
      </div>
      
      <!-- Card Retro -->
      <div class="retro-card text-left mt-8 bg-black/40">
        <div class="space-y-2 font-mono text-sm text-slate-300">
          <p>> Verificando conexão segura... <span class="text-green-400">OK</span></p>
          <p>> Carregando banco de dados de vilões... <span class="text-green-400">OK</span></p>
          <p>> Sincronizando satélites... <span class="text-green-400">OK</span></p>
          <p class="animate-pulse">> AGUARDANDO CREDENCIAIS...</p>
        </div>
        
        <div class="mt-8 text-center border-t border-slate-700 pt-6">
          <NuxtLink to="/login" class="retro-btn w-full block">
            Acessar Terminal
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const token = useCookie('auth_token')

onMounted(() => {
  // Auto-redirect se já tiver token
  if (token.value) {
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  }
})
</script>

    