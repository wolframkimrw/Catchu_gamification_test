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
