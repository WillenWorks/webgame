<template>
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-full bg-slate-950 overflow-hidden font-mono text-slate-200">

    <!-- ================= MAPA ================= -->
    <div class="relative w-full h-[55vh] lg:h-full flex items-center justify-center bg-black overflow-hidden p-3 lg:p-6">

      <!-- efeitos CRT -->
      <div class="absolute inset-0 pointer-events-none z-40 mix-blend-overlay opacity-25 bg-scanlines"></div>

      <!-- HUD -->
      <div class="absolute top-4 left-4 z-30 flex flex-col gap-1 text-[10px] text-cyan-500/80 border border-cyan-900/50 p-2 bg-slate-950/80 backdrop-blur-sm pointer-events-none">
        <div class="flex justify-between gap-4"><span>CURSOR</span><span class="text-cyan-300">{{ cursorLabel }}</span></div>
        <div class="flex justify-between gap-4"><span>ZOOM</span><span class="text-cyan-300">{{ zoom.toFixed(1) }}x</span></div>
        <div class="flex justify-between gap-4"><span>ALVO</span><span class="text-amber-400">{{ selectedDestination?.name || '---' }}</span></div>
        <div class="h-px bg-cyan-900/50 my-0.5"></div>
        <div class="opacity-70">SISTEMA DE NAVEGAÇÃO GLOBAL</div>
      </div>

      <!-- controles de zoom -->
      <div class="absolute bottom-4 left-4 flex gap-2 z-30">
        <button class="retro-btn-icon" @click="zoomOut">−</button>
        <button class="retro-btn-icon" @click="zoomReset">⟲</button>
        <button class="retro-btn-icon" @click="zoomIn">+</button>
      </div>

      <!-- viewport com proporção travada -->
      <div ref="viewportRef" class="relative w-full h-full flex items-center justify-center">
        <div
          ref="canvasRef"
          class="relative shadow-2xl border border-cyan-900/40 select-none"
          :style="canvasStyle"
          @mousemove="onMouseMove"
          @mouseleave="endPan"
          @mousedown="startPan"
          @mouseup="endPan"
          @wheel.prevent="onWheel"
        >
          <WorldMap class="absolute inset-0" />

          <!-- linha de viagem -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="routeLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#ef4444" />
                <stop offset="100%" stop-color="#fbbf24" />
              </linearGradient>
            </defs>
            <path
              v-if="connectionPath"
              :d="connectionPath"
              fill="none"
              stroke="url(#routeLine)"
              stroke-width="0.5"
              stroke-dasharray="1.5 1"
              vector-effect="non-scaling-stroke"
              class="route-dash"
            />
          </svg>

          <!-- pin: local atual -->
          <div
            v-if="currentPos"
            class="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            :style="{ left: `${currentPos.xPct}%`, top: `${currentPos.yPct}%` }"
          >
            <div class="w-16 h-16 -translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 rounded-full bg-red-500/20 animate-ping-slow"></div>
            <div class="w-4 h-4 rotate-45 bg-red-600 border-2 border-white shadow-lg"></div>
            <div class="absolute left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-slate-900/95 border-l-2 border-red-500 text-[10px] font-bold text-white whitespace-nowrap">
              {{ currentCity?.name || '—' }}
            </div>
          </div>

          <!-- pins: destinos -->
          <div
            v-for="city in destinations"
            :key="city.id"
            class="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            :style="{ left: `${city.pos.xPct}%`, top: `${city.pos.yPct}%` }"
            @click.stop="selectDestination(city)"
          >
            <div
              class="w-3.5 h-3.5 rotate-45 border-2 border-white transition-all duration-150"
              :class="selectedDestination?.id === city.id
                ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                : 'bg-cyan-500 group-hover:bg-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.7)]'"
            ></div>
            <div
              class="absolute left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-slate-900/90 border-l-2 text-[10px] whitespace-nowrap transition-opacity"
              :class="selectedDestination?.id === city.id
                ? 'opacity-100 border-amber-400 text-amber-100'
                : 'opacity-0 group-hover:opacity-100 border-cyan-500/50 text-cyan-100'"
            >
              {{ city.name }}<span class="opacity-60"> · {{ city.country }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= PAINEL ================= -->
    <div class="relative z-20 flex flex-col bg-slate-900 border-l border-slate-700 h-full lg:h-auto min-h-0">
      <div class="p-5 border-b border-slate-800 bg-slate-950 shrink-0">
        <h2 class="text-2xl font-black text-white tracking-widest uppercase font-display">PLANO DE VOO</h2>
        <div class="flex justify-between items-end mt-1">
          <span class="text-[10px] text-slate-500">SYS.NAV // <span class="text-green-500">CONECTADO</span></span>
          <RetroButton variant="outline" class="text-xs px-2 py-1 h-7" @click="goToDashboard">← VOLTAR</RetroButton>
        </div>
      </div>

      <div class="flex-1 p-5 overflow-hidden flex flex-col gap-5 min-h-0">
        <div class="p-4 bg-slate-800/50 border border-slate-700 shrink-0">
          <p class="text-[10px] text-red-400 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span> LOCALIZAÇÃO ATUAL
          </p>
          <div class="font-display text-2xl text-white uppercase leading-none">{{ currentCity?.name || 'DESCONHECIDO' }}</div>
          <div class="text-xs text-slate-400 border-l-2 border-red-500/30 pl-2 my-3">{{ currentCity?.country || '---' }}</div>
          <RetroButton variant="default" block @click="goToCity"
            extraClass="h-9 text-xs border-red-500/50 text-red-100 bg-red-900/20 hover:bg-red-900/40">
            🔍 INVESTIGAR LOCAL
          </RetroButton>
        </div>

        <div class="flex-1 flex flex-col min-h-0">
          <div class="flex items-center justify-between mb-2 shrink-0">
            <p class="text-[10px] text-cyan-400 uppercase tracking-widest">DESTINOS DISPONÍVEIS</p>
            <div class="h-px flex-1 bg-cyan-900/50 ml-3"></div>
          </div>
          <div class="overflow-y-auto pr-1 custom-scrollbar space-y-2 flex-1">
            <div v-if="isLoading" class="p-4 text-center text-cyan-500/50 text-xs animate-pulse border border-dashed border-cyan-900">
              [ BUSCANDO DADOS DE SATÉLITE... ]
            </div>
            <div v-else-if="destinations.length === 0" class="p-5 text-center text-slate-600 text-xs border border-slate-800">
              NENHUMA ROTA DISPONÍVEL.<br />INVESTIGUE PISTAS PARA DESBLOQUEAR.
            </div>
            <button
              v-for="city in destinations"
              :key="city.id"
              class="w-full text-left p-3 border transition-all"
              :class="selectedDestination?.id === city.id
                ? 'bg-amber-500/10 border-amber-500/50 translate-x-1'
                : 'bg-slate-950/50 border-slate-800 hover:border-cyan-500/50'"
              @click="selectDestination(city)"
            >
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-bold text-sm" :class="selectedDestination?.id === city.id ? 'text-amber-400' : 'text-slate-300'">{{ city.name }}</div>
                  <div class="text-[10px] text-slate-500 uppercase">{{ city.country }}</div>
                </div>
                <div v-if="city.travelTime" class="text-[10px] text-amber-500 bg-black/50 px-1.5 py-0.5 border border-amber-500/30">{{ city.travelTime }}</div>
              </div>
            </button>
          </div>
        </div>

        <div v-if="selectedDestination" class="pt-3 border-t border-slate-800 shrink-0">
          <RetroButton variant="default" block @click="showTravelConfirm = true"
            extraClass="h-12 text-sm font-bold tracking-wider shadow-[0_0_20px_rgba(251,191,36,0.2)]">
            VIAJAR PARA {{ selectedDestination.name }}
          </RetroButton>
        </div>
      </div>
    </div>

    <!-- modal viagem -->
    <div v-if="showTravelConfirm" class="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <RetroCard extraClass="max-w-md w-full border-amber-500 shadow-[0_0_50px_rgba(251,191,36,0.3)]">
        <div class="p-6 text-center space-y-6">
          <h3 class="text-2xl font-display text-white uppercase">CONFIRMAR PLANO DE VOO</h3>
          <div class="py-4 border-y border-dashed border-slate-700 bg-slate-900/50">
            <div class="flex justify-between text-xs text-slate-400 mb-2"><span>ORIGEM</span><span class="text-white">{{ currentCity?.name }}</span></div>
            <div class="flex justify-center my-1 text-amber-500">⬇</div>
            <div class="flex justify-between text-base font-bold text-amber-400"><span>DESTINO</span><span>{{ selectedDestination?.name }}</span></div>
          </div>
          <div class="flex gap-4">
            <RetroButton variant="outline" class="flex-1" @click="cancelTravel">CANCELAR</RetroButton>
            <RetroButton variant="default" class="flex-1" :disabled="isTraveling" @click="confirmTravel">
              {{ isTraveling ? 'VIAJANDO...' : 'DECOLAR' }}
            </RetroButton>
          </div>
        </div>
      </RetroCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '@/composables/useGame'
import { useSfx } from '@/composables/useSfx'
import WorldMap from '@/components/map/WorldMap.vue'
import RetroCard from '@/components/ui/RetroCard.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import { project, unproject, formatCoords, MAP_ASPECT } from '@/utils/geoProjection'

const route = useRoute()
const router = useRouter()
const sfx = useSfx()
const caseId = route.params.id as string

const { visitCurrentCity, isLoading, travelToCity, lastGameOver } = useGame()

const canvasRef = ref<HTMLElement | null>(null)
const currentCity = ref<any>(null)
const destinations = ref<any[]>([])
const selectedDestination = ref<any | null>(null)
const isTraveling = ref(false)
const showTravelConfirm = ref(false)

const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const lastMouse = ref({ x: 0, y: 0 })
const cursorLabel = ref('—')

const BASE_W = 1100 // largura de referência do canvas em px (escala com o zoom)

const canvasStyle = computed(() => ({
  width: `min(100%, ${BASE_W}px)`,
  aspectRatio: String(MAP_ASPECT),
  maxHeight: '100%',
  transform: `scale(${zoom.value}) translate(${pan.value.x}px, ${pan.value.y}px)`,
  transformOrigin: 'center center',
  transition: isPanning.value ? 'none' : 'transform 0.2s ease-out',
  cursor: zoom.value > 1 ? (isPanning.value ? 'grabbing' : 'grab') : 'crosshair',
}))

const currentPos = computed(() =>
  currentCity.value?.geo ? project(currentCity.value.geo.lon, currentCity.value.geo.lat) : null,
)

const connectionPath = computed(() => {
  if (!currentPos.value || !selectedDestination.value?.pos) return null
  const a = currentPos.value
  const b = selectedDestination.value.pos
  const midX = (a.xPct + b.xPct) / 2
  const midY = (a.yPct + b.yPct) / 2 - Math.hypot(b.xPct - a.xPct, b.yPct - a.yPct) * 0.15
  return `M ${a.xPct} ${a.yPct} Q ${midX} ${midY} ${b.xPct} ${b.yPct}`
})

function onMouseMove(e: MouseEvent) {
  if (canvasRef.value) {
    const r = canvasRef.value.getBoundingClientRect()
    const xPct = ((e.clientX - r.left) / r.width) * 100
    const yPct = ((e.clientY - r.top) / r.height) * 100
    const { lon, lat } = unproject(xPct, yPct)
    cursorLabel.value = formatCoords(lon, lat)
  }
  if (isPanning.value) {
    pan.value = {
      x: pan.value.x + (e.clientX - lastMouse.value.x) / zoom.value,
      y: pan.value.y + (e.clientY - lastMouse.value.y) / zoom.value,
    }
    lastMouse.value = { x: e.clientX, y: e.clientY }
  }
}
function startPan(e: MouseEvent) {
  if (zoom.value <= 1) return
  isPanning.value = true
  lastMouse.value = { x: e.clientX, y: e.clientY }
}
function endPan() { isPanning.value = false }
function onWheel(e: WheelEvent) { (e.deltaY < 0 ? zoomIn : zoomOut)() }
function zoomIn() { zoom.value = Math.min(5, +(zoom.value + 0.5).toFixed(1)) }
function zoomOut() {
  zoom.value = Math.max(1, +(zoom.value - 0.5).toFixed(1))
  if (zoom.value === 1) pan.value = { x: 0, y: 0 }
}
function zoomReset() { zoom.value = 1; pan.value = { x: 0, y: 0 } }

function selectDestination(city: any) {
  if (selectedDestination.value?.id !== city.id) sfx.blip()
  selectedDestination.value = city
}
function cancelTravel() { showTravelConfirm.value = false; selectedDestination.value = null }

function confirmTravel() {
  if (!selectedDestination.value) return
  isTraveling.value = true
  sfx.travel()
  Promise.all([
    travelToCity(caseId, selectedDestination.value.id),
    new Promise((r) => setTimeout(r, 1400)),
  ])
    .then(([res]: any[]) => {
      if (res?.gameOver || lastGameOver.value) {
        const solved = res?.solved ?? lastGameOver.value === 'WIN'
        router.push({
          path: `/cases/${caseId}/debriefing`,
          query: {
            status: solved ? 'SOLVED' : 'FAILED',
            xp: res?.xpEarned ?? 0,
            rep: res?.repDelta ?? 0,
            msg: res?.text || res?.message || '',
          },
        })
        return
      }
      router.push(`/cases/${caseId}/city`)
    })
    .catch((err) => {
      sfx.error()
      alert('Erro na viagem: ' + (err?.message || 'Falha desconhecida'))
      isTraveling.value = false
      showTravelConfirm.value = false
    })
}

function goToCity() { router.push(`/cases/${caseId}/city`) }
function goToDashboard() { router.push('/dashboard') }

onMounted(async () => {
  try {
    const visit = await visitCurrentCity(caseId)
    if (!visit?.city) return
    currentCity.value = {
      id: visit.city.city_id,
      name: visit.city.city_name,
      country: visit.city.country_name,
      geo: { lat: Number(visit.city.lat ?? 0), lon: Number(visit.city.lon ?? 0) },
    }
    destinations.value = (visit.travelOptions || []).map((r: any) => {
      const lon = Number(r.longitude)
      const lat = Number(r.latitude)
      return {
        id: r.id,
        name: r.name,
        country: r.country_name,
        travelTime: r.travel_time_formatted,
        pos: project(lon, lat),
      }
    })
    if (lastGameOver.value) {
      router.push(`/cases/${caseId}/debriefing?status=${lastGameOver.value === 'WIN' ? 'SOLVED' : 'FAILED'}`)
    }
  } catch (e) {
    console.error('Erro ao carregar mapa:', e)
  }
})
</script>

<style scoped>
.retro-btn-icon {
  @apply w-9 h-9 flex items-center justify-center bg-slate-900 border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors active:scale-95 text-lg;
}
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
.route-dash { animation: dash 1.2s linear infinite; }
@keyframes dash { to { stroke-dashoffset: -5; } }
.animate-ping-slow { animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
</style>
