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
    city_id: string;
    city_name: string;
    country_name: string;
    geo_coordinates: { x: number; y: number };
    step_order: number;
    imageUrl?: string;
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
    if (data?.timeState) {
      timeState.value = data.timeState;
    }
    if (data?.gameOver) {
      lastGameOver.value = data.win ? "WIN" : "LOSE";
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
        if (data.currentTime || data.current_time) {
          timeState.value = {
            current_time: data.currentTime || data.current_time,
            deadline_time: data.deadlineTime || data.deadline_time,
            hours_per_day: 16,
            days_remaining: 7,
          };
        }
        return data;
      } else {
        activeCase.value = null;
      }
    } catch (e) {
      console.error("[GAME] Erro ao buscar caso ativo", e);
      activeCase.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Start New Case
  const startCase = async (difficulty: string) => {
    isProcessingCase.value = true;
    try {
      const data = await fetchApi("/cases", {
        method: "POST",
        body: JSON.stringify({ difficulty }),
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
      const res = await fetchApi<GenericGameResponse>(`/cases/${caseId}/travel`, {
        method: "POST",
        body: { cityId: Number(cityId) },
      });
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
      const data = await fetchApi<GenericGameResponse>(
        `/cases/${caseId}/investigate`,
        {
          method: "POST",
          body: { placeId },
        },
      );
      syncGameState(data);
      return data;
    } catch (e) {
      console.error("[GAME] Erro ao investigar", e);
      throw e;
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

  // 9. Get Dossier Notes
  const getDossierNotes = async (caseId: string) => {
    try {
      return await fetchApi(`/cases/${caseId}/dossier/`);
    } catch (e) {
      console.error(e);
      return null;
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
  const refreshTimeState = (newState: TimeState) => {
    if (newState) timeState.value = newState;
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
