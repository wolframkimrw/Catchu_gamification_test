// src/api/games.ts
import { apiClient, requestWithMeta } from "./http";
import type { ApiResponse } from "./http";

export interface Topic {
  id: number;
  name: string;
}

export interface Game {
  id: number;
  title: string;
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
  type: string;
  topic: Topic | null;
  thumbnail_image_url?: string;
  items?: GameItem[];
};

type GameListItemFromApi = {
  id: number;
  title: string;
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
  const normalizedGame: Game & { items: GameItem[] } = {
    ...game,
    thumbnail: game.thumbnail_image_url || "",
    items: normalizedItems,
  };

  return {
    game: normalizedGame,
    items: normalizedItems,
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
      type: g.type,
      topic: g.topic,
      thumbnail: g.thumbnail_image_url || "",
    })) ?? [];
  return games;
}

// 명시적 재노출: TS 캐시 문제 시에도 찾을 수 있도록
export { fetchGamesList as fetchGamesListApi };
