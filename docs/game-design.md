# Operação Mundo — Game Design (fonte da verdade)

Documento vivo com as regras **efetivamente implementadas** do jogo. Sempre que uma
regra mudar no código, atualize aqui. Constantes centrais: `backend/src/config/game.rules.js`.

---

## Conceito

Jogo educativo de geografia + dedução, estética CRT/terminal, inspirado em Carmen
Sandiego. O jogador é um detetive da agência **ACME** perseguindo um ladrão de
artefatos culturais por cidades reais, decifrando **pistas culturalmente corretas**
sobre o próximo destino e montando o **dossiê** do vilão até restar 1 suspeito —
tudo sob **prazo** (relógio in-game), com **XP / reputação / patente**.

## Fluxo de uma partida

```
login → perfil de detetive → abrir caso (dificuldade)
      → briefing (objeto roubado + contexto cultural)
      → [por cidade da rota]
          visitar localidades → investigar (pistas de destino + atributos do vilão)
          → consultar dossiê / anotar atributos
          → viajar para a próxima cidade
      → na cidade final: emitir mandado → efetuar a captura
      → debriefing (XP, reputação, promoção)
```

## Geração do caso (`createCaseService`)

| Etapa | Fonte |
|---|---|
| **Suspeitos** | 12 por caso, 5 atributos cada (sexo, cabelo, hobby, veículo, característica). Exatamente 1 é o culpado. `domain/suspect.rules.js` garante que a combinação completa dos 5 atributos do culpado é **única** na pool. |
| **Pistas do vilão** | Os 5 atributos do culpado viram um baralho (`case_villain_clues`), revelados um a um ao investigar localidades `VILLAIN`. |
| **Rota** | 5 cidades encadeadas via `domain/route.rules.js`: regiões adjacentes, saltos curtos (haversine), no máx. 1 salto entre regiões não-adjacentes, país nunca repetido em sequência. |
| **Opções de destino** | Por passo: 1 correta + decoys plausíveis (mesma região / região vizinha do destino, país ≠ destino). Total por dificuldade: **EASY 3 · HARD 4 · EXTREME 5** (+1 decoy a partir de Investigador Sênior). |
| **Briefing** | `case.generator` — objeto roubado + `introText` culturalmente ancorado na cidade de partida. IA opcional; fallback regional determinístico. |
| **Relógio / deadline** | Simulação honesta: viagens reais + `investigationsPerCity × 60 min` + folga por dificuldade (`DEADLINE_MODEL`). |

## Localidades por cidade (`LOCALITIES_BY_DIFFICULTY`)

| Dificuldade | Localidades | Mix |
|---|---|---|
| EASY | 3 | 2 NEXT_LOCATION + 1 VILLAIN |
| HARD | 4 | 2 NEXT_LOCATION + 2 VILLAIN |
| EXTREME | 5 | 2 NEXT_LOCATION + 3 VILLAIN |

- Cidades **decoy** recebem a mesma quantidade de locais, todos VILLAIN → investigar num decoy só gera **WARNING**.
- Na cidade final, o 1º local da cidade correta é o **ponto de captura**.

## Custos de tempo in-game (`domain/time.rules.js`)

| Ação | Custo |
|---|---|
| Investigar uma localidade | **60 min** |
| Viajar | calculado: override do banco → classificação por região/vizinhança → fallback por distância (carro ~90 km/h no mesmo país, avião ~800 km/h; overhead cresce em HARD/EXTREME) |
| Falha aleatória de viagem (HARD 5% / EXTREME 10%) | perde **35%** do tempo da viagem (não a viagem toda), tenta de novo |

**Janela de sono:** o detetive não age entre **23:00 e 08:00** — o relógio "pula" a
noite. Jornada útil ≈ 15 h/dia. Timezone: `GAME_TIMEZONE` (`America/Sao_Paulo`).

## Pistas (`domain/clue.rules.js`)

- **NEXT_LOCATION** — indício indireto sobre a próxima cidade, montado **exclusivamente
  a partir dos dados culturais validados do seed** daquela cidade (moeda, marco, prato…).
  Nunca cita outra cidade; nunca cita o nome da cidade-alvo diretamente.
- **VILLAIN_ATTRIBUTE** — revela **um** atributo do culpado (valor exato da pool).
- **WARNING** — investigou num decoy ou na cidade final sem ter o que revelar.
- A **IA é enriquecimento opcional**: se ativa, reescreve o indício determinístico no
  estilo do NPC; se falha, muda de cidade ou entrega o nome direto → cai no determinístico.
  **O jogo é 100% jogável e correto sem chave de IA.**

## Dossiê e mandado

- Os selects de atributo vêm de `GET /cases/:id/suspects/attributes` (valores reais da
  pool deste caso) — **nunca hardcoded**.
- Anotar atributos filtra a pool (`domain/dossier.rules.js`). Com **1 suspeito** restante,
  o mandado pode ser emitido.
- Mandado é obrigatório para prender. Chegar ao ponto de captura sem mandado, ou com
  mandado contra a pessoa errada → **FAILED**.

## Desfecho e progressão (`finish_case.service.js`)

- **SOLVED**: mandado correto + captura. **FAILED**: mandado errado/ausente, ou tempo esgotado.
- **XP** (`domain/xp.rules.js`): base da dificuldade + bônus por **dias adiantados** (reais,
  do relógio) + bônus de **precisão** (sem erros de rota) + multiplicador de reputação;
  `debuff` em caso de falha; atenuação por erros de rota em HARD/EXTREME.
- **Reputação**: `REPUTATION_DELTA` por dificuldade (EASY ±10/−5 · HARD ±15/−8 · EXTREME ±20/−10),
  limitada a **[−1000, 1000]**. Faixas de reputação (seed) aplicam multiplicadores de XP.
- **`case_performance`**: linha gravada com `visitsCount`, `routeErrors`,
  `finishedEarlierMinutes`, `perfectPrecision`, `xpAwarded`, `reputationDelta`.
- **Promoção de patente**: checada a cada fechamento; `rank_id` atualizado.

## Patentes (seed)

| # | Título | XP mínimo | Seleção de missão |
|---|---|---|---|
| 1 | Recruta da ACME | 0 | — |
| 2 | Agente de Campo | 1 000 | — |
| 3 | Investigador Sênior | 5 000 | ✓ (+1 decoy) |
| 4 | Detetive-Chefe | 15 000 | ✓ |
| 5 | Superintendente | 40 000 | ✓ |
| 6 | Diretor da ACME | 100 000 | ✓ |

## Mapa (`components/map/WorldMap.vue` + `utils/geoProjection.ts`)

- Projeção **equiretangular** pura. Quadro `MAP_FRAME` cobre todas as 37 cidades do seed.
- Continentes: SVG de `world-atlas` (110m) + `topojson-client`.
- Pins posicionados por `left/top` em **%** (via `project(lon, lat)`) dentro de um
  contêiner com `aspect-ratio` travado → posição correta em **qualquer tamanho de tela**,
  sem calibração. Zoom/pan = `transform` só no canvas.

## Verificação

```bash
# backend
docker compose up -d && cd backend && npm run db:seed
npm test                    # regras puras + geração (skip se sem DB)
npm run dev                  # em outro terminal:
npm run e2e:all              # EASY + HARD + EXTREME

# frontend
cd frontend && npm run check && npm run build
```
