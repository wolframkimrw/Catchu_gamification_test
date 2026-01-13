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
