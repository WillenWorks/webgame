// src/config/game.rules.js
// Constantes de balanceamento do jogo — fonte única para dificuldade, localidades,
// opções de rota e timezone in-game. Sem acesso a banco.

/** Timezone usada para a janela de sono do detetive (08:00–23:00). */
export const GAME_TIMEZONE = 'America/Sao_Paulo';

/** Número de passos (cidades) da rota de perseguição. */
export const ROUTE_STEPS = 5;

/**
 * Mix de localidades por cidade correta, por dificuldade.
 * - NEXT_LOCATION: pista sobre o próximo destino
 * - VILLAIN: pista sobre um atributo do vilão (alimenta o dossiê)
 * Cidades decoy recebem a mesma quantidade de locais, todos VILLAIN
 * (a investigação num decoy sempre gera WARNING).
 */
export const LOCALITIES_BY_DIFFICULTY = {
  EASY: ['NEXT_LOCATION', 'NEXT_LOCATION', 'VILLAIN'],
  HARD: ['NEXT_LOCATION', 'NEXT_LOCATION', 'VILLAIN', 'VILLAIN'],
  EXTREME: ['NEXT_LOCATION', 'NEXT_LOCATION', 'VILLAIN', 'VILLAIN', 'VILLAIN'],
};

/**
 * Total de opções de destino mostradas no mapa por passo (1 correta + decoys).
 * EASY 3 → 2 decoys · HARD 4 → 3 decoys · EXTREME 5 → 4 decoys.
 */
export const ROUTE_OPTIONS_BY_DIFFICULTY = {
  EASY: 3,
  HARD: 4,
  EXTREME: 5,
};

/** Ajuste de reputação por desfecho, escalado por dificuldade. */
export const REPUTATION_DELTA = {
  EASY: { solved: 10, failed: -5 },
  HARD: { solved: 15, failed: -8 },
  EXTREME: { solved: 20, failed: -10 },
};

/** Limites do placar de reputação do perfil (alinhado às faixas do seed e ao HUD). */
export const REPUTATION_BOUNDS = { min: -1000, max: 1000 };

/** Custo fixo, em minutos in-game, de investigar uma localidade. */
export const INVESTIGATE_MINUTES = 60;

/**
 * Modelo de prazo por dificuldade — usado para simular o deadline do caso.
 * `investigationsPerCity`: quantas localidades o jogador "deveria" investigar
 * por cidade (EXTREME exige pular parte). `bufferHours`: folga para caminhos
 * errados, releitura de pistas e tempo de decisão.
 */
export const DEADLINE_MODEL = {
  EASY: { investigationsPerCity: 3, bufferHours: 24 },
  HARD: { investigationsPerCity: 4, bufferHours: 16 },
  EXTREME: { investigationsPerCity: 3, bufferHours: 12 },
};

export function deadlineModelFor(difficulty) {
  return DEADLINE_MODEL[difficulty] || DEADLINE_MODEL.EASY;
}

export function localitiesFor(difficulty) {
  return LOCALITIES_BY_DIFFICULTY[difficulty] || LOCALITIES_BY_DIFFICULTY.EASY;
}

export function routeOptionsFor(difficulty) {
  return ROUTE_OPTIONS_BY_DIFFICULTY[difficulty] || ROUTE_OPTIONS_BY_DIFFICULTY.EASY;
}

export function reputationDeltaFor(difficulty, solved) {
  const cfg = REPUTATION_DELTA[difficulty] || REPUTATION_DELTA.EASY;
  return solved ? cfg.solved : cfg.failed;
}

export function clampReputation(score) {
  return Math.max(REPUTATION_BOUNDS.min, Math.min(REPUTATION_BOUNDS.max, Math.round(score)));
}
