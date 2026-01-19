<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

    <!-- Mapa Mundi (Viewport) -->
    <div class="lg:col-span-2 relative min-h-[400px] border-4 border-amber-500 bg-black overflow-hidden group">
      <!-- Imagem do Mapa -->
      <div
        class="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-80 transition-opacity duration-1000"
        style="background-image: url('/images/world_map.jpg')" />
      <!-- Grade Tática -->
      <div
        class="absolute inset-0 bg-[linear-gradient(transparent_50%,_rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none" />
      <div class="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-20 pointer-events-none">
        <div v-for="i in 72" :key="i" class="border border-cyan-500/50" />
      </div>

      <!-- HUD Overlay -->
      <div class="absolute top-4 left-4 z-20">
        <div v-if="cityPosition" class="bg-black/80 border border-amber-500 p-2 text-xs font-mono text-amber-400">
          <p v-if="cityPosition.lat">LAT: {{ cityPosition.lat }}</p>
          <p v-if="cityPosition.lon">LON: {{ cityPosition.lon }}</p>
          <p class="animate-pulse">TRACKING: ACTIVE</p>
        </div>
        <div v-else class="text-red-500">
          DADOS DE LOCALIZAÇÃO INDISPONÍVEIS
        </div>
      </div>

      <!-- Marcador Local Atual -->
      <div v-if="markerPosition" class="absolute flex flex-col items-center animate-pulse z-10" :style="{
        left: markerPosition.x + 'px',
        top: markerPosition.y + 'px',
        transform: 'translate(-50%, -100%)'
      }">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>

        <span class="bg-black/80 text-red-500 px-2 py-1 font-mono text-xs border border-red-500 mt-1 uppercase">
          {{ currentCity?.city_name || "LOCALIZANDO..." }}
        </span>
      </div>
      <div v-if="markerPosition" class="absolute" :style="{
        left: markerPosition.x + 'px',
        top: markerPosition.y + 'px'
      }">
        <div class="marker" />
      </div>
    </div>

    <!-- Controles de Viagem -->
    <div class="space-y-6">
      <RetroCard>
        <template #header>
          <div class="flex items-center gap-2 text-cyan-400">
            <span>PLANO DE VOO</span>
          </div>
        </template>

        <div class="bg-slate-800/50 p-4 border border-slate-700 mb-6">
          <p class="text-xs text-slate-500 mb-1">ORIGEM</p>
          <p class="text-xl text-white font-display uppercase">
            {{ currentCity?.city_name || "DESCONHECIDO" }}, {{ currentCity?.country_name }}
          </p>
        </div>

        <div class="space-y-3">
          <p class="text-xs text-slate-500 flex items-center gap-2">
            DESTINOS DISPONÍVEIS <span class="animate-pulse">_</span>
          </p>

          <div v-if="isLoading" class="flex justify-center py-8">
            <span class="animate-pulse text-cyan-400">CALCULANDO ROTAS...</span>
          </div>

          <div v-else-if="destinations.length === 0"
            class="text-red-400 text-sm p-4 border border-red-900 bg-red-900/10">
            NENHUMA ROTA ENCONTRADA. INVESTIGUE MAIS NA CIDADE ATUAL.
          </div>

          <div v-else class="grid gap-3">
            <button v-for="city in destinations" :key="city.id"
              class="group w-full flex justify-between items-center p-4 border-2 border-cyan-900 hover:border-cyan-400 bg-slate-900 text-cyan-400 hover:text-cyan-100 hover:bg-cyan-900/20 transition-all text-left disabled:opacity-50"
              @click="handleTravel(city.id)" :disabled="traveling">
              <div>
                <span class="block text-sm font-bold font-display">{{ city.city_name }}</span>
                <span class="block text-[10px] opacity-70 font-mono">{{ city.country_name }}</span>
              </div>
              <!-- Ícone de avião -->
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                <path d="M2 12h20" />
                <path d="m13 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>


        <div class="mt-8 pt-4 border-t border-dashed border-slate-700">
          <RetroButton block variant="outline" @click="goToCity">
            INVESTIGAR LOCAL ATUAL
          </RetroButton>
        </div>
      </RetroCard>

    </div>
  </div>
</template>

<script setup lang="ts">
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'

interface City {
  id: string
  city_name: string
  country_name: string
  lat?: number
  lon?: number
}

interface TravelData {
  city: City
  travelOptions?: City[]
}

const route = useRoute()
const router = useRouter()
const caseId = route.params.id as string

const { visitCurrentCity, isLoading } = useGame()

const cityData = ref<TravelData | null>(null)
const currentCity = ref<City | null>(null)
const destinations = ref<City[]>([])
const traveling = ref(false)

// ⚠️ SSR-safe
const lat = ref<string | null>(null)
const lon = ref<string | null>(null)


onMounted(async () => {
  lat.value = ((Math.random() * 180) - 90).toFixed(4)
  lon.value = ((Math.random() * 360) - 180).toFixed(4)

  if (caseId) {
    await loadCityData()
  }
})

const cityPosition = computed(() => {
  if (!currentCity.value?.lat || !currentCity.value?.lon) return null
  return {
    lat: currentCity.value.lat,
    lon: currentCity.value.lon
  }
})

const loadCityData = async () => {
  try {
    const data = await visitCurrentCity(caseId)
    console.log('[MAP] visitCurrentCity payload:', data)

    if (data) {
      cityData.value = data as unknown as TravelData
      const cityFromApi = data.city as any
      currentCity.value = {
        id: cityFromApi.city_id,
        city_name: cityFromApi.city_name,
        country_name: cityFromApi.country_name,
        lat: cityFromApi.geo_coordinates?.y,
        lon: cityFromApi.geo_coordinates?.x
      }
      destinations.value = (data as any).travelOptions || []
    }
  } catch (e) {
    console.error('[MAP] Erro ao carregar cidade:', e)
  }
}

const handleTravel = async (destinationId: string) => {
  traveling.value = true
  try {
    await new Promise(r => setTimeout(r, 1200))
    router.push(`/cases/${caseId}/city`)
  } catch (e: any) {
    alert(e.message || 'Falha na viagem')
  } finally {
    traveling.value = false
  }
}

const goToCity = () => {
  router.push(`/cases/${caseId}/city`)
}

const MAP_WIDTH = 1024
const MAP_HEIGHT = 512

function geoToPixel(lat: number, lon: number) {
  const x = ((lon + 180) / 360) * MAP_WIDTH
  const y = ((90 - lat) / 180) * MAP_HEIGHT

  return { x, y }
}

function projectToMap(lat: number, lon: number) {
  const mapWidth = 1000
  const mapHeight = 500

  const x = ((lon + 180) / 360) * mapWidth
  const y = ((90 - lat) / 180) * mapHeight

  return { x, y }
}

const markerPosition = computed(() => {
  if (!cityPosition.value) return null
  return projectToMap(
    cityPosition.value.lat,
    cityPosition.value.lon
  )
})

watch(cityPosition, (newPos, oldPos) => {
  if (!newPos || !oldPos) return
  // interpolar posição com requestAnimationFrame
})
</script>
