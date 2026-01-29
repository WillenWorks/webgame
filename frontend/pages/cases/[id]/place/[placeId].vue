<template>
  <div class="flex flex-col gap-6 max-w-4xl mx-auto w-full p-4 h-full relative">
    
    <!-- Top Bar: Location Info -->
    <div class="flex justify-between items-center bg-black/80 p-4 border-b-2 border-amber-500 shadow-lg z-20">
      <div>
        <h2 class="text-xl font-display text-amber-400 uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
          {{ placeName || "LOCAL DESCONHECIDO" }}
        </h2>
        <p class="text-cyan-400 font-mono text-xs uppercase">
          INTERROGANDO TESTEMUNHA...
        </p>
      </div>
      <RetroButton variant="outline" @click="leavePlace" class="text-xs">
        SAIR DO LOCAL
      </RetroButton>
    </div>

    <!-- Main Content: NPC Interaction -->
    <div class="flex-1 relative flex items-center justify-center overflow-hidden border-2 border-slate-700 bg-slate-900">
      
      <!-- Background / Scene (blurred or stylized) -->
      <div class="absolute inset-0 opacity-30 bg-[url('/images/scanlines.png')] bg-repeat z-10 pointer-events-none"></div>
      
      <!-- NPC Image -->
      <div class="relative z-0 w-full h-full flex items-center justify-center p-8">
         <div class="w-64 h-64 md:w-80 md:h-80 border-4 border-slate-800 bg-black shadow-2xl relative">
            <!-- Uses dynamic NPC image if available, else a placeholder -->
            <img 
              :src="npcImage || '/images/suspect-placeholder.png'" 
              class="w-full h-full object-cover filter contrast-125 sepia-[.3]"
              alt="NPC"
              @error="handleImageError"
            />
            <!-- Overlay de "FALANDO" -->
            <div class="absolute bottom-2 right-2 flex gap-1">
               <div class="w-2 h-2 bg-red-500 animate-pulse"></div>
               <div class="w-2 h-2 bg-red-500 animate-pulse delay-75"></div>
               <div class="w-2 h-2 bg-red-500 animate-pulse delay-150"></div>
            </div>
         </div>
      </div>

      <!-- Dialogue Box (Bottom) -->
      <div class="bottom-0 left-0 w-full p-4 md:p-8 z-30">
        <RetroCard extraClass="border-amber-500/80 bg-black/95 shadow-[0_-4px_20px_rgba(0,0,0,0.8)]">
          <div class="flex flex-col gap-2 min-h-[120px]">
            <div class="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
               <span class="text-amber-400 font-display text-sm uppercase">
                 {{ npcName || "CIDADÃO" }}
               </span>
               <span class="text-[10px] text-slate-500 font-mono">
                 // RELATÓRIO #{{ Math.floor(Math.random() * 9999) }}
               </span>
            </div>
            
            <p class="font-mono text-lg text-white leading-relaxed uppercase typing-effect">
              "{{ cleanDialogue }}"
            </p>
            
            <div class="mt-auto pt-4 flex justify-end">
               <span class="text-xs text-slate-500 font-mono animate-pulse">CLIQUE EM 'SAIR' PARA CONTINUAR INVESTIGAÇÃO</span>
            </div>
          </div>
        </RetroCard>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'

const route = useRoute()
const router = useRouter()
const { id, placeId } = route.params

// State
// Since we navigate via router.push with state, we try to grab it from history
// Ideally we could also fetch details if missing, but for now we rely on the passed state
const placeName = ref(history.state.placeName || 'LOCAL')
const npcName = ref(history.state.placeName ? `${history.state.placeName} Staff` : 'NPC') 
const rawDialogue = ref(history.state.dialogue || '')

// Fallback image logic:
const npcImage = ref(null) 

// Robust cleaning logic in case useGame.ts fix wasn't enough or for existing state
const cleanDialogue = computed(() => {
  if (!rawDialogue.value) return "..."
  
  let text = rawDialogue.value
  
  // Try to parse if it looks like JSON (Secondary check for robustness)
  if (typeof text === 'string' && text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text)
      text = parsed.TEXT || parsed.text || text
    } catch (e) {
      console.warn("Failed to parse dialogue JSON in Component", e)
    }
  }

  // Formatting cleanup
  return text.text // Remove wrapping quotes if any
})

const leavePlace = () => {
  router.push(`/cases/${id}/city`)
}

const handleImageError = (e) => {
    e.target.src = '/images/suspect-placeholder.png'
}

onMounted(() => {
  if (!rawDialogue.value) {
     console.warn("No dialogue state found")
  }
})
</script>

<style scoped>
.typing-effect {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
