import { useCallback, useEffect, useRef, useState } from "react";
import { startGameSession } from "../utils/gameSession";

export function useGameSessionStart(gameId: number | null, source: string) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const pendingStartRef = useRef(false);

  const startSession = useCallback(async () => {
    if (!gameId) {
      pendingStartRef.current = true;
      return null;
    }
    pendingStartRef.current = false;
    const nextSessionId = await startGameSession(gameId, source);
    if (nextSessionId) {
      setSessionId(nextSessionId);
    }
    return nextSessionId;
  }, [gameId, source]);

  useEffect(() => {
    if (!gameId || !pendingStartRef.current) {
      return;
    }
    void startSession();
  }, [gameId, startSession]);

  return { sessionId, startSession };
}
