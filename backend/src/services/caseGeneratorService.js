// src/services/caseGeneratorService.js
import { getDbPool } from "../database/database.js";
import { generateCarmenCaseStructure } from "./llmService.js";
import { determineAgentPositionByXp } from "./gameMechanicsService.js";

// função util pra embaralhar array simples
function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

// normaliza os nomes de atributos vindos da IA
function mapAttributeName(raw) {
  if (!raw) return null;
  const n = String(raw).toLowerCase().trim();

  if (["hair", "hair_color", "cabelo", "cor_do_cabelo"].includes(n))
    return "hair_color";

  if (["vehicle", "car", "veiculo", "veículo"].includes(n)) return "vehicle";

  if (["hobby", "hobbie"].includes(n)) return "hobby";

  if (["occupation", "job", "profissao", "profissão"].includes(n))
    return "occupation";

  if (
    ["feature", "caracteristica", "característica", "trait", "characteristic"].includes(
      n
    )
  )
    return "feature";

  if (["sex", "gender", "sexo"].includes(n)) return "sex";

  return n;
}

function getVillainAttributeValue(villain, attributeName) {
  switch (attributeName) {
    case "hair_color":
      return villain.hair_color;
    case "vehicle":
      return villain.vehicle;
    case "hobby":
      return villain.hobby;
    case "occupation":
      return villain.occupation;
    case "feature":
      return villain.feature;
    case "sex":
      return villain.sex;
    default:
      return null;
  }
}

/**
 * Gera um identificador estável de localidade dentro do caso.
 * Não precisa ser globalmente único, só consistente por case/step/ordem.
 */
function buildLocationUid(caseId, stepOrder, index) {
  return `case-${caseId}-step-${stepOrder}-loc-${index + 1}`;
}

/**
 * Cria um caso para um agente:
 * - busca rank e reputação do agente
 * - escolhe 1 vilão culpado
 * - escolhe 9 vilões falsos
 * - gera steps a partir do LLM (considerando rank/reputação)
 * - cria steps com local (case_steps)
 * - cria opções de viagem e locais por step (case_travel_options, case_step_locations)
 * - cria NPCs por step (case_step_npcs) e por localidade (case_location_npcs)
 * - cria relação de pistas (case_villain_clues) a partir dos steps da IA
 * - cria suspects (case_suspects)
 */
export async function createCaseForAgent(agentId, difficulty = "easy") {
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 0) Busca info do agente (xp + reputação) para rank / IA
    const [[agentRow]] = await conn.query(
      `
      SELECT id, xp, reputation
      FROM agents
      WHERE id = ?
      `,
      [agentId]
    );

    if (!agentRow) {
      throw new Error(
        "Agente não encontrado ao tentar criar caso (createCaseForAgent)."
      );
    }

    const xp = agentRow.xp ?? 0;
    const reputation = agentRow.reputation ?? 50;
    const agentRank = determineAgentPositionByXp(xp);

    // 1) Busca vilões ativos
    const [villains] = await conn.query(
      "SELECT * FROM villain_templates WHERE active = 1"
    );

    if (!villains || villains.length < 10) {
      throw new Error(
        "É necessário ter pelo menos 10 vilões em villain_templates para gerar um caso."
      );
    }

    // 2) Escolhe vilão culpado + 9 vilões falsos
    const shuffledVillains = shuffle(villains);
    const guiltyVillain = shuffledVillains[0];
    const fakeVillains = shuffledVillains.slice(1, 10);

    // 3) Busca alguns locais
    const [locations] = await conn.query(
      `
      SELECT id, name, country, region
      FROM locations
      ORDER BY RAND()
      LIMIT 8
      `
    );

    if (!locations || locations.length === 0) {
      throw new Error("Nenhum local encontrado para gerar um caso.");
    }

    // 4) Usa LLM pra gerar estrutura do caso (já considerando rank e reputação)
    const structure = await generateCarmenCaseStructure({
      villain: guiltyVillain,
      locations,
      difficulty,
      agentRank,
      agentReputation: reputation,
    });

    // 5) Cria o case
    const [caseInsert] = await conn.query(
      `
      INSERT INTO cases (
        agent_id,
        villain_id,
        title,
        summary,
        difficulty,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, 'available', NOW())
      `,
      [
        agentId,
        guiltyVillain.id,
        structure.title,
        structure.summary,
        difficulty,
      ]
    );

    const caseId = caseInsert.insertId;

    // 6) Cria case_steps + registra mapeamento (step_order -> step_id)
    const stepMap = new Map();
    const totalSteps = structure.steps?.length || 0;

    for (const step of structure.steps) {
      const stepOrder = step.order;

      // tenta casar step.location com algum location.name do banco
      let toLocationId = null;

      if (step.location) {
        const lower = String(step.location).toLowerCase().trim();
        const match = locations.find(
          (loc) => String(loc.name).toLowerCase().trim() === lower
        );
        if (match) {
          toLocationId = match.id;
        }
      }

      // fallback: se não casar, usa o location sorteado pelo índice
      if (!toLocationId) {
        const fallbackLocation =
          locations[(stepOrder - 1) % locations.length] || locations[0];
        toLocationId = fallbackLocation.id;
      }

      const [stepInsert] = await conn.query(
        `
        INSERT INTO case_steps (
          case_id,
          step_order,
          step_type,
          to_location_id,
          description
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [caseId, stepOrder, step.type, toLocationId, step.description]
      );

      stepMap.set(stepOrder, stepInsert.insertId);
    }

    // 6b) Grava opções de viagem, locais de pista e NPCs por step / localidade
    if (Array.isArray(structure.steps)) {
      for (const step of structure.steps) {
        const stepOrder = step.order;

        // 6b.1) Opções de país para viagem (case_travel_options)
        if (
          step.country_correct &&
          Array.isArray(step.country_options) &&
          step.country_options.length > 0
        ) {
          const correctCountry = String(step.country_correct).toLowerCase().trim();
          const uniqueCountries = [...new Set(step.country_options)];

          for (const countryNameRaw of uniqueCountries) {
            const countryName = String(countryNameRaw).trim();
            if (!countryName) continue;

            const isCorrect =
              countryName.toLowerCase().trim() === correctCountry ? 1 : 0;

            await conn.query(
              `
              INSERT INTO case_travel_options (
                case_id,
                step_order,
                country_name,
                is_correct_country
              )
              VALUES (?, ?, ?, ?)
              `,
              [caseId, stepOrder, countryName, isCorrect]
            );
          }
        }

        // 6b.2) Locais dentro do país (case_step_locations) + NPC por local (case_location_npcs)
        if (Array.isArray(step.locations_in_country)) {
          let locationIndex = 0;

          for (const place of step.locations_in_country) {
            const countryName = step.country_correct || null;
            const placeName = place.name || null;
            const placeType = place.place_type || null;
            const role = place.role || "empty";
            const clueText = place.clue_text || null;
            const suspectAttr = mapAttributeName(place.suspect_attribute) || null;

            const isDummy = place.is_dummy ? 1 : 0;
            const locationUid = buildLocationUid(caseId, stepOrder, locationIndex);

            const [locationInsert] = await conn.query(
              `
              INSERT INTO case_step_locations (
                case_id,
                step_order,
                country_name,
                place_name,
                place_type,
                role,
                clue_text,
                suspect_attribute,
                is_dummy,
                location_uid
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                caseId,
                stepOrder,
                countryName,
                placeName,
                placeType,
                role,
                clueText,
                suspectAttr,
                isDummy,
                locationUid,
              ]
            );

            const locationId = locationInsert.insertId;

            // Cria NPC vinculado à localidade (case_location_npcs)
            if (Array.isArray(step.npcs) && step.npcs.length > 0) {
              const npc = step.npcs[locationIndex % step.npcs.length];

              await conn.query(
                `
                INSERT INTO case_location_npcs (
                  case_id,
                  step_order,
                  location_id,
                  archetype,
                  allegiance,
                  attitude,
                  dialogue_high_reputation,
                  dialogue_neutral_reputation,
                  dialogue_low_reputation
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                  caseId,
                  stepOrder,
                  locationId,
                  npc.archetype || null,
                  npc.allegiance || "neutral",
                  npc.attitude || "neutral",
                  npc.dialogue_high_reputation || null,
                  npc.dialogue_neutral_reputation || null,
                  npc.dialogue_low_reputation || null,
                ]
              );
            }

            locationIndex += 1;
          }
        }

        // 6b.3) NPCs do step (case_step_npcs) – mantido por compatibilidade
        if (Array.isArray(step.npcs)) {
          for (const npc of step.npcs) {
            await conn.query(
              `
              INSERT INTO case_step_npcs (
                case_id,
                step_order,
                archetype,
                allegiance,
                attitude,
                dialogue_high_reputation,
                dialogue_neutral_reputation,
                dialogue_low_reputation
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                caseId,
                stepOrder,
                npc.archetype || null,
                npc.allegiance || "neutral",
                npc.attitude || "neutral",
                npc.dialogue_high_reputation || null,
                npc.dialogue_neutral_reputation || null,
                npc.dialogue_low_reputation || null,
              ]
            );
          }
        }
      }
    }

    // 7) Cria pistas do vilão (case_villain_clues) a partir dos steps da IA
    const villainClues = [];

    if (Array.isArray(structure.steps)) {
      for (const step of structure.steps) {
        const stepOrder = step.order;

        // 7.1) Pista em nível de step (villain_clue_attribute)
        if (step.villain_clue_attribute) {
          const attrName = mapAttributeName(step.villain_clue_attribute);
          const attrValue = getVillainAttributeValue(guiltyVillain, attrName);
          if (attrName && attrValue) {
            villainClues.push({
              step_order: stepOrder,
              attribute_name: attrName,
              attribute_value: attrValue,
            });
          }
        }

        // 7.2) Pistas de suspeito vindas de locations_in_country (role = suspect_clue)
        if (Array.isArray(step.locations_in_country)) {
          for (const place of step.locations_in_country) {
            if (place.role !== "suspect_clue" || !place.suspect_attribute) {
              continue;
            }

            const attrName = mapAttributeName(place.suspect_attribute);
            const attrValue = getVillainAttributeValue(guiltyVillain, attrName);

            if (attrName && attrValue) {
              villainClues.push({
                step_order: stepOrder,
                attribute_name: attrName,
                attribute_value: attrValue,
              });
            }
          }
        }
      }
    }

    if (villainClues.length > 0) {
      for (const clue of villainClues) {
        const stepDbId = stepMap.get(clue.step_order) || null;

        await conn.query(
          `
          INSERT INTO case_villain_clues (
            case_id,
            step_id,
            attribute_name,
            attribute_value
          )
          VALUES (?, ?, ?, ?)
          `,
          [caseId, stepDbId, clue.attribute_name, clue.attribute_value]
        );
      }
    } else {
      // Fallback: gera pistas básicas a partir dos atributos do vilão culpado
      const baseClues = [
        { name: "hair_color", value: guiltyVillain.hair_color },
        { name: "occupation", value: guiltyVillain.occupation },
        { name: "hobby", value: guiltyVillain.hobby },
        { name: "vehicle", value: guiltyVillain.vehicle },
        { name: "feature", value: guiltyVillain.feature },
      ].filter((c) => c.value);

      const stepIds = Array.from(stepMap.values());

      for (let index = 0; index < baseClues.length; index++) {
        if (!stepIds.length) break;

        const clue = baseClues[index];
        const stepDbId = stepIds[Math.min(index, stepIds.length - 1)];

        await conn.query(
          `
          INSERT INTO case_villain_clues (
            case_id,
            step_id,
            attribute_name,
            attribute_value
          )
          VALUES (?, ?, ?, ?)
          `,
          [caseId, stepDbId, clue.name, clue.value]
        );
      }
    }

    // 8) Cria suspeitos (case_suspects) – 1 real + 9 falsos
    const allSuspects = [guiltyVillain, ...fakeVillains];

    for (const v of allSuspects) {
      const isGuilty = v.id === guiltyVillain.id ? 1 : 0;

      await conn.query(
        `
        INSERT INTO case_suspects (
          case_id,
          villain_template_id,
          is_guilty,
          name_snapshot,
          sex_snapshot,
          occupation_snapshot,
          hobby_snapshot,
          hair_color_snapshot,
          vehicle_snapshot,
          feature_snapshot,
          other_snapshot
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          caseId,
          v.id,
          isGuilty ? 1 : 0,
          v.name,
          v.sex || null,
          v.occupation || null,
          v.hobby || null,
          v.hair_color || null,
          v.vehicle || null,
          v.feature || null,
          v.other || null,
        ]
      );
    }

    await conn.commit();
    return caseId;
  } catch (err) {
    await conn.rollback();
    console.error("Erro em createCaseForAgent:", err);
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Retorna a lista de casos disponíveis para um agente,
 * respeitando o "rank" (posição interna calculada pelo XP):
 *
 * - trainee / field_agent
 *   => caso designado (no máx. 1 caso ativo)
 *   => se não houver caso, cria um "easy" automaticamente
 *
 * - senior_agent em diante
 *   => pode escolher entre casos disponíveis
 *   => se não houver nenhum, gera alguns casos (ex.: 3) para escolha
 */
export async function getAvailableCasesForAgent(agentId) {
  const pool = getDbPool();

  // 1) Carrega o perfil básico do agente
  const [[agentRow]] = await pool.query(
    `
    SELECT id, xp, position, reputation, solved_cases, failed_cases
    FROM agents
    WHERE id = ?
    `,
    [agentId]
  );

  if (!agentRow) {
    throw new Error("Agente não encontrado ao buscar casos disponíveis.");
  }

  const xp = agentRow.xp ?? 0;
  // Rank interno usado para regras de jogo
  const rank = determineAgentPositionByXp(xp);

  const isRestrictedPosition = rank === "trainee" || rank === "field_agent";

  // 2) Busca casos já existentes para o agente
  const [existingCases] = await pool.query(
    `
    SELECT 
       id,
       title,
       summary,
       status,
       difficulty,
       created_at
     FROM cases
     WHERE agent_id = ?
       AND status IN ('available', 'in_progress')
     ORDER BY created_at DESC
     `,
    [agentId]
  );

  // 3) Para posições iniciais (trainee / field_agent), o agente não escolhe:
  //    sempre há no máximo 1 caso designado pra ele.
  if (isRestrictedPosition) {
    if (existingCases.length > 0) {
      // Já existe um caso designado (available ou in_progress)
      return existingCases.slice(0, 1);
    }

    // Nenhum caso ainda: cria um caso novo e retorna apenas ele
    const createdCaseId = await createCaseForAgent(agentId, "easy");

    const [[assignedCase]] = await pool.query(
      `
      SELECT 
         id,
         title,
         summary,
         status,
         difficulty,
         created_at
       FROM cases
       WHERE id = ?
       `,
      [createdCaseId]
    );

    return assignedCase ? [assignedCase] : [];
  }

  // 4) Para posições a partir de senior_agent, o agente pode escolher entre casos.
  //    Se não houver nenhum, geramos alguns casos para oferecer variedade.
  if (existingCases.length > 0) {
    return existingCases;
  }

  const createdCaseIds = [];
  const targetCount = 3;

  for (let i = 0; i < targetCount; i++) {
    const createdId = await createCaseForAgent(agentId, "medium");
    createdCaseIds.push(createdId);
  }

  if (createdCaseIds.length === 0) {
    return [];
  }

  const [createdCases] = await pool.query(
    `
    SELECT 
       id,
       title,
       summary,
       status,
       difficulty,
       created_at
     FROM cases
     WHERE agent_id = ?
       AND status IN ('available', 'in_progress')
     ORDER BY created_at DESC
     `,
    [agentId]
  );

  return createdCases;
}

/**
 * Inicia (ou retoma) um caso para um agente:
 * - valida se o caso pertence ao agente
 * - cria/atualiza registro em case_progress
 */
export async function startCaseForAgent(caseId, agentId) {
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [caseRows] = await conn.query(
      "SELECT * FROM cases WHERE id = ? AND agent_id = ?",
      [caseId, agentId]
    );

    if (!caseRows || caseRows.length === 0) {
      throw new Error("Caso não encontrado para este agente.");
    }

    const caseData = caseRows[0];

    if (caseData.status === "available") {
      await conn.query("UPDATE cases SET status = 'in_progress' WHERE id = ?", [
        caseId,
      ]);
    }

    const [progressRows] = await conn.query(
      `
      SELECT id, current_step_order
      FROM case_progress
      WHERE case_id = ? AND agent_id = ?
      `,
      [caseId, agentId]
    );

    if (!progressRows || progressRows.length === 0) {
      await conn.query(
        `
        INSERT INTO case_progress (
          case_id,
          agent_id
        )
        VALUES (?, ?)
        `,
        [caseId, agentId]
      );
    }

    await conn.commit();

    return { caseId, status: "ok" };
  } catch (err) {
    await conn.rollback();
    console.error("Erro em startCaseForAgent:", err);
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Retorna o status detalhado de um caso para um agente:
 *  - dados básicos do case
 *  - step atual
 *  - progresso (current/total)
 *  - pistas (case_villain_clues)
 *  - lista de suspeitos (case_suspects)
 *  - regra de quando pode emitir mandado
 */
export async function getCaseInvestigationStatus(caseId, agentId) {
  const pool = getDbPool();

  // Parametrização básica da regra de evidência
  const MIN_STEPS_FOR_WARRANT = 3;
  const MIN_CLUES_FOR_WARRANT = 3;

  // 1) Carrega o caso para esse agente
  const [caseRows] = await pool.query(
    "SELECT * FROM cases WHERE id = ? AND agent_id = ?",
    [caseId, agentId]
  );

  if (!caseRows || caseRows.length === 0) {
    throw new Error("Caso não encontrado para este agente.");
  }

  const caseData = caseRows[0];

  // 2) Conta quantos steps esse caso possui
  const [[stepsCountRow]] = await pool.query(
    "SELECT COUNT(*) AS totalSteps FROM case_steps WHERE case_id = ?",
    [caseId]
  );

  const totalSteps = stepsCountRow.totalSteps || 0;

  // 3) Descobre qual é o step atual pelo case_progress
  let currentStepOrder = 1;

  const [progressRows] = await pool.query(
    "SELECT * FROM case_progress WHERE case_id = ? AND agent_id = ?",
    [caseId, agentId]
  );

  if (progressRows && progressRows.length > 0) {
    currentStepOrder = progressRows[0].current_step_order || 1;
  }

  if (totalSteps > 0 && currentStepOrder > totalSteps) {
    currentStepOrder = totalSteps;
  }

  // 4) Carrega o step atual, juntando com o local de destino (to_location_id)
  let currentStep = null;

  if (totalSteps > 0) {
    const [stepRows] = await pool.query(
      `
      SELECT cs.*,
            l.name AS location_name
     FROM case_steps cs
     LEFT JOIN locations l ON l.id = cs.to_location_id
     WHERE cs.case_id = ? AND cs.step_order = ?
     ORDER BY cs.step_order ASC
     `,
      [caseId, currentStepOrder]
    );

    currentStep = stepRows.length > 0 ? stepRows[0] : null;
  }

  // 5) Pistas do vilão já liberadas até o step atual
  const [clueRows] = await pool.query(
    `
    SELECT
       cvc.id,
       cvc.step_id,
       cs.step_order,
       cvc.attribute_name,
       cvc.attribute_value,
       cvc.created_at
     FROM case_villain_clues cvc
     LEFT JOIN case_steps cs ON cs.id = cvc.step_id
     WHERE cvc.case_id = ?
       AND (cs.step_order IS NULL OR cs.step_order <= ?)
     ORDER BY cvc.created_at ASC
     `,
    [caseId, currentStepOrder]
  );

  // 6) Lista de suspeitos (snapshot de vilões pra esse caso)
  const [suspectsRows] = await pool.query(
    `
    SELECT
       id,
       case_id,
       villain_template_id,
       is_guilty,
       name_snapshot,
       sex_snapshot,
       occupation_snapshot,
       hobby_snapshot,
       hair_color_snapshot,
       vehicle_snapshot,
       feature_snapshot,
       other_snapshot
     FROM case_suspects
     WHERE case_id = ?
     ORDER BY id ASC
     `,
    [caseId]
  );

  // --- cálculo de compatibilidade pistas x suspeitos ---
  const normalizedClues = (clueRows || []).map((c) => ({
    name: c.attribute_name,
    value:
      typeof c.attribute_value === "string"
        ? c.attribute_value.toLowerCase().trim()
        : String(c.attribute_value ?? "").toLowerCase().trim(),
  }));

  function computeMatchesForSuspect(suspect) {
    let score = 0;
    const matchedAttributes = [];

    for (const clue of normalizedClues) {
      let suspectValueRaw = null;

      switch (clue.name) {
        case "hair_color":
          suspectValueRaw = suspect.hair_color_snapshot;
          break;
        case "occupation":
          suspectValueRaw = suspect.occupation_snapshot;
          break;
        case "hobby":
          suspectValueRaw = suspect.hobby_snapshot;
          break;
        case "vehicle":
          suspectValueRaw = suspect.vehicle_snapshot;
          break;
        case "feature":
          suspectValueRaw = suspect.feature_snapshot;
          break;
        default:
          break;
      }

      if (!suspectValueRaw) continue;

      const suspectValue = String(suspectValueRaw).toLowerCase().trim();
      if (!suspectValue) continue;

      // match simples: contém ou é igual
      if (
        suspectValue === clue.value ||
        suspectValue.includes(clue.value) ||
        clue.value.includes(suspectValue)
      ) {
        score += 1;
        matchedAttributes.push(clue.name);
      }
    }

    return {
      score,
      matchedAttributes,
    };
  }

  const suspects = (suspectsRows || []).map((s) => {
    const { score, matchedAttributes } = computeMatchesForSuspect(s);
    return {
      ...s,
      matchScore: score,
      matchedAttributes,
    };
  });

  // ---- Regra reforçada de emissão de mandado ----
  const completedSteps =
    totalSteps === 0
      ? 0
      : Math.max(0, Math.min(currentStepOrder - 1, totalSteps));
  const cluesCount = clueRows.length;
  const reachedEnd = totalSteps > 0 && currentStepOrder >= totalSteps;
  const hasAnyClue = cluesCount > 0;

  // Regra:
  // - caminho "padrão": mínimo de passos + mínimo de pistas
  // - fallback: se chegou no fim do caso, libera mesmo que não tenha pistas (para não travar)
  const canIssueWarrant =
    caseData.status === "in_progress" &&
    totalSteps > 0 &&
    ((completedSteps >= MIN_STEPS_FOR_WARRANT &&
      cluesCount >= MIN_CLUES_FOR_WARRANT) ||
      reachedEnd);

  // 8) Monta o objeto de status pra API
  return {
    case: {
      id: caseData.id,
      title: caseData.title,
      summary: caseData.summary,
      status: caseData.status,
      difficulty: caseData.difficulty,
      created_at: caseData.created_at,
      closed_at: caseData.closed_at || null,
    },
    currentStep,
    progress: {
      current: totalSteps === 0 ? 0 : currentStepOrder,
      total: totalSteps,
      completedSteps,
      cluesCount,
      minStepsForWarrant: MIN_STEPS_FOR_WARRANT,
      minCluesForWarrant: MIN_CLUES_FOR_WARRANT,
      canIssueWarrant,
      reachedEnd,
      hasAnyClue,
    },
    clues: clueRows,
    suspects,
    canIssueWarrant,
  };
}

/**
 * Avança o passo da investigação:
 *  - verifica se o agente já visitou todos os locais do step (exceto steps de transição
 *    ou steps sem locais configurados)
 *  - se puder avançar, incrementa current_step_order em case_progress
 *  - incrementa turns_used
 *  - retorna novo status (currentStep + progress + clues + suspects)
 */
export async function advanceCaseStep(caseId, agentId) {
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[caseRow]] = await conn.query(
      "SELECT id, difficulty, max_turns FROM cases WHERE id = ? FOR UPDATE",
      [caseId]
    );

    if (!caseRow) {
      throw new Error("Caso não encontrado para advanceCaseStep.");
    }

    const [steps] = await conn.query(
      `
      SELECT id, step_order, step_type
      FROM case_steps
      WHERE case_id = ?
      ORDER BY step_order ASC
      `,
      [caseId]
    );

    const totalSteps = steps.length;

    const [[progressRow]] = await conn.query(
      `
      SELECT
        id,
        current_step_order,
        turns_used,
        wrong_travels,
        wrong_warrants
      FROM case_progress
      WHERE case_id = ?
        AND agent_id = ?
      FOR UPDATE
      `,
      [caseId, agentId]
    );

    if (!progressRow) {
      throw new Error("Progresso do caso não encontrado para advanceCaseStep.");
    }

    let currentStepOrder = progressRow.current_step_order || 1;
    let turnsUsed = progressRow.turns_used || 0;

    if (currentStepOrder < 1) currentStepOrder = 1;
    if (totalSteps > 0 && currentStepOrder > totalSteps) {
      currentStepOrder = totalSteps;
    }

    // Descobre o step atual e o tipo
    const currentStepInfo = steps.find(
      (s) => s.step_order === currentStepOrder
    );
    const currentStepType = currentStepInfo?.step_type || null;

    // Regra de bloqueio:
    // - se NÃO for step de transição
    // - e existir pelo menos 1 local configurado
    // - e o agente ainda não tiver visitado todos os locais
    // => não avança (nem gasta turno)
    let advanceBlocked = false;

    if (totalSteps > 0 && currentStepType !== "transition") {
      const [[totalLocationsRow]] = await conn.query(
        `
        SELECT COUNT(*) AS total
        FROM case_step_locations
        WHERE case_id = ?
          AND step_order = ?
        `,
        [caseId, currentStepOrder]
      );

      const totalLocations = totalLocationsRow?.total || 0;

      if (totalLocations > 0) {
        const [[visitedCountRow]] = await conn.query(
          `
          SELECT COUNT(DISTINCT location_id) AS visited
          FROM case_step_visits
          WHERE case_id = ?
            AND agent_id = ?
            AND step_order = ?
          `,
          [caseId, agentId, currentStepOrder]
        );

        const visitedCount = visitedCountRow?.visited || 0;

        if (visitedCount < totalLocations) {
          advanceBlocked = true;
        }
      }
    }

    if (advanceBlocked) {
      // Não altera progresso, não gasta turno – apenas retorna status atual
      await conn.commit();
      const status = await getCaseInvestigationStatus(caseId, agentId);
      return {
        ...status,
        reachedEnd: status.progress.current >= status.progress.total,
        advanceBlocked: true,
      };
    }

    // Se não bloqueou, pode avançar normalmente
    // Avança step (mas não passa do total)
    if (currentStepOrder < totalSteps) {
      currentStepOrder += 1;
    }

    turnsUsed += 1;

    await conn.query(
      `
      UPDATE case_progress
      SET current_step_order = ?, turns_used = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [currentStepOrder, turnsUsed, progressRow.id]
    );

    await conn.commit();

    const status = await getCaseInvestigationStatus(caseId, agentId);

    return {
      ...status,
      reachedEnd: status.progress.current >= status.progress.total,
      advanceBlocked: false,
    };
  } catch (err) {
    await conn.rollback();
    console.error("Erro em advanceCaseStep:", err);
    throw err;
  } finally {
    conn.release();
  }
}
