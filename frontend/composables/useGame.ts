import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
// useCookie is auto-imported in Nuxt 3

/* =========================
 *  TYPES
 * ========================= */
type RankInfo = {
  label: string;
  min_xp: number;
  max_xp: number | null;
};

type Profile = {
  id: string;
  detective_name: string;
  xp: number;
  reputation: number;
  rank: RankInfo;
  total_cases: number;
  solved_cases: number;
  failed_cases: number;
};

type TimeState = {
  current_time: string; // ISO Date
  deadline_time: string; // ISO Date
  hours_per_day: number;
  days_remaining: number;
};

type TravelOption = {
  city_id: string;
  city_name: string;
  country_name: string;
  travel_time_hours: number;
  cost: number;
};

type GenericGameResponse = {
  ok: boolean;
  message?: string;
  text?: string; // Dialogue text
  timeState?: TimeState;
  gameOver?: boolean;
  [key: string]: any;
};

type Suspect = {
  id: number;
  name: string;
  sex: string;
  hair: string;
  hobby: string;
  feature: string;
  vehicle: string;
  imageUrl?: string;
};

type VisitCurrentCityResponse = {
  city: {
    city_id: number;
    city_name: string;
    country_name: string;
    lat: number;
    lon: number;
    step_order: number;
    description_prompt?: string;
    image_url?: string;
  };
  travelOptions?: TravelOption[];
  timeState?: TimeState;
  places: any[];
  cluesRevealed: number;
};

type City = {
  id: string;
  name: string;
  country: string;
  geo: { lat: number; lon: number };
  map: { x: number | null; y: number | null };
  hasRoutes: boolean;
  routesCount: number;
  imageUrl?: string;
};

type RoutesResponse = {
  route: Array<{
    clues_generated_json?: {
      options: number[];
    };
  }>;
};

/* =========================
 *  HELPERS (contract adapters)
 * ========================= */
// Janela desperta usada pelo relógio do backend (08:00–23:00 => 15h/dia)
const AWAKE_HOURS_PER_DAY = 15;

/**
 * Normaliza o `timeState` vindo do backend (`{ start_time, deadline_time,
 * current_time, daysEarly }`) para o formato consumido pelo GameClock,
 * derivando `days_remaining` / `hours_per_day` quando ausentes.
 */
function normalizeTimeState(ts: any): TimeState | null {
  if (!ts) return null;
  const current_time = ts.current_time ?? ts.currentTime ?? null;
  const deadline_time = ts.deadline_time ?? ts.deadlineTime ?? null;

  let days_remaining = ts.days_remaining;
  if (days_remaining == null && current_time && deadline_time) {
    const diffMs = new Date(deadline_time).getTime() - new Date(current_time).getTime();
    days_remaining = Number.isFinite(diffMs) ? Math.max(0, Math.ceil(diffMs / 86_400_000)) : 0;
  }

  return {
    current_time,
    deadline_time,
    hours_per_day: ts.hours_per_day ?? AWAKE_HOURS_PER_DAY,
    days_remaining: days_remaining ?? 0,
  };
}

/**
 * Achata respostas de gameplay. O controller de investigação/finalização
 * devolve `{ ok, text: { text, gameOver, solved, timeState, xpEarned, repDelta } }`
 * (duplo embrulho) nos desfechos, e `{ ok, text: "<diálogo>" }` nas pistas comuns.
 * Aqui devolvemos sempre `{ ...campos, text: string }`.
 */
function unwrapGameResponse(raw: any): GenericGameResponse {
  if (!raw || typeof raw !== "object") return { ok: false, text: String(raw ?? "") };

  const inner =
    raw.text && typeof raw.text === "object" && !Array.isArray(raw.text) ? raw.text : null;

  const flat: any = inner ? { ...raw, ...inner } : { ...raw };

  if (inner && typeof inner.text === "string") flat.text = inner.text;
  else if (typeof raw.text === "string") flat.text = raw.text;
  else flat.text = typeof flat.text === "string" ? flat.text : "";

  return flat as GenericGameResponse;
}

/* =========================
 *  STATE (Global)
 * ========================= */
const profile = ref<Profile | null>(null);
const activeCase = ref<any>(null); // NEW: Explicit activeCase ref
const cases = ref<any[]>([]);
const timeState = ref<TimeState | null>(null);
const isLoading = ref(false);
const isProcessingCase = ref(false);
const currentCity = ref<any>(null);
const availableRoutes = ref<any[]>([]);
const lastGameOver = ref<string | null>(null); // "WIN" or "LOSE"

export function useGame() {
  const fetchApi = useApi(); // CORRECTED: useApi returns the fetch function directly

  /* =========================
   *  HELPER: SYNC TIME
   * ========================= */
  const syncGameState = (data: any) => {
    const ts = normalizeTimeState(data?.timeState);
    if (ts) timeState.value = ts;

    const isOver = data?.gameOver ?? data?.text?.gameOver ?? false;
    if (isOver) {
      const solved = data?.solved ?? data?.text?.solved ?? data?.win ?? false;
      lastGameOver.value = solved ? "WIN" : "LOSE";
    }
  };

  /* =========================
   *  ACTIONS
   * ========================= */

  // 1. Fetch User Profile
  const fetchProfile = async () => {
    isLoading.value = true;
    try {
      const data = await fetchApi("/profiles/me");
      if (data) {
        profile.value = data;
      }
    } catch (e) {
      console.error("[GAME] Erro ao buscar perfil", e);
    } finally {
      isLoading.value = false;
    }
  };

  // 2. Fetch Active Case (if any)
  const fetchActiveCase = async () => {
    isLoading.value = true;
    try {
      const data = await fetchApi("/cases/active");

      if (data && data?.case?.id) {
        activeCase.value = data;
        // Mantém `cases` como fonte única para app.vue / dossier.vue / briefing.vue
        cases.value = [data.case];

        const ts = normalizeTimeState(data.timeState);
        if (ts) timeState.value = ts;

        return data;
      } else {
        activeCase.value = null;
        cases.value = [];
        timeState.value = null;
        lastGameOver.value = null;
      }
    } catch (e) {
      console.error("[GAME] Erro ao buscar caso ativo", e);
      activeCase.value = null;
      cases.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Start New Case
  const startCase = async (difficulty: string) => {
    isProcessingCase.value = true;
    lastGameOver.value = null; // limpa desfecho de um caso anterior
    try {
      const data = await fetchApi("/cases", {
        method: "POST",
        body: { difficulty },
      });
      if (data && data?.case?.id) {
        activeCase.value = data;
        await fetchActiveCase();
        return data;
      }
    } catch (e) {
      console.error("[GAME] Erro ao iniciar caso", e);
      throw e;
    } finally {
      isProcessingCase.value = false;
    }
  };

  // 4. Visit Current City (Get Hub)
  const visitCurrentCity = async (caseId: string) => {
    isLoading.value = true;
    try {
      const data = await fetchApi(`/cases/${caseId}/visit-current`);
      console.log(`visitCurrentCity for caseId: ${caseId}`);
      console.log("visitCurrentCity data:", data);
      if (data) {
        currentCity.value = data.city;
        syncGameState(data);
        return data;
      }
    } catch (e) {
      console.error("[GAME] Erro ao visitar cidade", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  // 5. Travel to New City
  const travelToCity = async (caseId: string, cityId: string | number) => {
    isProcessingCase.value = true;
    try {
      const raw = await fetchApi(`/cases/${caseId}/travel`, {
        method: "POST",
        body: { cityId: Number(cityId) },
      });
      const res = unwrapGameResponse(raw);
      syncGameState(res);
      return res;
    } catch (e) {
      throw e;
    } finally {
      isProcessingCase.value = false;
    }
  };

  // 6. Investigate Place
  const investigatePlace = async (caseId: string, placeId: string) => {
    try {
      const raw = await fetchApi(
        `/cases/${caseId}/investigate`,
        {
          method: "POST",
          body: { placeId },
        },
      );
      const data = unwrapGameResponse(raw);
      syncGameState(data);
      return data;
    } catch (e) {
      console.error("[GAME] Erro ao investigar", e);
      throw e;
    }
  };

  // 7a. Opções de atributo da pool de suspeitos deste caso (dirige os selects do dossiê)
  const fetchCaseAttributes = async (caseId: string) => {
    try {
      const res = await fetchApi<{ ok: boolean; attributes: Record<string, Array<{ id: number; label: string }>> }>(
        `/cases/${caseId}/suspects/attributes`,
      );
      return res?.attributes ?? {};
    } catch (e) {
      console.error("[GAME] Erro ao carregar atributos do caso", e);
      return {};
    }
  };

  // 7. Filter Suspects (Dossier)
  const filterSuspects = async (caseId: string, criteria: Partial<Suspect>) => {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });

    const res = await fetchApi<{ ok: boolean; suspects: Suspect[] }>(
      `/cases/${caseId}/suspects?${params.toString()}`,
    );
    return res.suspects || [];
  };

  // 8. Issue Warrant
  const issueWarrant = async (caseId: string, suspectId: number) => {
    try {
      const res = await fetchApi<GenericGameResponse>(
        `/cases/${caseId}/warrant`,
        {
          method: "POST",
          body: { suspectId },
        },
      );
      syncGameState(res);
      return res;
    } catch (e) {
      throw e;
    }
  };

  // 9. Get Dossier Notes → devolve apenas o objeto de características anotadas
  const getDossierNotes = async (caseId: string) => {
    try {
      const res = await fetchApi<{ ok: boolean; notes: any }>(
        `/cases/${caseId}/dossier`,
      );
      return res?.notes ?? {};
    } catch (e) {
      console.error("[GAME] Erro ao carregar notas do dossiê", e);
      return {};
    }
  };

  // 10. Save Dossier Notes
  const saveDossierNotes = async (caseId: string, notes: any) => {
    try {
      const res = await fetchApi<{ ok: boolean; notes: any }>(
        `/cases/${caseId}/dossier`,
        {
          method: "PUT",
          body: notes,
        },
      );
      return res.notes || {};
    } catch (e) {
      console.error("[GAME] Erro ao salvar notas do dossiê", e);
      return null;
    }
  };

  // 11. Fetch Available Routes (for Map)
  const fetchRoutes = async (caseId: string, stepOrder: number) => {
    try {
      const res = await fetchApi<RoutesResponse>(`/routes/${caseId}`);

      if (!res?.route || !res.route[stepOrder - 1]) {
        availableRoutes.value = [];
        return [];
      }

      const options: number[] =
        res.route[stepOrder - 1]?.clues_generated_json?.options ?? [];
      console.log("[GAME] Rotas disponíveis (IDs):", options);

      if (!options.length) {
        availableRoutes.value = [];
        return [];
      }

      const cities = await Promise.all(
        options.map(async (cityId) => {
          try {
            const cityRes = await fetchApi<{ ok: boolean; city: any }>(
              `/city/${cityId}`,
            );

            if (!cityRes?.city) return null;

            const c = cityRes.city;
            return {
              id: c.id,
              name: c.city || c.name || c.city_name,
              country: String(c.country || c.country_name || c.county || ""),
              countryCode: null,
              geo: {
                lat: Number(c.lat ?? c.latitude ?? c.geo_coordinates?.y ?? 0),
                lon: Number(
                  c.lng ?? c.lon ?? c.longitude ?? c.geo_coordinates?.x ?? 0,
                ),
              },
              map: { x: null, y: null },
              hasRoutes: true,
              routesCount: options.length,
              imageUrl: c.imageUrl,
            } as City;
          } catch (err) {
            console.error(
              `[GAME] Falha ao carregar detalhes da cidade ${cityId}`,
              err,
            );
            return null;
          }
        }),
      );

      availableRoutes.value = cities.filter(Boolean) as City[];
      return availableRoutes.value;
    } catch (e) {
      console.error("[GAME] Erro ao buscar rotas", e);
      return [];
    }
  };
  const refreshTimeState = (newState: any) => {
    const ts = normalizeTimeState(newState);
    if (ts) timeState.value = ts;
  };

  return {
    profile,
    activeCase,
    cases,
    timeState,
    isLoading,
    isProcessingCase,
    currentCity,
    availableRoutes,
    lastGameOver,

    fetchProfile,
    fetchActiveCase,
    startCase,
    visitCurrentCity,
    travelToCity,
    investigatePlace,
    filterSuspects,
    fetchCaseAttributes,
    fetchRoutes,
    issueWarrant,
    getDossierNotes,
    saveDossierNotes,
    refreshTimeState,
    createProfile: async (name: string) => {
      return await fetchApi("/profiles", {
        method: "POST",
        body: { detective_name: name },
      });
    },
    fetchAvailableCases: fetchActiveCase,
  };
}
