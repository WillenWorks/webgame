// src/domain/route.rules.js
// Geração PURA da rota de perseguição — sem acesso a banco.
// Constrói uma cadeia geograficamente coerente de cidades e as opções de
// destino (1 correta + decoys plausíveis) mostradas no mapa a cada passo.

import { haversineKm } from './time.rules.js';
import { ROUTE_STEPS, routeOptionsFor } from '../config/game.rules.js';

/**
 * Adjacência entre as 6 regiões do seed. Um salto entre regiões adjacentes é
 * "plausível" para o jogador; saltos não-adjacentes são permitidos no máximo
 * uma vez por rota (para dar variedade sem virar teletransporte).
 */
const REGION_ADJACENCY = {
  'América do Norte': ['América do Sul', 'Europa', 'Ásia'],
  'América do Sul': ['América do Norte', 'África'],
  'África': ['América do Sul', 'Europa', 'Ásia'],
  'Europa': ['África', 'Ásia', 'América do Norte'],
  'Ásia': ['Europa', 'África', 'Oceania', 'América do Norte'],
  'Oceania': ['Ásia'],
};

export function regionsAreAdjacent(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  return (REGION_ADJACENCY[a] || []).includes(b);
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedPick(candidates, rand) {
  // Peso inversamente proporcional à distância: privilegia saltos curtos
  // (perseguição), mas sem nunca zerar a chance dos mais distantes.
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let r = rand() * total;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return candidates[candidates.length - 1];
}

/**
 * @param {object}   params
 * @param {Array<{id:number,name:string,country_id:number,region_name:string,lat:number,lng:number}>} params.cities
 * @param {'EASY'|'HARD'|'EXTREME'} params.difficulty
 * @param {number}  [params.steps]           quantidade de cidades da rota
 * @param {number}  [params.optionsPerStep]  total de opções por passo (1 correta + decoys)
 * @param {number}  [params.extraDecoys]     decoys adicionais (nudge de patente alta)
 * @param {() => number} [params.rand]       gerador pseudo-aleatório (para testes determinísticos)
 * @returns {{ route: number[], optionsByStep: Array<{options:number[],primary:number}|null> }}
 */
export function buildRoute({
  cities,
  difficulty = 'EASY',
  steps = ROUTE_STEPS,
  optionsPerStep = null,
  extraDecoys = 0,
  rand = Math.random,
}) {
  if (!Array.isArray(cities) || cities.length < steps + 2) {
    throw new Error(`buildRoute: cidades insuficientes (${cities?.length || 0})`);
  }

  const totalOptions = (optionsPerStep ?? routeOptionsFor(difficulty)) + Math.max(0, extraDecoys);
  const byId = new Map(cities.map((c) => [c.id, c]));

  // ── 1. Cadeia de cidades ──────────────────────────────────────────────
  const route = [];
  const used = new Set();
  let longHauls = 0;
  const MAX_LONG_HAULS = 1;

  const start = shuffle(cities, rand)[0];
  route.push(start.id);
  used.add(start.id);

  while (route.length < steps) {
    const prev = byId.get(route[route.length - 1]);

    const adjacent = cities.filter(
      (c) =>
        !used.has(c.id) &&
        c.country_id !== prev.country_id &&
        regionsAreAdjacent(prev.region_name, c.region_name),
    );

    let pool = adjacent;
    let isLongHaul = false;
    if (pool.length === 0 && longHauls < MAX_LONG_HAULS) {
      pool = cities.filter((c) => !used.has(c.id) && c.country_id !== prev.country_id);
      isLongHaul = true;
    }
    if (pool.length === 0) {
      pool = cities.filter((c) => !used.has(c.id));
    }

    const withWeight = pool.map((c) => {
      const km = haversineKm(prev.lat, prev.lng, c.lat, c.lng);
      return { city: c, weight: 1 / (1 + km / 1000) };
    });
    const chosen = weightedPick(withWeight, rand).city;

    route.push(chosen.id);
    used.add(chosen.id);
    if (isLongHaul && !regionsAreAdjacent(prev.region_name, chosen.region_name)) longHauls++;
  }

  // ── 2. Opções (decoys) por passo ──────────────────────────────────────
  const routeSet = new Set(route);
  const optionsByStep = route.map((cityId, i) => {
    if (i >= route.length - 1) return null; // último passo não tem viagem
    const primary = route[i + 1];
    const target = byId.get(primary);

    const near = cities.filter(
      (c) =>
        !routeSet.has(c.id) &&
        c.country_id !== target.country_id &&
        regionsAreAdjacent(target.region_name, c.region_name),
    );
    let decoyPool = near.length >= totalOptions - 1
      ? near
      : cities.filter((c) => !routeSet.has(c.id) && c.country_id !== target.country_id);

    // Diversifica países entre os decoys quando possível.
    const decoys = [];
    const seenCountries = new Set();
    for (const c of shuffle(decoyPool, rand)) {
      if (decoys.length >= totalOptions - 1) break;
      if (seenCountries.has(c.country_id)) continue;
      decoys.push(c.id);
      seenCountries.add(c.country_id);
    }
    for (const c of shuffle(decoyPool, rand)) {
      if (decoys.length >= totalOptions - 1) break;
      if (!decoys.includes(c.id)) decoys.push(c.id);
    }

    const options = shuffle([primary, ...decoys], rand);
    return { options, primary };
  });

  return { route, optionsByStep };
}
