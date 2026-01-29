<template>
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_420px] h-full bg-slate-950 overflow-hidden font-mono text-slate-200">

    <!-- ================= MAPA VIEWPORT ================= -->
    <div class="relative w-full h-[50vh] lg:h-full flex items-center justify-center bg-black overflow-hidden" style="perspective: 1000px;">

      <!-- EFEITOS CRT/RETRO -->
      <div class="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-30 bg-[url('/images/scanlines.png')] bg-repeat"></div>
      <div class="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-transparent via-cyan-900/5 to-transparent"></div>

      <!-- HUD: COORDENADAS DO MOUSE -->
      <div class="absolute top-6 left-6 z-40 flex flex-col gap-1 text-[10px] text-cyan-500/80 font-mono pointer-events-none border border-cyan-900/50 p-2 bg-slate-950/80 backdrop-blur-sm">
        <div class="flex justify-between gap-4"><span>CURSOR:</span> <span class="text-cyan-300">{{ mouseGeo.lat.toFixed(2) }}°N, {{ mouseGeo.lon.toFixed(2) }}°E</span></div>
        <div class="flex justify-between gap-4"><span>ZOOM:</span> <span class="text-cyan-300">{{ zoom.toFixed(1) }}x</span></div>
        <div class="flex justify-between gap-4"><span>ALVO:</span> <span class="text-amber-400">{{ selectedDestination?.name || '---' }}</span></div>
        <div class="h-px bg-cyan-900/50 my-1"></div>
        <div class="text-[8px] opacity-70">SISTEMA DE NAVEGAÇÃO GLOBAL v2.4</div>
      </div>

      <!-- CONTROLES DE ZOOM -->
      <div class="absolute bottom-6 left-6 flex gap-2 z-40">
        <button class="retro-btn-icon" @click="zoomOut" title="Zoom Out">-</button>
        <button class="retro-btn-icon" @click="zoomReset" title="Reset">⟲</button>
        <button class="retro-btn-icon" @click="zoomIn" title="Zoom In">+</button>
      </div>

      <!-- ÁREA DO MAPA -->
      <div 
        ref="mapContainerRef"
        class="relative transition-transform duration-300 ease-out origin-center will-change-transform cursor-crosshair"
        :style="{ 
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          width: `${MAP_WIDTH}px`,
          height: `${MAP_HEIGHT}px`
        }"
        @mousedown="startPan"
        @mousemove="handleMouseMove"
        @mouseup="endPan"
        @mouseleave="endPan"
        @wheel.prevent="handleWheel"
      >
        <!-- IMAGEM DO MAPA -->
        <img 
          src="/images/world_map.png" 
          alt="World Map" 
          class="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
          draggable="false"
        />

        <!-- GRADE DE DEBUG (Opcional: ajuda a visualizar alinhamento) -->
        <div class="absolute inset-0 grid grid-cols-12 grid-rows-6 pointer-events-none opacity-5">
           <div v-for="i in 72" :key="i" class="border border-cyan-400/30"></div>
        </div>

        <!-- CAMADA SVG: LINHAS DE ROTA E AVIÃO -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <!-- Gradiente para a linha -->
            <linearGradient id="lineGradient" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#ef4444" />
              <stop offset="100%" stop-color="#fbbf24" />
            </linearGradient>
          </defs>
          
          <!-- Linha de Conexão -->
          <path 
            v-if="connectionPath"
            id="travel-path"
            :d="connectionPath" 
            fill="none" 
            stroke="url(#lineGradient)" 
            stroke-width="3" 
            stroke-dasharray="8 4"
            class="animate-dash-flow opacity-90"
            filter="url(#glow)"
          />

          <!-- AVIÃO ANIMADO -->
          <g v-if="isTraveling" class="plane-group" style="offset-path: path(var(--travel-path-d));">
             <path 
               d="M2 12h20l-8-8h-4l6 8-6 8h4z" 
               fill="#fbbf24" 
               transform="rotate(90) scale(1.5)"
               filter="url(#glow)"
             />
          </g>
        </svg>

        <!-- PIN: LOCAL ATUAL -->
        <div 
          v-if="currentCity && currentCityPos" 
          class="absolute z-30 flex flex-col items-center justify-end w-0 h-0 group"
          :style="{ 
            left: `${currentCityPos.x}px`, 
            top: `${currentCityPos.y}px` 
          }"
        >
          <!-- Ícone do Pino -->
          <div class="relative -translate-y-[14px]">
             <!-- Radar Pulse -->
             <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-red-500/20 rounded-full animate-ping-slow pointer-events-none"></div>
             <!-- Pino Físico -->
             <div class="w-4 h-4 bg-red-600 border-2 border-white rotate-45 rounded-tr-full rounded-tl-full rounded-bl-full shadow-[0_4px_6px_rgba(0,0,0,0.5)] z-20 relative"></div>
             <!-- Sombra no chão -->
             <div class="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/50 blur-[2px] rounded-full"></div>
          </div>
          
          <!-- Label do Local Atual (Sempre Visível) -->
          <div class="absolute bottom-6 px-3 py-1.5 bg-slate-900/95 border-l-2 border-red-500 text-white text-[11px] font-bold whitespace-nowrap shadow-xl backdrop-blur-md flex flex-col z-50">
            <span class="leading-none mb-0.5 text-red-400 text-[9px] uppercase tracking-wider">LOCAL ATUAL</span>
            <span class="leading-none">{{ currentCity.name }}</span>
            <span class="leading-none text-[9px] text-slate-400 font-normal uppercase mt-0.5">{{ currentCity.country }}</span>
          </div>
        </div>

        <!-- PINS: DESTINOS -->
        <div 
          v-for="city in destinations" 
          :key="city.id" 
          class="absolute z-20 flex flex-col items-center justify-end w-0 h-0 cursor-pointer group transition-all duration-300"
          :class="{ 'z-40': selectedDestination?.id === city.id }"
          :style="{ 
            left: `${project(city.geo).x}px`, 
            top: `${project(city.geo).y}px` 
          }"
          @click.stop="selectDestination(city)"
        >
          <!-- Hitbox Generosa -->
          <div class="absolute -top-10 -left-6 w-12 h-12 bg-transparent z-10"></div>

          <!-- Ícone do Pino -->
          <div class="relative -translate-y-[14px] transition-transform duration-200"
               :class="{ 'scale-125 -translate-y-[18px]': selectedDestination?.id === city.id }">
            
            <!-- Highlight Seleção -->
            <div v-if="selectedDestination?.id === city.id" 
                 class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 border border-amber-400 rounded-full animate-ping opacity-40 pointer-events-none"></div>

            <!-- Corpo Pino -->
            <div 
              class="w-3 h-3 rotate-45 border shadow-md transition-all duration-200"
              :class="selectedDestination?.id === city.id 
                ? 'bg-amber-400 border-white shadow-[0_0_10px_rgba(251,191,36,0.6)]' 
                : 'bg-cyan-500 border-cyan-900 group-hover:bg-cyan-300 group-hover:border-white'"
            ></div>
            
            <!-- Sombra -->
            <div class="absolute top-3 left-1/2 -translate-x-1/2 w-3 h-1 bg-black/40 blur-[1px] rounded-full scale-75"></div>
          </div>

          <!-- Label do Destino (Hover ou Selecionado) -->
          <div 
            class="absolute bottom-6 px-2 py-1 bg-slate-900/90 border-l-2 text-[10px] font-mono whitespace-nowrap shadow-lg backdrop-blur-sm transition-all duration-200 flex flex-col z-50 pointer-events-none"
            :class="[
              selectedDestination?.id === city.id
                ? 'opacity-100 translate-y-0 border-amber-400 text-amber-100'
                : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 border-cyan-500/50 text-cyan-100'
            ]"
          >
            <span class="font-bold">{{ city.name }}</span>
            <span class="text-[8px] opacity-70 uppercase">{{ city.country }}</span>
          </div>
        </div>

      </div>
    </div>

    <!-- ================= PAINEL LATERAL (HUD) ================= -->
    <div class="relative z-20 flex flex-col bg-slate-900 border-l border-slate-700 shadow-2xl">
      
      <!-- Cabeçalho do HUD -->
      <div class="p-6 border-b border-slate-800 bg-slate-950 flex flex-col gap-1">
        <h2 class="text-2xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-[0_2px_0_rgba(0,0,0,1)] font-display">
          PLANO DE VOO
        </h2>
        <div class="flex justify-between items-end">
          <span class="text-[10px] text-slate-500 font-mono">SYS.NAV.844 // <span class="text-green-500">CONECTADO</span></span>
        </div>
      </div>

      <!-- Conteúdo do Painel -->
      <div class="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        
        <!-- Local Atual -->
        <div class="relative p-4 bg-slate-800/50 border border-slate-700 rounded-sm group overflow-hidden">
          <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-red-500/10 to-transparent pointer-events-none"></div>
          <p class="text-[10px] text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
            LOCALIZAÇÃO ATUAL
          </p>
          <div class="font-display text-2xl text-white uppercase tracking-wide leading-none mb-1">
            {{ currentCity?.name || 'DESCONHECIDO' }}
          </div>
          <div class="text-sm text-slate-400 font-mono border-l-2 border-red-500/30 pl-2">
             {{ currentCity?.country || '---' }}
          </div>
        </div>

        <!-- Lista de Rotas -->
        <div class="flex-1 flex flex-col min-h-0">
          <div class="flex items-center justify-between mb-3">
             <p class="text-[10px] text-cyan-400 uppercase tracking-widest bg-slate-900 z-10">DESTINOS DISPONÍVEIS</p>
             <div class="h-px flex-1 bg-cyan-900/50 ml-3"></div>
          </div>

          <div class="overflow-y-auto pr-2 custom-scrollbar space-y-2 flex-1">
            <div v-if="isLoading" class="p-4 text-center text-cyan-500/50 font-mono text-xs animate-pulse border border-dashed border-cyan-900">
              [ BUSCANDO DADOS DE SATÉLITE... ]
            </div>

            <button 
              v-for="city in destinations" 
              :key="city.id"
              @click="selectDestination(city)"
              class="w-full text-left p-3 border relative group transition-all duration-200"
              :class="selectedDestination?.id === city.id 
                ? 'bg-amber-500/10 border-amber-500/50 translate-x-1' 
                : 'bg-slate-950/50 border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-900/10'"
            >
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold text-sm transition-colors"
                       :class="selectedDestination?.id === city.id ? 'text-amber-400' : 'text-slate-300 group-hover:text-cyan-300'">
                    {{ city.name }}
                  </div>
                  <div class="text-[10px] text-slate-500 font-mono uppercase group-hover:text-slate-400">
                    {{ city.country }}
                  </div>
                  <div v-if="city.travelTime" class="text-[10px] text-amber-500 font-mono mt-1">
                    ⏱ {{ city.travelTime }}h
                  </div>
                </div>
                <!-- Image Preview Thumbnail -->
                <div v-if="city.imageUrl" class="w-10 h-10 border border-slate-700 overflow-hidden ml-2 rounded-sm bg-black">
                   <img :src="city.imageUrl" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                </div>
              </div>
              
              <!-- Decorativo de canto -->
              <div class="absolute bottom-0 right-0 w-2 h-2 border-r border-b transition-colors"
                   :class="selectedDestination?.id === city.id ? 'border-amber-500' : 'border-slate-700 group-hover:border-cyan-500'"></div>
            </button>
          </div>
        </div>

        <!-- Ações -->
        <div class="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-3">
           <RetroButton 
            variant="default" 
            block 
            :disabled="!selectedDestination || isTraveling"
            @click="travel"
            extraClass="h-12 text-sm shadow-[0_0_15px_rgba(251,191,36,0.2)]"
          >
            <span v-if="isTraveling" class="animate-pulse">✈ INICIANDO VOO...</span>
            <span v-else>CONFIRMAR DESTINO</span>
          </RetroButton>

           <RetroButton 
            variant="outline" 
            block 
            @click="goToCity"
            extraClass="text-xs opacity-70 hover:opacity-100"
          >
            VOLTAR / INVESTIGAR
          </RetroButton>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '@/composables/useGame'
import RetroCard from '@/components/ui/RetroCard.vue'
import RetroButton from '@/components/ui/RetroButton.vue'

// --- CONSTANTES DE MAPA ---
const MAP_WIDTH = 1376
const MAP_HEIGHT = 768

// --- CALIBRAÇÃO REFINADA ---
const CALIBRATION = {
  xOffset: -160,
  yOffset: 35,
  xScale: 0.70,
  yScale: 0.80
}

const GEO_BOUNDS = {
  minLon: -190,
  maxLon: 190,
  minLat: -95,
  maxLat: 95
}

const route = useRoute()
const router = useRouter()
const caseId = route.params.id as string

const {
  visitCurrentCity,
  fetchRoutes,
  isLoading,
  travelToCity,
  timeState,
  lastGameOver
} = useGame()

/* ================= STATE ================= */
const mapContainerRef = ref<HTMLElement | null>(null)
const currentCity = ref<any>(null)
const destinations = ref<any[]>([])
const selectedDestination = ref<any | null>(null)
const isTraveling = ref(false)

const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })
const mouseGeo = ref({ lat: 0, lon: 0 })

// We bind CSS variable for animation path
const travelPathD = ref('')

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
  x = centerX + (x - centerX) * CALIBRATION.xScale + CALIBRATION.xOffset
  y = centerY + (y - centerY) * CALIBRATION.yScale + CALIBRATION.yOffset
  return { x, y }
}

function unproject(x: number, y: number) {
  const centerX = MAP_WIDTH / 2
  const centerY = MAP_HEIGHT / 2
  let rawX = (x - centerX - CALIBRATION.xOffset) / CALIBRATION.xScale + centerX
  let rawY = (y - centerY - CALIBRATION.yOffset) / CALIBRATION.yScale + centerY
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
  
  // Update CSS var for animation
  // path() syntax needs specific string
  // Note: offset-path requires the path string. 
  // We can just use the d attribute on the path element and reference it?
  // No, offset-path in CSS takes path('...') string.
  travelPathD.value = `path('${d}')`
  
  return d
})

// Update style tag for animation when path changes
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
  selectedDestination.value = city
}

function travel() {
  if (!selectedDestination.value) return
  isTraveling.value = true
  
  // Start animation immediately
  // It takes 2s via CSS animation on .plane-group
  const animationDuration = 2000

  // Trigger Backend Call in parallel or after?
  // Parallel to save time, but wait for animation to finish before routing
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
    })
}

function goToCity() {
  router.push(`/cases/${caseId}/city`)
}

/* ================= LOAD ================= */
onMounted(async () => {
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

    const routes = await fetchRoutes(caseId, visit.city.step_order)
    destinations.value = routes.map(r => ({
      ...r,
      geo: {
        lat: Number(r.geo.lat),
        lon: Number(r.geo.lon)
      }
    })) || []

    if (lastGameOver.value) {
       alert(lastGameOver.value === "WIN" ? "MISSÃO CUMPRIDA!" : "FIM DE JOGO: O tempo acabou ou o suspeito escapou.")
       router.push('/')
    }
  } catch (e) {
    console.error('Erro ao carregar mapa:', e)
  }
})
</script>

<style scoped>
.retro-btn-icon {
  @apply w-8 h-8 flex items-center justify-center bg-slate-900 border border-cyan-500 text-cyan-400 font-mono hover:bg-cyan-500 hover:text-black transition-colors active:scale-95 shadow-lg;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

.animate-dash-flow {
  animation: dash 1.5s linear infinite;
}
@keyframes dash {
  to { stroke-dashoffset: -24; }
}

.animate-ping-slow {
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* Plane Animation */
.plane-group {
  offset-rotate: auto;
  animation: movePlane 2s ease-in-out forwards;
}

@keyframes movePlane {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}
</style>
