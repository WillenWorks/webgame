<template>
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_420px] h-full bg-slate-950 overflow-hidden font-mono text-slate-200">

    <!-- ================= MAPA VIEWPORT ================= -->
    <div class="relative w-full h-[60vh] lg:h-full flex items-center justify-center bg-black overflow-hidden"
      style="perspective: 1000px;">

      <!-- EFEITOS CRT/RETRO -->
      <div
        class="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-30 bg-[url('/images/scanlines.png')] bg-repeat">
      </div>
      <div
        class="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-transparent via-cyan-900/5 to-transparent">
      </div>

      <!-- HUD: COORDENADAS DO MOUSE -->
      <div
        class="absolute top-6 left-6 z-40 flex flex-col gap-1 text-xs text-cyan-500/80 font-mono pointer-events-none border border-cyan-900/50 p-2 bg-slate-950/80 backdrop-blur-sm">
        <div class="flex justify-between gap-4"><span>CURSOR:</span> <span class="text-cyan-300">{{
          mouseGeo.lat.toFixed(2) }}°N, {{ mouseGeo.lon.toFixed(2) }}°E</span></div>
        <div class="flex justify-between gap-4"><span>ZOOM:</span> <span class="text-cyan-300">{{ zoom.toFixed(1)
        }}x</span></div>
        <div class="flex justify-between gap-4"><span>ALVO:</span> <span class="text-amber-400">{{
          selectedDestination?.name || '---' }}</span></div>
        <div class="h-px bg-cyan-900/50 my-1"></div>
        <div class="text-[8px] opacity-70">SISTEMA DE NAVEGAÇÃO GLOBAL v2.5</div>
      </div>

      <!-- CONTROLES DE ZOOM -->
      <div class="absolute bottom-6 left-6 flex gap-2 z-40">
        <button class="retro-btn-icon" @click="zoomOut" title="Zoom Out">-</button>
        <button class="retro-btn-icon" @click="zoomReset" title="Reset">⟲</button>
        <button class="retro-btn-icon" @click="zoomIn" title="Zoom In">+</button>
      </div>

      <!-- ÁREA DO MAPA -->
      <div ref="mapContainerRef"
        class="relative transition-transform duration-300 ease-out origin-center will-change-transform cursor-crosshair"
        :style="{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          width: `${MAP_WIDTH}px`,
          height: `${MAP_HEIGHT}px`
        }" @mousedown="startPan" @mousemove="handleMouseMove" @mouseup="endPan" @mouseleave="endPan"
        @wheel.prevent="handleWheel">
        <!-- IMAGEM DO MAPA -->
        <img src="/images/world_map.png" alt="World Map"
          class="absolute inset-0 w-full h-full object-fill pointer-events-none select-none" draggable="false" />

        <!-- GRADE DE DEBUG (Opcional) -->
        <div class="absolute inset-0 grid grid-cols-12 grid-rows-6 pointer-events-none opacity-5">
          <div v-for="i in 72" :key="i" class="border border-cyan-400/30"></div>
        </div>

        <!-- CAMADA SVG: LINHAS E AVIÃO -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="lineGradient" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#ef4444" />
              <stop offset="100%" stop-color="#fbbf24" />
            </linearGradient>
          </defs>

          <path v-if="connectionPath" id="travel-path" :d="connectionPath" fill="none" stroke="url(#lineGradient)"
            stroke-width="3" stroke-dasharray="8 4" class="animate-dash-flow opacity-90" filter="url(#glow)" />

          <g v-if="isTraveling" class="plane-group" style="offset-path: path(var(--travel-path-d));">
            <path d="M2 12h20l-8-8h-4l6 8-6 8h4z" fill="#fbbf24" transform="rotate(90) scale(1.5)"
              filter="url(#glow)" />
          </g>
        </svg>

        <!-- PIN: LOCAL ATUAL -->
        <div v-if="currentCity && currentCityPos"
          class="absolute z-30 flex flex-col items-center justify-end w-0 h-0 group" :style="{
            left: `${currentCityPos.x}px`,
            top: `${currentCityPos.y}px`
          }">
          <div class="relative -translate-y-[14px]">
            <div
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-red-500/20 rounded-full animate-ping-slow pointer-events-none">
            </div>
            <div
              class="w-5 h-5 bg-red-600 border-2 border-white rotate-45 rounded-tr-full rounded-tl-full rounded-bl-full shadow-[0_4px_6px_rgba(0,0,0,0.5)] z-20 relative">
            </div>
            <div class="absolute top-5 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-black/50 blur-[2px] rounded-full"></div>
          </div>

          <div
            class="absolute bottom-8 px-3 py-1.5 bg-slate-900/95 border-l-2 border-red-500 text-white text-[12px] font-bold whitespace-nowrap shadow-xl backdrop-blur-md flex flex-col z-50">
            <span class="leading-none mb-0.5 text-red-400 text-xs uppercase tracking-wider">LOCAL ATUAL</span>
            <span class="leading-none">{{ currentCity.name }}</span>
          </div>
        </div>

        <!-- PINS: DESTINOS -->
        <div v-for="city in destinations" :key="city.id"
          class="absolute z-20 flex flex-col items-center justify-end w-0 h-0 cursor-pointer group transition-all duration-300"
          :class="{ 'z-40': selectedDestination?.id === city.id }" :style="{
            left: `${project(city.geo).x}px`,
            top: `${project(city.geo).y}px`
          }" @click.stop="selectDestination(city)">
          <div class="absolute -top-10 -left-6 w-12 h-12 bg-transparent z-10"></div>

          <div class="relative -translate-y-[14px] transition-transform duration-200"
            :class="{ 'scale-125 -translate-y-[18px]': selectedDestination?.id === city.id }">

            <!-- Highlight Selection -->
            <div v-if="selectedDestination?.id === city.id"
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-amber-400 rounded-full animate-ping opacity-50 pointer-events-none">
            </div>

            <!-- PIN VISUAL MELHORADO -->
            <div class="w-6 h-6 rotate-45 border-2 shadow-lg transition-all duration-200" :class="selectedDestination?.id === city.id
              ? 'bg-amber-400 border-white shadow-[0_0_15px_rgba(251,191,36,0.8)]'
              : 'bg-cyan-500 border-white shadow-[0_0_15px_rgba(6,182,212,0.8)] group-hover:bg-cyan-300'"></div>

            <div
              class="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/50 blur-[1px] rounded-full scale-75">
            </div>
          </div>

          <div
            class="absolute bottom-8 px-2 py-1 bg-slate-900/90 border-l-2 text-xs font-mono whitespace-nowrap shadow-lg backdrop-blur-sm transition-all duration-200 flex flex-col z-50 pointer-events-none"
            :class="[
              selectedDestination?.id === city.id
                ? 'opacity-100 translate-y-0 border-amber-400 text-amber-100'
                : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 border-blue-500/50 text-blue-100'
            ]">
            <span class="font-bold">{{ city.name }}</span>
            <span class="text-[9px] opacity-70 uppercase">{{ city.country }}</span>
          </div>
        </div>

      </div>
    </div>

    <!-- ================= PAINEL LATERAL (HUD) ================= -->
    <div class="relative z-20 flex flex-col bg-slate-900 border-l border-slate-700 shadow-2xl h-full lg:h-auto">

      <!-- Cabeçalho -->
      <div class="p-6 border-b border-slate-800 bg-slate-950 flex flex-col gap-1 shrink-0">
        <h2
          class="text-3xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-[0_2px_0_rgba(0,0,0,1)] font-display">
          PLANO DE VOO
        </h2>
        <div class="flex justify-between items-end">
          <span class="text-xs text-slate-500 font-mono">SYS.NAV.844 // <span
              class="text-green-500">CONECTADO</span></span>
          <RetroButton variant="outline" @click="goToDashboard" class="text-sm px-2 py-1 h-8">
            ← VOLTAR
          </RetroButton>
        </div>
      </div>

      <!-- Conteúdo Scrollável -->
      <div class="flex-1 p-6 overflow-hidden flex flex-col gap-6 min-h-0 overflow-x-hidden">

        <!-- Local Atual e Botão Investigar -->
        <div @click="panToCurrent"
          class="relative p-5 bg-slate-800/50 border border-slate-700 rounded-sm group overflow-hidden cursor-pointer hover:border-red-500/50 transition-colors shrink-0">
          <div
            class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-red-500/10 to-transparent pointer-events-none">
          </div>

          <div class="flex justify-between items-start mb-2">
            <p class="text-xs text-red-400 uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              LOCALIZAÇÃO ATUAL
            </p>
          </div>

          <div class="font-display text-3xl text-white uppercase tracking-wide leading-none mb-1">
            {{ currentCity?.name || 'DESCONHECIDO' }}
          </div>
          <div class="text-sm text-slate-400 font-mono border-l-2 border-red-500/30 pl-2 mb-4">
            {{ currentCity?.country || '---' }}
          </div>

          <!-- Botão Investigar -->
          <RetroButton variant="default" block @click.stop="goToCity"
            extraClass="h-10 text-sm border-red-500/50 hover:border-red-400 text-red-100 bg-red-900/20 hover:bg-red-900/40">
            🔍 INVESTIGAR LOCAL
          </RetroButton>
        </div>

        <!-- Lista de Rotas -->
        <div class="flex-1 flex flex-col min-h-0">
          <div class="flex items-center justify-between mb-3 shrink-0">
            <p class="text-xs text-cyan-400 uppercase tracking-widest bg-slate-900 z-10">DESTINOS DISPONÍVEIS</p>
            <div class="h-px flex-1 bg-cyan-900/50 ml-3"></div>
          </div>

          <div class="overflow-y-auto pr-2 custom-scrollbar space-y-2 flex-1">
            <div v-if="isLoading"
              class="p-4 text-center text-cyan-500/50 font-mono text-sm animate-pulse border border-dashed border-cyan-900">
              [ BUSCANDO DADOS DE SATÉLITE... ]
            </div>

            <div v-else-if="destinations.length === 0"
              class="p-6 text-center text-slate-600 font-mono text-sm border border-slate-800">
              NENHUMA ROTA DISPONÍVEL. <br /> INVESTIGUE PISTAS PARA DESBLOQUEAR.
            </div>

            <button v-for="city in destinations" :key="city.id" @click="selectDestination(city)"
              class="w-full text-left p-4 border relative group transition-all duration-200" :class="selectedDestination?.id === city.id
                ? 'bg-amber-500/10 border-amber-500/50 translate-x-1'
                : 'bg-slate-950/50 border-slate-800 hover:border-blue-500/50 hover:bg-blue-900/10'">
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-bold text-base transition-colors"
                    :class="selectedDestination?.id === city.id ? 'text-amber-400' : 'text-slate-300 group-hover:text-blue-300'">
                    {{ city.name }}
                  </div>
                  <div class="text-xs text-slate-500 font-mono uppercase group-hover:text-slate-400">
                    {{ city.country }}
                  </div>
                </div>
                <div v-if="city.travelTime"
                  class="text-xs text-amber-500 font-mono bg-black/50 px-2 py-1 rounded border border-amber-500/30">
                  {{ city.travelTime }}h
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Botão Viagem (Só aparece se selecionado) -->
        <div v-if="selectedDestination"
          class="mt-auto pt-4 border-t border-slate-800 shrink-0 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <RetroButton variant="default" block @click="showTravelConfirm = true"
            extraClass="h-14 text-base shadow-[0_0_20px_rgba(251,191,36,0.2)] font-bold tracking-wider">
            VIAJAR PARA {{ selectedDestination.name }}
          </RetroButton>
        </div>

      </div>
    </div>

    <!-- MODAL DE CONFIRMAÇÃO DE VIAGEM -->
    <div v-if="showTravelConfirm"
      class="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <RetroCard
        extraClass="max-w-md w-full border-amber-500 shadow-[0_0_50px_rgba(251,191,36,0.3)] animate-in zoom-in-95 duration-200">
        <div class="p-6 text-center space-y-6">
          <h3 class="text-2xl font-display text-white uppercase">CONFIRMAR PLANO DE VOO</h3>

          <div class="py-4 border-y border-dashed border-slate-700 bg-slate-900/50">
            <div class="flex justify-between items-center text-sm font-mono text-slate-400 mb-2">
              <span>ORIGEM:</span>
              <span class="text-white">{{ currentCity?.name }}</span>
            </div>
            <div class="flex justify-center my-2 text-amber-500">⬇</div>
            <div class="flex justify-between items-center text-lg font-bold text-amber-400">
              <span>DESTINO:</span>
              <span>{{ selectedDestination?.name }}</span>
            </div>

          </div>

          <div class="flex gap-4">
            <RetroButton variant="outline" class="flex-1" @click="cancelTravel">
              CANCELAR
            </RetroButton>
            <RetroButton variant="default" class="flex-1" @click="confirmTravel" :disabled="isTraveling">
              {{ isTraveling ? 'VIAJANDO...' : 'DECOLAR' }}
            </RetroButton>
          </div>
        </div>
      </RetroCard>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '@/composables/useGame'
import RetroCard from '@/components/ui/RetroCard.vue'
import RetroButton from '@/components/ui/RetroButton.vue'

const MAP_WIDTH = 1376
const MAP_HEIGHT = 768

// --- CALIBRAÇÃO DINÂMICA ---
// Valores base para Notebook (1366x768 aprox)
const baseCalibration = { xOffset: -180, yOffset: 35, xScale: 0.70, yScale: 0.80 }
const CALIBRATION = ref({ ...baseCalibration })

const GEO_BOUNDS = { minLon: -190, maxLon: 190, minLat: -95, maxLat: 95 }

const route = useRoute()
const router = useRouter()
const caseId = route.params.id as string

const {
  visitCurrentCity,
  fetchRoutes,
  isLoading,
  travelToCity,
  lastGameOver
} = useGame()

/* ================= STATE ================= */
const mapContainerRef = ref<HTMLElement | null>(null)
const currentCity = ref<any>(null)
const destinations = ref<any[]>([])
const selectedDestination = ref<any | null>(null)
const isTraveling = ref(false)
const showTravelConfirm = ref(false)

const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })
const mouseGeo = ref({ lat: 0, lon: 0 })
const travelPathD = ref('')

/* ================= CALIBRATION LOGIC ================= */
const updateCalibration = () => {
  const w = window.innerWidth

  if (w < 640) { // Mobile
    CALIBRATION.value = { xOffset: -180, yOffset: 35, xScale: 0.40, yScale: 0.45 }
  } else if (w < 1024) { // Tablet
    CALIBRATION.value = { xOffset: -180, yOffset: 35, xScale: 0.55, yScale: 0.60 }
  } else if (w < 1440) { // Notebook (Base)
    CALIBRATION.value = { xOffset: -180, yOffset: 35, xScale: 0.70, yScale: 0.80 }
  } else if (w < 1920) { // Standard Desktop
    CALIBRATION.value = { xOffset: -180, yOffset: 35, xScale: 0.85, yScale: 0.90 }
  } else { // Widescreen
    CALIBRATION.value = { xOffset: -170, yOffset: 45, xScale: 0.73, yScale: 0.90 }
  }
  console.log('Window width:', w);
  console.log('Calibration updated:', CALIBRATION.value);
}

/* ================= LÓGICA DE PROJEÇÃO ================= */
function project(geo: { lat: number, lon: number }) {
  const lat = isNaN(Number(geo.lat)) ? 0 : Number(geo.lat)
  const lon = isNaN(Number(geo.lon)) ? 0 : Number(geo.lon)
  const xPct = (lon - GEO_BOUNDS.minLon) / (GEO_BOUNDS.maxLon - GEO_BOUNDS.minLon)
  const yPct = (GEO_BOUNDS.maxLat - lat) / (GEO_BOUNDS.maxLat - GEO_BOUNDS.minLat)
  let x = xPct * MAP_WIDTH
  let y = yPct * MAP_HEIGHT
  const centerX = MAP_WIDTH / 2
  const centerY = MAP_HEIGHT / 2

  const cal = CALIBRATION.value
  x = centerX + (x - centerX) * cal.xScale + cal.xOffset
  y = centerY + (y - centerY) * cal.yScale + cal.yOffset
  return { x, y }
}

function unproject(x: number, y: number) {
  const centerX = MAP_WIDTH / 2
  const centerY = MAP_HEIGHT / 2
  const cal = CALIBRATION.value
  let rawX = (x - centerX - cal.xOffset) / cal.xScale + centerX
  let rawY = (y - centerY - cal.yOffset) / cal.yScale + centerY
  let xPct = rawX / MAP_WIDTH
  let yPct = rawY / MAP_HEIGHT
  const lon = xPct * (GEO_BOUNDS.maxLon - GEO_BOUNDS.minLon) + GEO_BOUNDS.minLon
  const lat = GEO_BOUNDS.maxLat - (yPct * (GEO_BOUNDS.maxLat - GEO_BOUNDS.minLat))
  return { lat, lon }
}

/* ================= COMPUTEDS ================= */
const currentCityPos = computed(() => {
  if (!currentCity.value?.geo) return null
  return project(currentCity.value.geo)
})

const connectionPath = computed(() => {
  if (!currentCityPos.value || !selectedDestination.value?.geo) return null
  const start = currentCityPos.value
  const end = project(selectedDestination.value.geo)
  const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
  const curvature = 0.2
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2 - (dist * curvature)
  const d = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`
  travelPathD.value = `path('${d}')`
  return d
})

watch(connectionPath, (newPath) => {
  if (mapContainerRef.value && newPath) {
    mapContainerRef.value.style.setProperty('--travel-path-d', `path('${newPath}')`)
  }
})

/* ================= INTERAÇÃO ================= */
function handleMouseMove(e: MouseEvent) {
  if (mapContainerRef.value) {
    const rect = mapContainerRef.value.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) / zoom.value
    const mouseY = (e.clientY - rect.top) / zoom.value
    mouseGeo.value = unproject(mouseX, mouseY)
  }
  if (isPanning.value) onPan(e)
}

function zoomIn() { zoom.value = Math.min(4, zoom.value + 0.5) }
function zoomOut() { zoom.value = Math.max(1, zoom.value - 0.5); if (zoom.value === 1) pan.value = { x: 0, y: 0 } }
function zoomReset() { zoom.value = 1; pan.value = { x: 0, y: 0 } }
function startPan(e: MouseEvent) {
  if (zoom.value <= 1) return
  isPanning.value = true
  lastMousePos.value = { x: e.clientX, y: e.clientY }
}
function onPan(e: MouseEvent) {
  const deltaX = e.clientX - lastMousePos.value.x
  const deltaY = e.clientY - lastMousePos.value.y
  pan.value = { x: pan.value.x + deltaX, y: pan.value.y + deltaY }
  lastMousePos.value = { x: e.clientX, y: e.clientY }
}
function endPan() { isPanning.value = false }
function handleWheel(e: WheelEvent) {
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}

function selectDestination(city: any) {
  if (selectedDestination.value?.id === city.id) {
    // Toggle off? No, standard behavior is keep selected
  }
  selectedDestination.value = city
}

function cancelTravel() {
  showTravelConfirm.value = false
  selectedDestination.value = null
}

function confirmTravel() {
  if (!selectedDestination.value) return
  isTraveling.value = true

  const animationDuration = 2000
  const travelPromise = travelToCity(caseId, selectedDestination.value.id)
  const animationPromise = new Promise(resolve => setTimeout(resolve, animationDuration))

  Promise.all([travelPromise, animationPromise])
    .then(([res]) => {
      if (res?.gameOver || lastGameOver.value) {
        alert(lastGameOver.value === "WIN" ? "MISSÃO CUMPRIDA!" : "FIM DE JOGO!")
        router.push('/')
        return
      }
      router.push(`/cases/${caseId}/city`)
    })
    .catch(err => {
      alert('Erro na viagem: ' + (err.message || 'Falha desconhecida'))
      isTraveling.value = false
      showTravelConfirm.value = false
    })
}

function goToCity() {
  router.push(`/cases/${caseId}/city`)
}

function goToDashboard() {
  router.push('/dashboard')
}

function panToCurrent() {
  if (currentCityPos.value) {
    // Logic to center map on current city
    // pan = center - cityPos
    // Simpler: just reset zoom/pan to focus
    zoomReset()
    // Highlight effect handled by CSS
  }
}

/* ================= LOAD ================= */
onMounted(async () => {
  window.addEventListener('resize', updateCalibration)
  updateCalibration()

  try {
    const visit = await visitCurrentCity(caseId)
    if (!visit?.city) return

    currentCity.value = {
      id: visit.city.city_id,
      name: visit.city.city_name,
      country: visit.city.country_name,
      geo: {
        lat: Number(visit.city.geo_coordinates?.y || visit.city.lat || 0),
        lon: Number(visit.city.geo_coordinates?.x || visit.city.lon || 0)
      }
    }

    // --- FIX: Use travelOptions from backend instead of fetchRoutes ---
    console.log('[MAP] Travel Options received:', visit.travelOptions)
    const rawOptions = visit.travelOptions || []
    destinations.value = rawOptions.map((r: any) => ({
      id: r.id,
      name: r.name,
      country: r.country_name,
      geo: {
        lat: Number(r.latitude),
        lon: Number(r.longitude)
      },
      travelTime: r.travel_time_formatted
    }))
    // ----------------------------------------------------------------

    if (lastGameOver.value) {
      alert(lastGameOver.value === "WIN" ? "MISSÃO CUMPRIDA!" : "FIM DE JOGO: O tempo acabou ou o suspeito escapou.")
      router.push('/')
    }
  } catch (e) {
    console.error('Erro ao carregar mapa:', e)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCalibration)
})
</script>

<style scoped>
.retro-btn-icon {
  @apply w-10 h-10 flex items-center justify-center bg-slate-900 border border-cyan-500 text-cyan-400 font-mono hover:bg-cyan-500 hover:text-black transition-colors active:scale-95 shadow-lg text-lg;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #0f172a;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 2px;
}

.animate-dash-flow {
  animation: dash 1.5s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -24;
  }
}

.animate-ping-slow {
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.plane-group {
  offset-rotate: auto;
  animation: movePlane 2s ease-in-out forwards;
}

@keyframes movePlane {
  0% {
    offset-distance: 0%;
  }

  100% {
    offset-distance: 100%;
  }
}
</style>
