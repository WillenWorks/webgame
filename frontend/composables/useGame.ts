import { ref } from "vue";
import { useApi } from "@/composables/useApi";
import { useCookie } from "#app";

/* =========================
 *  TIPOS
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

type ProfileListResponse = {
  profiles: Array<{ id: string }>;
};

type ProfileSummaryResponse = {
  summary: {
    profile: {
      id: string;
      detective_name: string;
      rank_id: number;
      xp: number;
      reputation_score: number;
      cases_solved: number;
      cases_failed: number;
    };
    aggregates: {
      cases_total: number;
    };
  };
};

type ActiveCaseResponse = {
  case: any;
};

type VisitCurrentCityResponse = {
  city: {
    city_id: string;
    city_name: string;
    country_name: string;
    geo_coordinates: {
      x: number;
      y: number;
    };
    step_order: number;
  };
};

type City = {
  id: string;
  name: string;
  country: string;
  countryCode: string | null;
  geo: {
    lat: number;
    lon: number;
  };
  map: {
    x: number | null;
    y: number | null;
  };
  hasRoutes: boolean;
  routesCount: number;
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
const isLoading = ref(false);
const isProcessingCase = ref(false);
const currentCity = ref<any>(null);

export function useGame() {
  const api = useApi();

  /* =========================
   *  PERFIL
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
   *  CASO ATIVO
   * ========================= */
  const fetchActiveCase = async () => {
    const token = useCookie("auth_token");
    if (!token.value) return;

    isLoading.value = true;
    try {
      const res = await api<ActiveCaseResponse>("/cases/active");

      if (res?.case) {
        cases.value = [res.case];
      } else {
        cases.value = [];
      }
    } catch (e: any) {
      // 404 = nenhum caso ativo (estado normal)
      if (e?.response?.status === 404) {
        cases.value = [];
      } else {
        console.error("[GAME] Erro ao buscar caso ativo", e);
      }
    } finally {
      isLoading.value = false;
    }
  };

  /* =========================
   *  CRIAR NOVO CASO
   * ========================= */
  const startCase = async (difficulty: "EASY" | "HARD" | "EXTREME") => {
    isProcessingCase.value = true;
    try {
      const res = await api<ActiveCaseResponse>("/cases", {
        method: "POST",
        body: { difficulty },
      });

      return res?.case || null;
    } catch (e) {
      console.error("[GAME] Erro ao criar caso", e);
      return null;
    } finally {
      isProcessingCase.value = false;
    }
  };

  /* =========================
   *  VISITAR CIDADE ATUAL
   *  (AÇÃO CENTRAL DO JOGO)
   * ========================= */
  const visitCurrentCity = async (caseId: string) => {
    isProcessingCase.value = true;
    try {
      const res = await api<VisitCurrentCityResponse>(`/cases/${caseId}/visit-current`, {
        method: "GET",
      });

      /*
        Esperado do backend:
        - pistas
        - destinos possíveis
        - estado atualizado do caso
      */

      console.log(res);

      if (res?.city?.geo_coordinates) {
        currentCity.value = {
          id: res.city.city_id,
          name: res.city.city_name,
          country: res.city.country_name,
          lat: res.city.geo_coordinates.y,
          lon: res.city.geo_coordinates.x,
          step: res.city.step_order,
        };
      } else {
        currentCity.value = null;
      }

      return res;
    } catch (e) {
      console.error("[GAME] Erro ao visitar cidade", e);
      throw e;
    } finally {
      isProcessingCase.value = false;
    }
  };

  function normalizeCityPayload(raw: any): City {
    const lat = Number(raw.lat ?? raw.latitude);
    const lon = Number(raw.lon ?? raw.longitude);

    return {
      id: raw.id ?? `${raw.name}-${raw.country}`,
      name: raw.name ?? raw.city,
      country: raw.country,
      countryCode: raw.country_code ?? null,

      geo: {
        lat,
        lon,
      },

      map: {
        x: null,
        y: null,
      },

      hasRoutes: Array.isArray(raw.routes) && raw.routes.length > 0,
      routesCount: raw.routes?.length ?? 0,
    };
  }

  return {
    // state
    profile,
    cases,
    isLoading,
    isProcessingCase,
    currentCity,

    // actions
    fetchProfile,
    fetchActiveCase,
    startCase,
    visitCurrentCity,
  };
}
