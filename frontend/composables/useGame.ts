import { ref } from "vue";
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
  gameOver?: boolean;
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

type City = {
  id: string | number;
  name: string;
  country: string;
  countryCode: string | null;
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

type ProfileListResponse = {
  profiles: Array<{
    id: string;
    detective_name: string;
  }>;
};

type ProfileSummaryResponse = {
  summary: {
    profile: {
      id: string;
      detective_name: string;
      xp: number | string;
      rank_id: number | string;
      reputation_score: number | string;
      cases_solved: number | string;
      cases_failed: number | string;
    };
    aggregates?: {
      cases_total: number | string;
    };
  };
};

/* =========================
 *  RANKS (MAPA LOCAL)
 * ========================= */
const RANKS: Record<number, RankInfo> = {
  1: { label: "RECRUTA", min_xp: 0, max_xp: 999 },
  2: { label: "AGENTE DE CAMPO", min_xp: 1000, max_xp: 4999 },
  3: { label: "AGENTE SÊNIOR", min_xp: 5000, max_xp: 19999 },
  4: { label: "ELITE", min_xp: 20000, max_xp: 39999 },
  5: { label: "LENDÁRIO", min_xp: 40000, max_xp: null },
};

/* =========================
 *  STATE
 * ========================= */
const profile = ref<Profile | null>(null);
const cases = ref<any[]>([]);
const timeState = ref<TimeState | null>(null);
const isLoading = ref(false);
const isProcessingCase = ref(false);
const currentCity = ref<any>(null);
const availableRoutes = ref<any[]>([]);
const lastGameOver = ref<string | null>(null); // "WIN" or "LOSE"

export function useGame() {
  const api = useApi();

  /* =========================
   *  HELPER: SYNC TIME
   * ========================= */
  const syncGameState = (data: any) => {
    if (data?.timeState) {
      timeState.value = data.timeState;
    }
    if (data?.gameOver) {
       // Check if it's a win or loss if provided, otherwise generic
       lastGameOver.value = data.win ? "WIN" : "LOSE";
    }
  };

  /* =========================
   *  HELPER: PARSE CLUE JSON
   * ========================= */
  // Extracts clean text and syncs hidden state from JSON-encoded clues
  const processClueResponse = (response: GenericGameResponse) => {
    let cleanText = response.text || "";
    let extractedTimeState = null;

    // Check if text looks like JSON
    if (typeof cleanText === 'string' && cleanText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanText);
        
        // Extract Text
        if (parsed.TEXT || parsed.text) {
          cleanText = parsed.TEXT || parsed.text;
        }

        // Extract TimeState if embedded
        if (parsed.TIMESTATE || parsed.timeState) {
          extractedTimeState = parsed.TIMESTATE || parsed.timeState;
        }
      } catch (e) {
        console.warn("[GAME] Failed to parse JSON clue text", e);
      }
    }

    // Sync TimeState (Prioritize top-level, then extracted)
    if (response.timeState) {
      syncGameState(response);
    } else if (extractedTimeState) {
      syncGameState({ ...response, timeState: extractedTimeState });
    } else {
        syncGameState(response); // Standard sync
    }

    return {
      ...response,
      text: cleanText // Return clean text for display
    };
  };

  /* =========================
   *  PROFILE
   * ========================= */
 const fetchProfile = async () => {
    isLoading.value = true;
    try {
      const list = await api<ProfileListResponse>("/profiles");

      if (!list?.profiles?.length) {
        profile.value = null;
        return;
      }

      const profileData = list.profiles[0];
      if (!profileData) {
        profile.value = null;
        return;
      }

      const profileId = profileData.id;
      const summaryRes = await api<ProfileSummaryResponse>(
        `/profiles/${profileId}/summary`,
      );

      if (!summaryRes?.summary?.profile) {
        profile.value = null;
        return;
      }

      const s = summaryRes.summary;
      const rankId: number = Number(s.profile.rank_id);
      const rank: RankInfo = RANKS[rankId] ?? RANKS[1]!;

      profile.value = {
        id: s.profile.id,
        detective_name: s.profile.detective_name,
        xp: Number(s.profile.xp) || 0,
        reputation: Number(s.profile.reputation_score) || 0,
        rank,
        total_cases: Number(s.aggregates?.cases_total) || 0,
        solved_cases: Number(s.profile.cases_solved) || 0,
        failed_cases: Number(s.profile.cases_failed) || 0,
      };
    } catch (e) {
      console.error("[GAME] Erro ao carregar perfil", e);
      profile.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  /* =========================
   *  ACTIVE CASE
   * ========================= */
  const fetchActiveCase = async () => {
    // @ts-ignore
    const token = useCookie("auth_token");
    if (!token.value) return;

    isLoading.value = true;
    try {
      const res = await api<any>("/cases/active");
      if (res?.case) {
        cases.value = [res.case];
      } else {
        cases.value = [];
      }
    } catch (e: any) {
      if (e?.response?.status === 404) cases.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const startCase = async (difficulty: "EASY" | "HARD" | "EXTREME") => {
    isProcessingCase.value = true;
    try {
      const res = await api<any>("/cases", {
        method: "POST",
        body: { difficulty },
      });
      return res?.case || null;
    } catch (e) {
      console.error("[GAME] Error starting case", e);
      return null;
    } finally {
      isProcessingCase.value = false;
    }
  };

  /* =========================
   *  GAMEPLAY ACTIONS
   * ========================= */
  const visitCurrentCity = async (caseId: string) => {
    isProcessingCase.value = true;
    try {
      const res = await api<VisitCurrentCityResponse>(`/cases/${caseId}/visit-current`);
      
      syncGameState(res);

      console.log("[GAME] Visited city data:", res);

      if (res?.city) {
        currentCity.value = {
          id: res.city.city_id,
          name: res.city.city_name,
          country: res.city.country_name,
          lat: res.city.geo_coordinates?.y,
          lon: res.city.geo_coordinates?.x,
          step: res.city.step_order,
          imageUrl: res.city.image_url,
          description: res.city.description_prompt,
        };
      }

      if (res?.travelOptions) {
        availableRoutes.value = res.travelOptions.map((opt: any) => ({
          id: opt.city_id,
          name: opt.city_name,
          country: opt.country_name,
          travelTime: opt.travel_time_hours,
          geo: { lat: 0, lon: 0 }, 
          hasRoutes: true,
        }));
      }

      return res;
    } catch (e) {
      console.error("[GAME] Error visiting city", e);
      throw e;
    } finally {
      isProcessingCase.value = false;
    }
  };

  const travelToCity = async (caseId: string, cityId: string | number) => {
    isProcessingCase.value = true;
    try {
      const res = await api<GenericGameResponse>(`/cases/${caseId}/travel`, {
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

  const investigatePlace = async (caseId: string, placeId: string) => {
    try {
      const res = await api<GenericGameResponse>(`/cases/${caseId}/investigate`, {
        method: "POST",
        body: { placeId },
      });
      
      // PROCESS RESPONSE HERE to handle JSON text and hidden timeState
      const processedRes = processClueResponse(res);
      
      return processedRes;
    } catch (e) {
      throw e;
    }
  };

  /* =========================
   *  WARRANT & SUSPECTS
   * ========================= */
  const filterSuspects = async (caseId: string, criteria: Partial<Suspect>) => {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    
    const res = await api<{ok: boolean, suspects: Suspect[]}>(`/cases/${caseId}/suspects?${params.toString()}`);
    return res.suspects || []; 
  };

  const issueWarrant = async (caseId: string, suspectId: number) => {
    try {
      const res = await api<GenericGameResponse>(`/cases/${caseId}/warrant`, {
        method: "POST",
        body: { suspectId },
      });
      syncGameState(res);
      return res;
    } catch (e) {
      throw e;
    }
  };

  const fetchRoutes = async (caseId: string, stepOrder: number) => {
    try {
      const res = await api<RoutesResponse>(`/routes/${caseId}`);

      if (!res?.route || !res.route[stepOrder - 1]) {
         availableRoutes.value = [];
         return [];
      }

      const options: number[] = res.route[stepOrder - 1]?.clues_generated_json?.options ?? [];
      console.log("[GAME] Rotas disponíveis (IDs):", options);

      if (!options.length) {
        availableRoutes.value = [];
        return [];
      }

      const cities = await Promise.all(
        options.map(async (cityId) => {
          try {
            const cityRes = await api<{ ok: boolean; city: any }>(
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
                lon: Number(c.lng ?? c.lon ?? c.longitude ?? c.geo_coordinates?.x ?? 0),
              },
              map: { x: null, y: null },
              hasRoutes: true,
              routesCount: options.length,
              imageUrl: c.imageUrl,
            } as City;
          } catch (err) {
            console.error(`[GAME] Falha ao carregar detalhes da cidade ${cityId}`, err);
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

  return {
    profile,
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
    createProfile: async (name: string) => {
        const api = useApi();
        return await api("/profiles", { method: "POST", body: { detective_name: name } });
    },
    fetchAvailableCases: fetchActiveCase,
  };
}
