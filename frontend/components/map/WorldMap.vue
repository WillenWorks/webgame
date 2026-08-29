<template>
  <svg
    class="world-map"
    :viewBox="`0 0 ${VB_W} ${VB_H}`"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="landGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2f7d5a" />
        <stop offset="55%" stop-color="#3fae6b" />
        <stop offset="100%" stop-color="#d7e35a" />
      </linearGradient>
    </defs>

    <!-- oceano -->
    <rect x="0" y="0" :width="VB_W" :height="VB_H" fill="#0a1626" />

    <!-- graticula (grade de navegação) -->
    <g stroke="#1f3a5c" stroke-width="0.6" opacity="0.5">
      <line v-for="gx in gridX" :key="`x${gx.lon}`" :x1="gx.x" y1="0" :x2="gx.x" :y2="VB_H" />
      <line v-for="gy in gridY" :key="`y${gy.lat}`" x1="0" :y1="gy.y" :x2="VB_W" :y2="gy.y" />
    </g>

    <!-- continentes -->
    <path :d="landPath" fill="url(#landGradient)" stroke="#0a1626" stroke-width="0.5" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { feature } from 'topojson-client'
import topology from 'world-atlas/countries-50m.json'
import { MAP_FRAME, MAP_ASPECT } from '@/utils/geoProjection'

const VB_W = 1000
const VB_H = Math.round(VB_W / MAP_ASPECT)

const lonRange = MAP_FRAME.lonMax - MAP_FRAME.lonMin
const latRange = MAP_FRAME.latMax - MAP_FRAME.latMin

function sx(lon: number) {
  return ((lon - MAP_FRAME.lonMin) / lonRange) * VB_W
}
function sy(lat: number) {
  return ((MAP_FRAME.latMax - lat) / latRange) * VB_H
}

const gridX = computed(() => {
  const out: { lon: number; x: number }[] = []
  for (let lon = -180; lon <= 180; lon += 30) out.push({ lon, x: sx(lon) })
  return out
})
const gridY = computed(() => {
  const out: { lat: number; y: number }[] = []
  for (let lat = -60; lat <= 90; lat += 30) out.push({ lat, y: sy(lat) })
  return out
})

const landPath = computed(() => {
  // TopoJSON → GeoJSON (uma vez). world-atlas usa objects.countries.
  const fc: any = feature(topology as any, (topology as any).objects.countries)
  const parts: string[] = []

  // Quebra o traçado quando o segmento cruza o antimeridiano (±180°),
  // evitando a faixa horizontal de preenchimento de países como Rússia/Fiji.
  const ring = (coords: number[][]) => {
    let d = ''
    let prevLon: number | null = null
    let penUp = true
    for (const [lon, lat] of coords) {
      if (prevLon !== null && Math.abs(lon - prevLon) > 180) penUp = true
      d += `${penUp ? 'M' : 'L'}${sx(lon).toFixed(1)} ${sy(lat).toFixed(1)}`
      penUp = false
      prevLon = lon
    }
    return d
  }

  for (const f of fc.features) {
    const g = f.geometry
    if (!g) continue
    if (g.type === 'Polygon') {
      for (const r of g.coordinates) parts.push(ring(r))
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) for (const r of poly) parts.push(ring(r))
    }
  }
  return parts.join('')
})
</script>

<style scoped>
.world-map {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
</style>
