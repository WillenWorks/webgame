<template>
  <div class="flex flex-col gap-6 max-w-4xl mx-auto w-full p-4 h-full">
    <div class="flex justify-between items-center bg-black/50 p-4 border-2 border-amber-500 shadow-lg">
      <h2 class="text-2xl font-display text-amber-400 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
        VILÕES CAPTURADOS
      </h2>
      <RetroButton variant="outline" @click="router.push('/dashboard')">VOLTAR</RetroButton>
    </div>

    <RetroCard title="GALERIA DE FORAGIDOS DETIDOS" extraClass="border-cyan-500/50 flex-1">
      <div v-if="loading" class="text-center text-cyan-500 py-12 font-mono animate-pulse">
        CONSULTANDO A INTERPOL...
      </div>

      <div v-else-if="villains.length === 0" class="text-center text-slate-500 py-12 font-mono">
        NENHUM VILÃO CAPTURADO AINDA. FECHE UM CASO COM SUCESSO.
      </div>

      <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar p-2">
        <div
          v-for="v in villains"
          :key="v.id"
          class="border border-slate-800 bg-black/40 p-4 flex gap-4 items-start hover:bg-white/5 transition-colors"
        >
          <div class="w-16 h-16 bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center">
            <img src="/images/suspect-placeholder.png" alt="" class="w-full h-full object-cover grayscale" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-amber-400 font-display text-base uppercase">{{ v.villain_name }}</h4>
              <span class="text-[10px] px-1.5 py-0.5 border border-green-500 text-green-400 bg-green-500/10">DETIDO</span>
              <span class="text-[10px] text-slate-500 font-mono">{{ formatDate(v.created_at) }}</span>
            </div>
            <p v-if="attrLine(v)" class="text-xs text-slate-400 font-mono mt-1 uppercase">{{ attrLine(v) }}</p>
            <p v-if="v.final_dialogue" class="text-xs text-slate-500 italic mt-2 border-l-2 border-slate-700 pl-2">
              "{{ v.final_dialogue }}"
            </p>
          </div>
        </div>
      </div>
    </RetroCard>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'
import { useApi } from '~/composables/useApi'

const router = useRouter()
const api = useApi()
const villains = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api('/captured')
    villains.value = res?.captures ?? []
  } catch (e) {
    console.error('Erro ao carregar vilões', e)
    villains.value = []
  } finally {
    loading.value = false
  }
})

const attrLine = (v) => {
  const a = v.attributes_snapshot
  if (!a || typeof a !== 'object') return ''
  return [a.sex, a.hair, a.hobby, a.vehicle, a.feature].filter(Boolean).join(' · ')
}

const formatDate = (val) => {
  try {
    const d = new Date(val)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
  } catch {
    return ''
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #0ea5e9; border: 1px solid #000; }
</style>
