// src/api/games.ts
import { apiClient, requestWithMeta, resolveMediaUrl } from "./http";
import type { ApiResponse } from "./http";

export interface Game {
  id: number;
  title: string;
  description?: string;
  slug?: string;
  type: string;
  thumbnail: string;
}

export interface GameItem {
  id: number;
  name: string;
  file_name: string;
  sort_order: number;
}

type GameDetailFromApi = {
  id: number;
  title: string;
  description?: string;
  slug?: string;
  type: string;
  thumbnail_image_url?: string;
  items?: GameItem[];
};

type GameListItemFromApi = {
  id: number;
  title: string;
  slug?: string;
  type: string;
  thumbnail_image_url?: string;
};

export interface GameDetailData {
  game: Game & { items: GameItem[] };
  items: GameItem[];
}

export async function fetchGameDetail(
  gameId: number
): Promise<GameDetailData> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ game: GameDetailFromApi }>>(
      `/games/${gameId}/`
    )
  );

  if (!response || !response.game) {
    throw new Error("게임 정보를 불러올 수 없습니다.");
  }

  // API 응답: { game: { id, title, type, thumbnail_image_url, items } }
  const game = response.game;
  const normalizedItems = Array.isArray(game.items) ? game.items : [];
  const resolvedItems = normalizedItems.map((item) => ({
    ...item,
    file_name: item.file_name ? resolveMediaUrl(item.file_name) : item.file_name,
  }));
  const normalizedGame: Game & { items: GameItem[] } = {
    ...game,
    thumbnail: game.thumbnail_image_url ? resolveMediaUrl(game.thumbnail_image_url) : "",
    items: resolvedItems,
  };

  return {
    game: normalizedGame,
    items: resolvedItems,
  };
}

export async function fetchGamesList(): Promise<Game[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ games: GameListItemFromApi[] }>>("/games/")
  );
  const games =
    (response.games || []).map((g) => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      type: g.type,
      thumbnail: g.thumbnail_image_url ? resolveMediaUrl(g.thumbnail_image_url) : "",
    })) ?? [];
  return games;
}

export async function fetchTodayPick(): Promise<Game[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ picks: GameListItemFromApi[] }>>("/games/today-pick/")
  );
  return (response.picks || []).map((pick) => ({
    id: pick.id,
    title: pick.title,
    slug: pick.slug,
    type: pick.type,
    thumbnail: pick.thumbnail_image_url
      ? resolveMediaUrl(pick.thumbnail_image_url)
      : "",
  }));
}

export async function fetchMyGames(): Promise<Game[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ games: GameListItemFromApi[] }>>("/games/mine/")
  );
  const games =
    (response.games || []).map((g) => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      type: g.type,
      thumbnail: g.thumbnail_image_url ? resolveMediaUrl(g.thumbnail_image_url) : "",
    })) ?? [];
  return games;
}

export type BannerLinkType = "GAME" | "URL";

export type BannerItem = {
  id: number;
  name: string;
  position: string;
  image_url: string;
  link_type: BannerLinkType;
  link_url: string;
  game: { id: number; title: string; type: string; slug?: string } | null;
};

type BannerItemFromApi = BannerItem;

export async function fetchBanners(position?: string): Promise<BannerItem[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ banners: BannerItemFromApi[] }>>("/games/banners/", {
      params: position ? { position } : undefined,
    })
  );
  return (response.banners || []).map((banner) => ({
    ...banner,
    image_url: banner.image_url ? resolveMediaUrl(banner.image_url) : "",
  }));
}

export type AdminBanner = {
  id: number;
  name: string;
  position: string;
  image_url: string;
  link_type: BannerLinkType;
  link_url: string;
  game: { id: number; title: string; type: string; slug?: string } | null;
  is_active: boolean;
  priority: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchAdminBanners(): Promise<AdminBanner[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ banners: AdminBanner[] }>>("/games/admin/banners/")
  );
  return (response.banners || []).map((banner) => ({
    ...banner,
    image_url: banner.image_url ? resolveMediaUrl(banner.image_url) : "",
  }));
}

export async function createAdminBanner(payload: FormData): Promise<AdminBanner> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ banner: AdminBanner }>>(
      "/games/admin/banners/",
      payload,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
  );
  return {
    ...response.banner,
    image_url: response.banner.image_url
      ? resolveMediaUrl(response.banner.image_url)
      : "",
  };
}

export async function updateAdminBanner(
  bannerId: number,
  payload: FormData
): Promise<AdminBanner> {
  const response = await requestWithMeta(
    apiClient.patch<ApiResponse<{ banner: AdminBanner }>>(
      `/games/admin/banners/${bannerId}/`,
      payload,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
  );
  return {
    ...response.banner,
    image_url: response.banner.image_url
      ? resolveMediaUrl(response.banner.image_url)
      : "",
  };
}

export async function deleteAdminBanner(
  bannerId: number
): Promise<{ deleted: boolean }> {
  return requestWithMeta(
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/games/admin/banners/${bannerId}/`
    )
  );
}

export type AdminGame = {
  id: number;
  title: string;
  type: string;
  status: string;
  visibility: string;
  thumbnail_image_url: string;
  created_at: string;
  created_by: { id: number; name: string; email: string } | null;
};

export async function fetchAdminTodayPick(): Promise<AdminGame[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ picks: AdminGame[] }>>("/games/admin/today-pick/")
  );
  return (response.picks || []).map((pick) => ({
    ...pick,
    thumbnail_image_url: pick.thumbnail_image_url
      ? resolveMediaUrl(pick.thumbnail_image_url)
      : "",
  }));
}

export async function setAdminTodayPick(
  gameId: number,
  isActive: boolean
): Promise<AdminGame[]> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ picks: AdminGame[] }>>("/games/admin/today-pick/", {
      game_id: gameId,
      is_active: isActive,
    })
  );
  return (response.picks || []).map((pick) => ({
    ...pick,
    thumbnail_image_url: pick.thumbnail_image_url
      ? resolveMediaUrl(pick.thumbnail_image_url)
      : "",
  }));
}

export async function fetchAdminGames(): Promise<AdminGame[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ games: AdminGame[] }>>("/games/admin/games/")
  );
  return (response.games || []).map((game) => ({
    ...game,
    thumbnail_image_url: game.thumbnail_image_url
      ? resolveMediaUrl(game.thumbnail_image_url)
      : "",
  }));
}

export async function updateAdminGame(params: {
  game_id: number;
  visibility?: string;
  status?: string;
  title?: string;
  description?: string;
}): Promise<{ game_id: number; visibility: string; status: string }> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ game_id: number; visibility: string; status: string }>>(
      "/games/admin/games/update/",
      params
    )
  );
  return response;
}

export async function deleteAdminGame(gameId: number): Promise<{ deleted: boolean }> {
  const response = await requestWithMeta(
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/games/admin/games/${gameId}/delete/`
    )
  );
  return response;
}

export type AdminGameDetail = {
  id: number;
  title: string;
  description: string;
  slug: string;
  type: string;
  status: string;
  visibility: string;
  thumbnail_image_url: string;
  items: { id: number; name: string; file_name: string; sort_order: number; is_active: boolean }[];
  created_by: { id: number; name: string; email: string } | null;
};

export type AdminEditRequest = {
  id: number;
  game: { id: number; title: string };
  user: { id: number; name: string; email: string };
  status: string;
  created_at: string;
  updated_at: string;
  payload: {
    title?: string;
    description?: string;
    thumbnail_url?: string;
    items?: { id?: number; name?: string; image_url?: string; sort_order?: number }[];
  };
};

export async function fetchAdminEditRequests(): Promise<AdminEditRequest[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ requests: AdminEditRequest[] }>>(
      "/games/admin/edit-requests/"
    )
  );
  return (response.requests || []).map((req) => ({
    ...req,
    payload: {
      ...req.payload,
      thumbnail_url: req.payload?.thumbnail_url
        ? resolveMediaUrl(req.payload.thumbnail_url)
        : req.payload?.thumbnail_url,
      items: req.payload?.items?.map((item) => ({
        ...item,
        image_url: item.image_url ? resolveMediaUrl(item.image_url) : item.image_url,
      })),
    },
  }));
}

export type AdminEditRequestDetail = {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  user: { id: number; name: string; email: string };
  game: {
    id: number;
    title: string;
    description: string;
    thumbnail_image_url: string;
    items: { id: number; name: string; file_name: string; sort_order: number }[];
  };
  payload: {
    title?: string;
    description?: string;
    thumbnail_url?: string;
    items?: { id?: number; name?: string; image_url?: string; sort_order?: number }[];
  };
};

export async function fetchAdminEditRequestDetail(
  requestId: number
): Promise<AdminEditRequestDetail> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ request: AdminEditRequestDetail }>>(
      `/games/admin/edit-requests/${requestId}/`
    )
  );
  const req = response.request;
  return {
    ...req,
    game: {
      ...req.game,
      thumbnail_image_url: req.game.thumbnail_image_url
        ? resolveMediaUrl(req.game.thumbnail_image_url)
        : "",
      items: req.game.items.map((item) => ({
        ...item,
        file_name: item.file_name ? resolveMediaUrl(item.file_name) : item.file_name,
      })),
    },
    payload: {
      ...req.payload,
      thumbnail_url: req.payload?.thumbnail_url
        ? resolveMediaUrl(req.payload.thumbnail_url)
        : req.payload?.thumbnail_url,
      items: req.payload?.items?.map((item) => ({
        ...item,
        image_url: item.image_url ? resolveMediaUrl(item.image_url) : item.image_url,
      })),
    },
  };
}

export async function approveAdminEditRequest(
  requestId: number
): Promise<{ request_id: number; status: string }> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ request_id: number; status: string }>>(
      "/games/admin/edit-requests/approve/",
      { request_id: requestId }
    )
  );
  return response;
}

export async function rejectAdminEditRequest(
  requestId: number
): Promise<{ request_id: number; status: string }> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ request_id: number; status: string }>>(
      "/games/admin/edit-requests/reject/",
      { request_id: requestId }
    )
  );
  return response;
}

export async function submitGameEditRequest(
  formData: FormData
): Promise<{ request_id: number; status: string }> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ request_id: number; status: string }>>(
      "/games/edit-requests/",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
  );
  return response;
}

export async function fetchAdminGameDetail(gameId: number): Promise<AdminGameDetail> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ game: AdminGameDetail }>>(`/games/admin/games/${gameId}/`)
  );
  const game = response.game;
  return {
    ...game,
    thumbnail_image_url: game.thumbnail_image_url ? resolveMediaUrl(game.thumbnail_image_url) : "",
    items: game.items.map((item) => ({
      ...item,
      file_name: item.file_name ? resolveMediaUrl(item.file_name) : item.file_name,
    })),
  };
}

export async function updateAdminGameItem(
  params:
    | { item_id: number; is_active?: boolean; name?: string }
    | FormData
): Promise<{ item_id: number; is_active: boolean; name?: string; file_name?: string }> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ item_id: number; is_active: boolean; name?: string; file_name?: string }>>(
      "/games/admin/games/items/update/",
      params
    )
  );
  return {
    ...response,
    file_name: response.file_name ? resolveMediaUrl(response.file_name) : response.file_name,
  };
}

export async function createAdminGameItem(formData: FormData): Promise<{
  item_id: number;
  file_name: string;
  sort_order: number;
}> {
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{ item_id: number; file_name: string; sort_order: number }>
    >("/games/admin/games/items/create/", formData)
  );
  return {
    ...response,
    file_name: response.file_name ? resolveMediaUrl(response.file_name) : response.file_name,
  };
}

export async function deleteAdminGameItem(itemId: number): Promise<{ deleted: boolean }> {
  const response = await requestWithMeta(
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/games/admin/games/items/${itemId}/delete/`
    )
  );
  return response;
}

export async function fetchAdminJsonFile(path: string): Promise<{
  path: string;
  content: Record<string, unknown>;
}> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ path: string; content: Record<string, unknown> }>>(
      "/games/admin/json/file/",
      { params: { path } }
    )
  );
  return response;
}

export async function saveAdminJsonFile(path: string, content: Record<string, unknown>) {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ path: string }>>("/games/admin/json/file/", {
      path,
      content,
    })
  );
  return response;
}

export async function fetchGameJsonFile(path: string): Promise<Record<string, unknown>> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ path: string; content: Record<string, unknown> }>>("/games/json/", {
      params: { path },
    })
  );
  return response.content || {};
}

export type AdminChoiceLog = {
  id: number;
  game: { id: number; title: string };
  user: { id: number; name: string; email: string } | null;
  source: string;
  ip_address: string;
  started_at: string;
};

export type AdminPickLog = {
  id: number;
  choice_id: number;
  game: { id: number; title: string };
  left_item: { id: number; name: string } | null;
  right_item: { id: number; name: string } | null;
  selected_item: { id: number; name: string } | null;
  step_index: number;
  created_at: string;
};

export type AdminResultLog = {
  id: number;
  choice_id: number;
  game: { id: number; title: string };
  winner_item: { id: number; name: string } | null;
  result_title: string;
  created_at: string;
};

export async function fetchAdminChoiceLogs(): Promise<AdminChoiceLog[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ logs: AdminChoiceLog[] }>>("/games/admin/logs/choices/")
  );
  return response.logs || [];
}

export async function fetchAdminPickLogs(): Promise<AdminPickLog[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ logs: AdminPickLog[] }>>("/games/admin/logs/picks/")
  );
  return response.logs || [];
}

export async function fetchAdminResultLogs(): Promise<AdminResultLog[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ results: AdminResultLog[] }>>("/games/admin/results/")
  );
  return response.results || [];
}

export async function createWorldcupGame(formData: FormData): Promise<{
  game_id: number;
  slug: string;
  thumbnail_image_url: string;
}> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ game_id: number; slug: string; thumbnail_image_url: string }>>(
      "/games/worldcup/create/",
      formData
    )
  );
  return response;
}

export type WorldcupDraftPayload = {
  id?: number;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  items?: { name?: string; image_url?: string }[];
};

export async function fetchWorldcupDraft(): Promise<WorldcupDraftPayload | null> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ draft: WorldcupDraftPayload | null }>>(
      "/games/worldcup/draft/"
    )
  );
  return response.draft || null;
}

export async function saveWorldcupDraft(formData: FormData): Promise<WorldcupDraftPayload> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ draft: WorldcupDraftPayload }>>(
      "/games/worldcup/draft/",
      formData
    )
  );
  return response.draft;
}

// 명시적 재노출: TS 캐시 문제 시에도 찾을 수 있도록
export { fetchGamesList as fetchGamesListApi };
