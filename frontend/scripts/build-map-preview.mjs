#!/usr/bin/env node
/**
 * Gera public/map-preview.html — página autocontida para validar VISUALMENTE
 * a projeção do mapa (pins sobre as cidades certas) em várias larguras de tela.
 * Abra o arquivo direto no navegador (não precisa de servidor).
 *
 *   node scripts/build-map-preview.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { feature } from 'topojson-client'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const topo = JSON.parse(readFileSync(join(root, 'node_modules/world-atlas/countries-50m.json'), 'utf8'))

// Projeção idêntica a utils/geoProjection.ts
const F = { lonMin: -180, lonMax: 180, latMin: -56, latMax: 74 }
const VB_W = 1000
const VB_H = Math.round(VB_W / ((F.lonMax - F.lonMin) / (F.latMax - F.latMin)))
const sx = (lon) => ((lon - F.lonMin) / (F.lonMax - F.lonMin)) * VB_W
const sy = (lat) => ((F.latMax - lat) / (F.latMax - F.latMin)) * VB_H

const fc = feature(topo, topo.objects.countries)
const parts = []
const ring = (coords) => {
  let d = ''
  let prev = null
  let up = true
  for (const [lon, lat] of coords) {
    if (prev !== null && Math.abs(lon - prev) > 180) up = true
    d += `${up ? 'M' : 'L'}${sx(lon).toFixed(1)} ${sy(lat).toFixed(1)}`
    up = false
    prev = lon
  }
  return d
}
for (const f of fc.features) {
  const g = f.geometry
  if (!g) continue
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  for (const poly of polys) for (const r of poly) parts.push(ring(r))
}
const landPath = parts.join('')

// Cidades do seed (backend/prisma/seed.js)
const CITIES = [
  ['Cairo', 'Egito', 30.0444, 31.2357], ['Marrakech', 'Marrocos', 31.6295, -7.9811],
  ['Cidade do Cabo', 'África do Sul', -33.9249, 18.4241], ['Nairóbi', 'Quênia', -1.2921, 36.8219],
  ['Lagos', 'Nigéria', 6.5244, 3.3792], ['Adis Abeba', 'Etiópia', 9.03, 38.7469],
  ['Nova York', 'EUA', 40.7128, -74.006], ['São Francisco', 'EUA', 37.7749, -122.4194],
  ['Cidade do México', 'México', 19.4326, -99.1332], ['Toronto', 'Canadá', 43.6532, -79.3832],
  ['Havana', 'Cuba', 23.1136, -82.3666], ['Cidade da Guatemala', 'Guatemala', 14.6349, -90.5069],
  ['Rio de Janeiro', 'Brasil', -22.9068, -43.1729], ['Buenos Aires', 'Argentina', -34.6037, -58.3816],
  ['Lima', 'Peru', -12.0464, -77.0428], ['Bogotá', 'Colômbia', 4.711, -74.0721],
  ['Santiago', 'Chile', -33.4489, -70.6693], ['La Paz', 'Bolívia', -16.5, -68.15],
  ['Tóquio', 'Japão', 35.6762, 139.6503], ['Pequim', 'China', 39.9042, 116.4074],
  ['Nova Délhi', 'Índia', 28.6139, 77.209], ['Bangcoc', 'Tailândia', 13.7563, 100.5018],
  ['Dubai', 'EAU', 25.2048, 55.2708], ['Istambul', 'Turquia', 41.0082, 28.9784],
  ['Paris', 'França', 48.8566, 2.3522], ['Londres', 'Reino Unido', 51.5074, -0.1278],
  ['Roma', 'Itália', 41.9028, 12.4964], ['Berlim', 'Alemanha', 52.52, 13.405],
  ['Madri', 'Espanha', 40.4168, -3.7038], ['Atenas', 'Grécia', 37.9838, 23.7275],
  ['Moscou', 'Rússia', 55.7558, 37.6173], ['Sydney', 'Austrália', -33.8688, 151.2093],
  ['Melbourne', 'Austrália', -37.8136, 144.9631], ['Wellington', 'Nova Zelândia', -41.2865, 174.7762],
  ['Auckland', 'Nova Zelândia', -36.8485, 174.7633], ['Suva', 'Fiji', -18.1416, 178.4419],
  ['Port Moresby', 'Papua-Nova Guiné', -9.4438, 147.1803],
]
const project = (lon, lat) => ({
  xPct: ((lon - F.lonMin) / (F.lonMax - F.lonMin)) * 100,
  yPct: ((F.latMax - lat) / (F.latMax - F.latMin)) * 100,
})
const pins = CITIES.map(([name, country, lat, lon]) => {
  const p = project(lon, lat)
  return `<div class="pin" style="left:${p.xPct.toFixed(2)}%;top:${p.yPct.toFixed(2)}%" title="${name} — ${country}"><i></i><b>${name}</b></div>`
}).join('')

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Preview do mapa — Operação Mundo</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box;margin:0}
  body{background:#020617;color:#e2e8f0;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;padding:16px}
  h1{font-size:15px;color:#fbbf24;margin-bottom:4px}
  .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}
  button{background:#0f172a;border:1px solid #06b6d4;color:#67e8f9;padding:6px 12px;cursor:pointer}
  button.on{background:#06b6d4;color:#000}
  .frame{border:1px dashed #334155;margin:0 auto;overflow:hidden;resize:horizontal;transition:width .2s}
  .canvas{position:relative;width:100%;aspect-ratio:${(F.lonMax-F.lonMin)/(F.latMax-F.latMin)};background:#0a1626}
  svg{position:absolute;inset:0;width:100%;height:100%;display:block}
  .grid line{stroke:#1f3a5c;stroke-width:.6;opacity:.5}
  .land{fill:url(#lg);stroke:#0a1626;stroke-width:.5}
  .pin{position:absolute;transform:translate(-50%,-50%);z-index:2}
  .pin i{display:block;width:8px;height:8px;background:#06b6d4;border:1.5px solid #fff;transform:rotate(45deg);box-shadow:0 0 8px rgba(6,182,212,.8)}
  .pin b{position:absolute;left:50%;transform:translateX(-50%);margin-top:3px;font-size:9px;font-weight:700;white-space:nowrap;color:#a5f3fc;text-shadow:0 0 3px #000,0 0 3px #000}
  .note{color:#64748b;font-size:11px;margin-top:8px}
</style></head><body>
  <h1>Preview do mapa — projeção equiretangular</h1>
  <div class="note">37 cidades do seed posicionadas por <code>project(lon,lat)</code> (idêntico ao jogo). Troque a largura e confira se os losangos ciano ficam sobre o país certo. Também dá pra arrastar a borda direita da moldura.</div>
  <div class="bar">
    <span>Largura:</span>
    <button data-w="375">375 (mobile)</button>
    <button data-w="768">768 (tablet)</button>
    <button data-w="1024">1024</button>
    <button data-w="1440" class="on">1440 (notebook)</button>
    <button data-w="1920">1920 (desktop)</button>
    <button data-w="100%">100%</button>
  </div>
  <div class="frame" id="frame" style="width:100%">
    <div class="canvas">
      <svg viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="none">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2f7d5a"/><stop offset="55%" stop-color="#3fae6b"/><stop offset="100%" stop-color="#d7e35a"/>
        </linearGradient></defs>
        <rect width="${VB_W}" height="${VB_H}" fill="#0a1626"/>
        <g class="grid">
          ${Array.from({length:13},(_,i)=>{const x=sx(-180+i*30).toFixed(1);return `<line x1="${x}" y1="0" x2="${x}" y2="${VB_H}"/>`}).join('')}
          ${Array.from({length:6},(_,i)=>{const y=sy(-60+i*30).toFixed(1);return `<line x1="0" y1="${y}" x2="${VB_W}" y2="${y}"/>`}).join('')}
        </g>
        <path class="land" d="${landPath}"/>
      </svg>
      ${pins}
    </div>
  </div>
  <script>
    const frame=document.getElementById('frame')
    const setW=(w)=>{document.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.w===w));frame.style.width=w}
    for(const b of document.querySelectorAll('button[data-w]')) b.onclick=()=>setW(b.dataset.w)
    const q=new URLSearchParams(location.search).get('w'); if(q) setW(q.endsWith('%')?q:q+'px'); else setW('100%')
  <\/script>
</body></html>
`

writeFileSync(join(root, 'public/map-preview.html'), html)
console.log('gerado: frontend/public/map-preview.html  (' + (html.length / 1024).toFixed(0) + ' KB)')
