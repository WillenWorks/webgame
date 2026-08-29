// utils/geoProjection.ts
// Projeção equiretangular (plate carrée) — exata, sem calibração por tela.
// O mapa e os pins vivem no mesmo sistema de coordenadas percentuais.

/**
 * Recorte geográfico do mapa. Cobre todas as 37 cidades do seed com margem
 * (lat de Wellington ~-41 a Moscou ~+56) e corta o vazio polar/Antártida.
 */
export const MAP_FRAME = {
  lonMin: -180,
  lonMax: 180,
  latMin: -56,
  latMax: 74,
} as const

export const MAP_ASPECT =
  (MAP_FRAME.lonMax - MAP_FRAME.lonMin) / (MAP_FRAME.latMax - MAP_FRAME.latMin)

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/** lon/lat (graus) → posição percentual [0..100] dentro do quadro do mapa. */
export function project(lon: number, lat: number): { xPct: number; yPct: number } {
  const lo = Number.isFinite(lon) ? lon : 0
  const la = Number.isFinite(lat) ? lat : 0
  const xPct = ((lo - MAP_FRAME.lonMin) / (MAP_FRAME.lonMax - MAP_FRAME.lonMin)) * 100
  const yPct = ((MAP_FRAME.latMax - la) / (MAP_FRAME.latMax - MAP_FRAME.latMin)) * 100
  return { xPct: clamp(xPct, -20, 120), yPct: clamp(yPct, -20, 120) }
}

/** posição percentual [0..100] → lon/lat (graus). Inverso de `project`. */
export function unproject(xPct: number, yPct: number): { lon: number; lat: number } {
  const lon = MAP_FRAME.lonMin + (xPct / 100) * (MAP_FRAME.lonMax - MAP_FRAME.lonMin)
  const lat = MAP_FRAME.latMax - (yPct / 100) * (MAP_FRAME.latMax - MAP_FRAME.latMin)
  return { lon, lat }
}

/** Rótulo "12.3°N 45.6°W" a partir de lon/lat. */
export function formatCoords(lon: number, lat: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'L' : 'O'
  return `${Math.abs(lat).toFixed(1)}°${ns} ${Math.abs(lon).toFixed(1)}°${ew}`
}
