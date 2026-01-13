// src/api/games.ts
import { apiClient, requestWithMeta, resolveMediaUrl } from "./http";
import type { ApiResponse } from "./http";

export interface Topic {
  id: number;
  name: string;
}

export interface Game {
  id: number;
  title: string;
  slug?: string;
  type: string;
  thumbnail: string;
  topic: Topic | null;
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
  slug?: string;
  type: string;
  topic: Topic | null;
  thumbnail_image_url?: string;
  items?: GameItem[];
};

type GameListItemFromApi = {
  id: number;
  title: string;
  slug?: string;
  type: string;
  topic: Topic | null;
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

  // API 응답: { game: { id, title, type, thumbnail_image_url, topic, items } }
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
      topic: g.topic,
      thumbnail: g.thumbnail_image_url ? resolveMediaUrl(g.thumbnail_image_url) : "",
    })) ?? [];
  return games;
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
      topic: g.topic,
      thumbnail: g.thumbnail_image_url ? resolveMediaUrl(g.thumbnail_image_url) : "",
    })) ?? [];
  return games;
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
  topic: { id: number; name: string } | null;
  thumbnail_image_url: string;
  items: { id: number; name: string; file_name: string; sort_order: number; is_active: boolean }[];
  created_by: { id: number; name: string; email: string } | null;
};

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

export type AdminTopic = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

export async function fetchAdminTopics(): Promise<AdminTopic[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ topics: AdminTopic[] }>>("/games/admin/topics/")
  );
  return response.topics || [];
}

export async function updateAdminTopic(params: {
  topic_id: number;
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ id: number; name: string; is_active: boolean }> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<{ id: number; name: string; is_active: boolean }>>(
      "/games/admin/topics/update/",
      params
    )
  );
  return response;
}

export async function deleteAdminTopic(topicId: number): Promise<{ deleted: boolean }> {
  const response = await requestWithMeta(
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/games/admin/topics/${topicId}/delete/`
    )
  );
  return response;
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

export async function fetchWorldcupTopics(): Promise<Topic[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ topics: Topic[] }>>("/games/worldcup/topics/")
  );
  return response.topics || [];
}

export async function createWorldcupTopic(name: string): Promise<Topic> {
  const response = await requestWithMeta(
    apiClient.post<ApiResponse<Topic>>("/games/worldcup/topics/create/", { name })
  );
  return response;
}

export type WorldcupDraftPayload = {
  id?: number;
  title?: string;
  description?: string;
  parent_topic_id?: string;
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
