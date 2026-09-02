// src/domain/dossier.rules.js
// Regras puras do dossiê / filtro de suspeitos — SEM acesso a banco.
// Fonte única da verdade sobre QUAIS atributos são anotáveis e como eles
// mapeiam para as colunas do Prisma.

/** Campos anotáveis no dossiê (chaves snake_case usadas na API). */
export const ATTR_FIELDS = ['sex_id', 'hair_id', 'hobby_id', 'vehicle_id', 'feature_id'];

/** snake_case (API / colunas legadas) → camelCase (Prisma Client). */
export const DOSSIER_FIELD_MAP = {
  sex_id: 'sexId',
  hair_id: 'hairId',
  hobby_id: 'hobbyId',
  vehicle_id: 'vehicleId',
  feature_id: 'featureId',
};

/**
 * Normaliza as notas do dossiê: mantém apenas os campos anotáveis com um id
 * numérico válido (> 0), descartando `null` / `undefined` / vazio / 0.
 * @param {Record<string, unknown>} notes
 * @returns {Record<string, number>}
 */
export function normalizeNotes(notes) {
  const out = {};
  if (!notes || typeof notes !== 'object') return out;
  for (const field of ATTR_FIELDS) {
    const raw = notes[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) out[field] = n;
  }
  return out;
}

/**
 * Constrói o objeto `where` do Prisma (parcial) a partir das notas do dossiê.
 * @param {Record<string, unknown>} notes
 * @returns {Record<string, number>}  ex.: { hairId: 2, vehicleId: 5 }
 */
export function notesToPrismaWhere(notes) {
  const norm = normalizeNotes(notes);
  const where = {};
  for (const [field, value] of Object.entries(norm)) {
    where[DOSSIER_FIELD_MAP[field]] = value;
  }
  return where;
}

/**
 * Um suspeito casa com as notas do dossiê? Espera um suspeito com campos
 * `*_id` (id, sex_id, hair_id, hobby_id, vehicle_id, feature_id).
 */
export function suspectMatchesNotes(suspect, notes) {
  if (!suspect) return false;
  const norm = normalizeNotes(notes);
  return Object.entries(norm).every(([field, value]) => Number(suspect[field]) === value);
}

/**
 * Aplica as notas do dossiê à pool de suspeitos.
 */
export function filterSuspectsByNotes(suspects, notes) {
  return (suspects || []).filter((s) => suspectMatchesNotes(s, notes));
}

/**
 * Avalia se o dossiê já identifica um único vilão.
 * @returns {{ narrowed: object[], unique: boolean, suspect: object|null, remaining: number }}
 */
export function identifyVillain(suspects, notes) {
  const narrowed = filterSuspectsByNotes(suspects, notes);
  return {
    narrowed,
    unique: narrowed.length === 1,
    suspect: narrowed.length === 1 ? narrowed[0] : null,
    remaining: narrowed.length,
  };
}
