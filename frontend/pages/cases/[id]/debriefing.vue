<template>
  <div class="h-full flex items-center justify-center p-4">
    <div class="max-w-2xl w-full space-y-8 text-center">
      
      <div v-if="status === 'SOLVED'" class="space-y-6">
        <h1 class="text-6xl font-display text-green-500 animate-bounce">SUCESSO</h1>
        <p class="text-xl font-mono text-slate-300">
          CASO ENCERRADO. ARTEFATO RECUPERADO.
        </p>
      </div>

      <div v-else class="space-y-6">
        <h1 class="text-6xl font-display text-red-500 animate-pulse">FALHA</h1>
        <p class="text-xl font-mono text-slate-300">
          O SUSPEITO ESCAPOU. RASTRO PERDIDO.
        </p>
      </div>

      <RetroCard extraClass="bg-black/80 border-slate-700">
        <div class="p-6 space-y-4 font-mono text-sm leading-relaxed text-slate-300">
          <p>{{ message || 'Relatório final indisponível.' }}</p>
        </div>
      </RetroCard>

      <div class="grid grid-cols-2 gap-8 max-w-md mx-auto">
        <div class="text-center p-4 border border-slate-700 bg-slate-900/50">
          <span class="block text-xs text-slate-500 mb-2">XP OBTIDO</span>
          <span class="text-3xl" :class="xp > 0 ? 'text-green-400' : 'text-slate-400'">
            {{ xp > 0 ? '+' : '' }}{{ xp }}
          </span>
        </div>
        <div class="text-center p-4 border border-slate-700 bg-slate-900/50">
          <span class="block text-xs text-slate-500 mb-2">REPUTAÇÃO</span>
          <span class="text-3xl" :class="rep > 0 ? 'text-cyan-400' : 'text-red-400'">
             {{ rep > 0 ? '+' : '' }}{{ rep }}
          </span>
        </div>
      </div>

      <div class="pt-8">
        <RetroButton @click="finish" class="w-full md:w-auto">
          ARQUIVAR CASO E VOLTAR AO QG
        </RetroButton>
      </div>

    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'

const route = useRoute()
const router = useRouter()

const status = ref('')
const xp = ref(0)
const rep = ref(0)
const message = ref('')

onMounted(() => {
  status.value = route.query.status || 'UNKNOWN'
  xp.value = Number(route.query.xp) || 0
  rep.value = Number(route.query.rep) || 0
  message.value = route.query.msg || ''
})

const finish = () => {
  router.push('/')
}
</script>
