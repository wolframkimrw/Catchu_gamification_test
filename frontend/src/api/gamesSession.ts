import { apiClient, requestWithMeta } from "./http";
import type { ApiResponse } from "./http";

export async function createGameSession(params: {
  game_id: number;
  source?: string;
}) {
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        session_id: number;
      }>
    >("/games/session/", params)
  );
  return response;
}

export async function createWorldcupPickLog(params: {
  choice_id: number;
  game_id: number;
  left_item_id?: number | null;
  right_item_id?: number | null;
  selected_item_id?: number | null;
  step_index: number;
}) {
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        pick_id: number;
      }>
    >("/games/worldcup/pick/", params)
  );
  return response;
}

export async function createGameResult(params: {
  choice_id: number;
  game_id: number;
  winner_item_id?: number | null;
  result_title: string;
  result_code?: string;
  result_image_url?: string;
  share_url?: string;
  result_payload?: Record<string, unknown> | null;
}) {
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        result_id: number;
      }>
    >("/games/result/", params)
  );
  return response;
}

export type GameResultDetail = {
  id: number;
  choice_id: number;
  game: { id: number; title: string };
  winner_item: { id: number; name: string; file_name: string } | null;
  result_title: string;
  result_code: string;
  result_image_url: string;
  share_url: string;
  result_payload: Record<string, unknown> | null;
  created_at: string;
};

export async function fetchGameResult(choiceId: number) {
  const response = await requestWithMeta(
    apiClient.get<
      ApiResponse<{
        result: GameResultDetail | null;
      }>
    >("/games/result/detail/", { params: { choice_id: choiceId } })
  );
  return response;
}

export type WorldcupPickSummary = {
  choice_id: number;
  game: { id: number; title: string };
  total_items: number;
  round: number;
  champion: {
    id: number;
    name: string;
    file_name: string;
    sort_order: number;
    wins: number;
  } | null;
  ranking: {
    id: number;
    name: string;
    file_name: string;
    sort_order: number;
    wins: number;
  }[];
};

export async function fetchWorldcupPickSummary(gameId: number, choiceId?: number) {
  const response = await requestWithMeta(
    apiClient.get<
      ApiResponse<{
        summary: WorldcupPickSummary | null;
      }>
    >("/games/worldcup/pick/summary/", {
      params: { game_id: gameId, choice_id: choiceId },
    })
  );
  return response;
}
