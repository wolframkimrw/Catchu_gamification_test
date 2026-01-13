import { createGameSession } from "../api/gamesSession";

export const getGameSessionKey = (gameId: number) =>
  `game_session_${gameId}`;

export const getStoredGameSessionId = (gameId: number): number | null => {
  const stored = sessionStorage.getItem(getGameSessionKey(gameId));
  if (!stored) {
    return null;
  }
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : null;
};

export const storeGameSessionId = (gameId: number, sessionId: number) => {
  sessionStorage.setItem(getGameSessionKey(gameId), String(sessionId));
};

export const startGameSession = async (gameId: number, source: string) => {
  try {
    const session = await createGameSession({ game_id: gameId, source });
    if (session?.session_id) {
      storeGameSessionId(gameId, session.session_id);
      return session.session_id;
    }
  } catch {
    // 세션 로깅 실패는 진행을 막지 않음
  }
  return null;
};

export const ensureGameSession = async (gameId: number, source: string) => {
  const existing = getStoredGameSessionId(gameId);
  if (existing) {
    return existing;
  }
  return startGameSession(gameId, source);
};
