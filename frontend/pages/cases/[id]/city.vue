<template>
  <div class="flex flex-col gap-6 max-w-4xl mx-auto w-full h-full relative">
    
    <!-- City Header & Visual (New Layout) -->
    <div class="relative w-full border-2 border-amber-500 shadow-lg z-10 bg-black">
      
      <!-- Top Bar (Name) -->
      <div class="absolute top-0 left-0 right-0 z-20 flex justify-between items-center bg-black/70 p-4 border-b border-amber-500/50 backdrop-blur-sm">
        <div>
          <h2 class="text-2xl font-display text-amber-400 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
            {{ currentCity?.city_name || "CARREGANDO..." }}
          </h2>
          <p class="text-cyan-400 font-mono tracking-widest text-sm uppercase">
            {{ currentCity?.country_name }}
          </p>
        </div>
        <RetroButton variant="outline" @click="goToMap">
          VOLTAR AO MAPA
        </RetroButton>
      </div>

      <!-- Main City Image -->
      <div class="relative h-[300px] w-full overflow-hidden group">
         <!--
            Correct logic for city images: /images/cities/city_name.jpg
            Fallback to placeholder if not found.
         -->
         <img 
            v-if="currentCity?.city_name"
            :src="getCityImageUrl(currentCity?.city_name)" 
            class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-1000" 
            @error="handleCityImgError"
         />
         <img v-else src="/images/city_bg.jpg" class="w-full h-full object-cover" />
         
         <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
      </div>

      <!-- City Description & Actions -->
      <div class="relative bg-black border-t-2 border-slate-700 p-6 flex flex-col md:flex-row gap-6 items-start">
         <div class="flex-1">
            <h3 class="text-amber-500 font-display text-lg mb-2 uppercase">Informações do Local</h3>
            <p class="font-mono text-slate-300 leading-relaxed text-sm md:text-base">
               {{ currentCity?.description_prompt || "Nenhuma informação disponível sobre esta cidade no banco de dados." }}
            </p>
         </div>
         
         <div class="flex flex-row md:flex-col gap-3 w-full md:w-auto min-w-[200px]">
            <!-- Alterado para ir ao Dossier, conforme solicitado -->
            <RetroButton class="w-full" variant="danger" @click="openWarrant">
              DOSSIÊ / MANDADO
            </RetroButton>
            <!-- Botão de Viajar removido pois é redundante com Voltar ao Mapa -->
         </div>
      </div>

    </div>

    <!-- Main Interaction Area (Places List) -->
    <div class="flex-1 min-h-0">
      <!-- Title changed from LOCAIS DE INTERESSE to LOCALIDADES -->
      <RetroCard title="LOCALIDADES" extraClass="border-cyan-500/50 flex flex-col h-full bg-slate-900/80">
        <div v-if="isLoading && !places.length" class="flex justify-center p-8">
          <p class="animate-pulse text-cyan-400">ESCANEANDO ÁREA...</p>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 overflow-y-auto custom-scrollbar">
          <button
            v-for="place in places"
            :key="place.id"
            @click="confirmInvestigate(place)"
            :disabled="!!investigating"
            class="group relative border-2 border-slate-700 hover:border-amber-400 bg-black/60 p-4 transition-all hover:bg-amber-400/10 active:translate-y-1 disabled:opacity-50 flex flex-col gap-3"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-black border border-slate-700 p-1 group-hover:border-amber-400 transition-colors flex items-center justify-center shrink-0">
                 <!-- Place Image -->
                 <img :src="getPlaceImage(place)" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" @error="handleImgError" />
              </div>
              <div class="text-left">
                <h3 class="text-lg font-display text-white group-hover:text-amber-400 transition-colors uppercase leading-tight">
                  {{ place.name }}
                </h3>
                <!-- Environment Type REMOVED as requested -->
              </div>
            </div>
          </button>
        </div>
      </RetroCard>
    </div>

    <!-- MODAL DE CONFIRMAÇÃO & ANIMAÇÃO -->
    <div v-if="selectedPlace" class="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-hidden">
      
      <!-- Background Image of the specific Place -->
      <div class="absolute inset-0 opacity-40">
         <img 
           :src="getPlaceImage(selectedPlace)" 
           class="w-full h-full object-cover filter blur-[2px] scale-105"
           @error="handleImgError"
         />
         <div class="absolute inset-0 bg-black/60"></div>
      </div>

      <!-- Loading Animation (Footprints) -->
      <div v-if="investigating" class="relative z-10 flex flex-col items-center justify-center">
         <div class="footprints-container mb-4 scale-150">
           <div class="footprint left"></div>
           <div class="footprint right"></div>
           <div class="footprint left delay-1"></div>
           <div class="footprint right delay-1"></div>
         </div>
         <p class="text-amber-400 font-mono animate-pulse text-lg bg-black/50 px-4 py-2 rounded border border-amber-500/30">
            INVESTIGANDO O LOCAL...
         </p>
      </div>

      <!-- Confirmation Card -->
      <RetroCard v-else extraClass="relative z-10 max-w-md w-full border-amber-500 shadow-[0_0_50px_rgba(251,191,36,0.2)] animate-in fade-in zoom-in-95 duration-200 bg-slate-900/90">
        <div class="text-center space-y-6 p-4">
          <div class="w-full h-32 border border-slate-600 bg-black mb-4 overflow-hidden relative">
              <img 
               :src="getPlaceImage(selectedPlace)" 
               class="w-full h-full object-cover"
               @error="handleImgError"
             />
             <div class="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                <!-- Interaction Style REMOVED as requested (was environments types) -->
             </div>
          </div>

          <h3 class="text-2xl font-display text-white uppercase tracking-wider">VISITAR {{ selectedPlace.name }}?</h3>
          
          <div class="py-2 px-4 border-y border-dashed border-slate-700 bg-black/20">
            <p class="text-slate-300 text-sm leading-relaxed">
               Deseja se deslocar até este local para interrogar testemunhas e buscar pistas?
            </p>
          </div>

          <div class="flex gap-4 pt-2">
            <RetroButton variant="outline" class="flex-1" @click="selectedPlace = null">CANCELAR</RetroButton>
            <RetroButton variant="default" class="flex-1" @click="executeInvestigate" :disabled="investigating">
              CONFIRMAR
            </RetroButton>
          </div>
        </div>
      </RetroCard>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'
import { useGame } from '~/composables/useGame'

const route = useRoute()
const router = useRouter()
const caseId = route.params.id

const { visitCurrentCity, investigatePlace, isLoading } = useGame()

const cityData = ref(null)
const currentCity = ref(null)
const places = ref([])

const selectedPlace = ref(null)
const investigating = ref(false)

onMounted(async () => {
  if (caseId) {
    await loadCity()
  }
})

const loadCity = async () => {
  try {
    const data = await visitCurrentCity(caseId)
    if (data) {
      cityData.value = data
      currentCity.value = data.city
      places.value = data.places || []
    }
  } catch (e) {
    console.error(e)
  }
}

// Helper to normalize strings for filenames (e.g. "São Paulo" -> "sao-paulo")
const slugify = (text) => {
  if (!text) return ''
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
}

const getCityImageUrl = (cityName) => {
    // Logic: public/images/cities/nome-da-cidade.jpeg
    // User requested "nome da cidade que vem do banco". 
    // Usually filenames are lowercase slugified.
    if (!cityName) return '/images/city_bg.jpg'
    // Assuming .jpeg or .jpg. We try .jpeg first as per common assets
    return `/images/cities/${slugify(cityName)}/aeroporto.jpeg`.replace('aeroporto.jpeg', '') + `${slugify(cityName)}.jpeg`
    // Actually simpler: /images/cities/<slug>.jpeg 
    // Wait, user said: "public/images/cities/'nome da cidade que vem do banco'"
    // Let's assume just slugified name + extension. 
    // Or if the folder structure is /images/cities/<city_id>/... 
    // The user example for places was: public/images/cities/places/'id'/'place'.
    // For cities: "public/images/cities/'nome'".
    // Let's stick to a safe path construction.
    
    // Check if the structure is flat for cities:
    return `/images/cities/${slugify(cityName)}.jpeg`
}

const getPlaceImage = (place) => {
    if (!currentCity.value || !place) return '/images/city_bg.jpg'
    
    // User logic: "public/images/cities/places/'numero do id da cidade'/'nome da localidade'"
    // City ID might be a UUID or Int. Let's use the ID from currentCity.
    const cityId = currentCity.value.city_id // This should be the ID
    const placeName = slugify(place.name)
    
    // Check extension logic. Assuming .jpeg based on previous file lists.
    return `/images/cities/${cityId}/${placeName}.jpeg`
}

const handleCityImgError = (e) => {
    e.target.src = '/images/city_bg.jpg'
}

const handleImgError = (e) => {
    // If specific place image fails, fallback to generic icon or placeholder
    e.target.style.display = 'none' // Hide image to show icon behind or background
}

const confirmInvestigate = (place) => {
  selectedPlace.value = place
}

const executeInvestigate = async () => {
  if (!selectedPlace.value) return
  
  investigating.value = true
  const place = selectedPlace.value
  
  await new Promise(r => setTimeout(r, 1500))

  try {
    const res = await investigatePlace(caseId, place.id)
    if (res.ok) {
      router.push({
        path: `/cases/${caseId}/place/${place.id}`,
        state: { 
           placeName: place.name,
           dialogue: res.text
        }
      })
    } else {
      alert('Investigação falhou: ' + (res.message || 'Erro desconhecido'))
      selectedPlace.value = null
    }
  } catch (e) {
    console.error(e)
    alert('Erro de conexão.')
  } finally {
    investigating.value = false
  }
}

const goToMap = () => {
  router.push(`/cases/${caseId}/map`)
}

const openWarrant = () => {
  router.push(`/cases/${caseId}/dossier`)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0f172a;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 2px;
}

/* Footprints Animation */
.footprints-container {
  width: 60px;
  height: 100px;
  position: relative;
}

.footprint {
  width: 20px;
  height: 30px;
  background: #fbbf24;
  position: absolute;
  border-radius: 50% 50% 40% 40%;
  opacity: 0;
  animation: step 2s infinite;
  box-shadow: 0 0 10px rgba(251,191,36,0.5);
}

.left {
  left: 0;
  top: 0;
  transform: rotate(-10deg);
}

.right {
  right: 0;
  top: 40px;
  transform: rotate(10deg);
  animation-delay: 1s;
}

.delay-1 {
    animation-delay: 1s; 
}

@keyframes step {
  0% { opacity: 0; transform: translateY(20px) scale(0.8); }
  20% { opacity: 1; transform: translateY(0) scale(1); }
  40% { opacity: 0; }
  100% { opacity: 0; }
}

.footprint:nth-child(1) { animation: step 2s infinite 0s; left: 10px; top: 0; }
.footprint:nth-child(2) { animation: step 2s infinite 0.5s; right: 10px; top: 30px; }
.footprint:nth-child(3) { animation: step 2s infinite 1.0s; left: 10px; top: 60px; }
.footprint:nth-child(4) { animation: step 2s infinite 1.5s; right: 10px; top: 90px; }
</style>
