// src/pages/WorldcupArenaPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./worldcup.css";
import { ApiError } from "../../api/http";
import { fetchGameDetail } from "../../api/games";
import { createGameResult, createWorldcupPickLog } from "../../api/gamesSession";
import { getStoredGameSessionId, startGameSession } from "../../utils/gameSession";
import type { GameDetailData, GameItem } from "../../api/games";
import placeholderImage from "../../assets/worldcup-placeholder.svg";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: GameDetailData };

type WorldcupResultPayload = {
  gameId: number;
  gameTitle: string;
  round: number;
  totalItems: number;
  champion: {
    id: number;
    name: string;
    file_name: string;
    sort_order: number;
  };
  ranking: {
    id: number;
    name: string;
    file_name: string;
    sort_order: number;
    wins: number;
  }[];
};

export function WorldcupArenaPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const parsedGameId = useMemo(() => {
    const idNumber = Number(gameId);
    return Number.isFinite(idNumber) ? idNumber : null;
  }, [gameId]);

  const transitionMs = 1400; // 애니메이션(약 0.9~1.0초) 포함 총 2초 안팎으로 끝나도록 조정
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [champion, setChampion] = useState<GameItem | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [currentRound, setCurrentRound] = useState<GameItem[]>([]);
  const [nextRound, setNextRound] = useState<GameItem[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const isSelecting = selectedId !== null;
  const pickIndexRef = useRef(0);
  const winCountsRef = useRef<Record<number, number>>({});
  const resultPayloadRef = useRef<WorldcupResultPayload | null>(null);
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);

  const startRound = useCallback((roundItems: GameItem[], round: number) => {
    if (roundItems.length === 0) {
      return;
    }
    const candidates = [...roundItems];
    let carry: GameItem | null = null;
    if (candidates.length % 2 === 1) {
      carry = candidates.pop() || null;
    }
    setChampion(null);
    setRoundNumber(round);
    setCurrentRound(candidates);
    setNextRound(carry ? [carry] : []);
    setMatchIndex(0);
  }, []);

  const startNewSession = useCallback(
    async (source: string) => {
      if (parsedGameId === null) {
        return null;
      }
      const nextSessionId = await startGameSession(parsedGameId, source);
      if (nextSessionId) {
        setSessionId(nextSessionId);
      }
      return nextSessionId;
    },
    [parsedGameId]
  );

  // 아레나 진입 시 화면을 맨 아래로 스크롤 (상단 여백 없이 바로 콘텐츠가 보이도록)
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (parsedGameId === null) {
      return;
    }
    fetchGameDetail(parsedGameId)
      .then((data) => {
        setState({ status: "success", data });
        const shuffled = [...data.items].sort(() => Math.random() - 0.5);
        pickIndexRef.current = 0;
        startRound(shuffled, 1);
      })
      .catch((err: unknown) => {
        const message =
          (err instanceof ApiError && err.meta.message) ||
          (err instanceof Error && err.message) ||
          "게임 정보를 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
  }, [parsedGameId, startRound]);

  useEffect(() => {
    if (parsedGameId === null) {
      return;
    }
    const stored = getStoredGameSessionId(parsedGameId);
    if (stored) {
      setSessionId(stored);
    }
  }, [parsedGameId]);

  const handleSelect = (winner: GameItem) => {
    setSelectedId(winner.id);
    winCountsRef.current[winner.id] = (winCountsRef.current[winner.id] || 0) + 1;
    const left = a;
    const right = b;
    if (sessionId && left && right && parsedGameId !== null) {
      const stepIndex = pickIndexRef.current;
      pickIndexRef.current += 1;
      void createWorldcupPickLog({
        choice_id: sessionId,
        game_id: parsedGameId,
        left_item_id: left.id,
        right_item_id: right.id,
        selected_item_id: winner.id,
        step_index: stepIndex,
      }).catch(() => {
        // 선택 로그 실패는 진행을 막지 않음
      });
    }
    const total = currentRound.length / 2;
    const next = [...nextRound, winner];
    const isLastMatch = matchIndex + 1 >= total;

    if (isLastMatch) {
      setTimeout(() => {
        if (next.length === 1) {
          setChampion(next[0]);
          setCurrentRound([]);
          setNextRound([]);
          setMatchIndex(0);
          setSelectedId(null);
          return;
        }
        setNextRound([]);
        setSelectedId(null);
        startRound(next, roundNumber + 1);
      }, transitionMs);
    } else {
      setTimeout(() => {
        setNextRound(next);
        setMatchIndex((idx) => idx + 1);
        setSelectedId(null);
      }, transitionMs);
    }
  };

  const resolvedState: PageState = state;

  const resolvedGame = resolvedState.status === "success" ? resolvedState.data.game : null;
  const itemsCount =
    resolvedState.status === "success" ? resolvedState.data.items.length : 0;
  const allItems = resolvedState.status === "success" ? resolvedState.data.items : [];

  useEffect(() => {
    if (!champion || parsedGameId === null || !resolvedGame) {
      return;
    }
    if (hasNavigatedRef.current) {
      return;
    }
    const ranking = allItems
      .map((item) => ({
        id: item.id,
        name: item.name || "",
        file_name: item.file_name || "",
        sort_order: item.sort_order,
        wins: winCountsRef.current[item.id] || 0,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        return a.sort_order - b.sort_order;
      });

    const payload = {
      gameId: parsedGameId,
      gameTitle: resolvedGame.title,
      round: roundNumber,
      totalItems: itemsCount,
      champion: {
        id: champion.id,
        name: champion.name || "",
        file_name: champion.file_name || "",
        sort_order: champion.sort_order,
      },
      ranking,
    } satisfies WorldcupResultPayload;
    resultPayloadRef.current = payload;
    sessionStorage.setItem(`worldcup-result-${parsedGameId}`, JSON.stringify(payload));
    hasNavigatedRef.current = true;
    navigate(`/worldcup/${parsedGameId}/result`, { replace: true, state: payload });
  }, [allItems, champion, itemsCount, navigate, parsedGameId, resolvedGame, roundNumber]);

  useEffect(() => {
    if (!champion || parsedGameId === null || !sessionId) {
      return;
    }
    const resultTitle = resolvedGame?.title
      ? `${resolvedGame.title} 우승`
      : "월드컵 우승";
    const payload = resultPayloadRef.current;
    void createGameResult({
      choice_id: sessionId,
      game_id: parsedGameId,
      winner_item_id: champion.id,
      result_title: resultTitle,
      result_code: "WORLD_CUP",
      result_payload: {
        round: roundNumber,
        total_items: payload?.totalItems ?? itemsCount,
        champion: payload?.champion,
        ranking: payload?.ranking,
      },
    }).catch(() => {
      // 결과 로그 실패는 진행을 막지 않음
    });
  }, [champion, itemsCount, parsedGameId, resolvedGame, roundNumber, sessionId]);

  if (parsedGameId === null) {
    return <div className="arena-shell">잘못된 게임 ID 입니다.</div>;
  }

  if (resolvedState.status === "loading") {
    return <div className="arena-shell">불러오는 중...</div>;
  }

  if (resolvedState.status === "error") {
    return <div className="arena-shell">에러: {resolvedState.message}</div>;
  }

  const { game, items } = resolvedState.data;
  const totalMatches = currentRound.length / 2;
  const a = currentRound[matchIndex * 2];
  const b = currentRound[matchIndex * 2 + 1];

  const getMediaUrl = (item: GameItem) => {
    const url = item.file_name;
    if (!url) return null;
    // 절대경로/루트경로 모두 허용
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("/")
    ) {
      return url;
    }
    return null;
  };

  const isVideo = (url: string | null) => {
    if (!url) return false;
    return /\.(mp4|mov|webm|ogg)$/i.test(url);
  };

  return (
    <div className="arena-shell">
      <header className="arena-topbar">
        <div className="badge badge-hot">ROUND {roundNumber || 1}</div>
        <div className="arena-title">{game.title}</div>
        <div className="arena-progress">
          {champion
            ? "완료"
            : totalMatches
            ? `${matchIndex + 1} / ${totalMatches} 경기`
            : "준비 중"}
        </div>
      </header>

      {champion ? (
        <div className="arena-result">
          <div className="arena-result-card">
            <div className="result-badges">
              <span className="badge badge-hot">WINNER</span>
              <span className="badge badge-new">FINAL</span>
            </div>
            <div className="result-media">
              {(() => {
                const mediaUrl = getMediaUrl(champion);
                const video = isVideo(mediaUrl);
                if (mediaUrl) {
                  return video ? (
                    <video src={mediaUrl} controls playsInline muted loop />
                  ) : (
                    <img src={mediaUrl} alt={champion.name || champion.file_name} />
                  );
                }
                return (
                  <div className="arena-media-fallback">
                    <img src={placeholderImage} alt="NO IMAGE" />
                  </div>
                );
              })()}
            </div>
            <h2 className="result-title">{champion.name || champion.file_name}</h2>
            <p className="result-sub">이번 월드컵의 우승자입니다.</p>
            <div className="game-actions" style={{ justifyContent: "center" }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  const shuffled = [...items].sort(() => Math.random() - 0.5);
                  pickIndexRef.current = 0;
                  void startNewSession("worldcup_restart");
                  setChampion(null);
                  startRound(shuffled, 1);
                }}
              >
                다시 플레이
              </button>
              <Link to="/" className="btn btn-ghost">
                리스트로
              </Link>
            </div>
          </div>
        </div>
      ) : a && b ? (
        <div className={`arena-play ${isSelecting ? "selecting" : ""}`}>
          {[a, b].map((contestant, idx) => {
            const isSelected = selectedId === contestant.id;
            const isOther = isSelecting && !isSelected;
            return (
              <button
                key={contestant.id}
                className={`arena-full-card ${isSelected ? "selecting" : ""} ${
                  isOther ? "exiting" : ""
                }`}
                data-pos={idx === 0 ? "top" : "bottom"}
                type="button"
                onClick={() => handleSelect(contestant)}
              >
                {(() => {
                  const mediaUrl = getMediaUrl(contestant);
                  const video = isVideo(mediaUrl);
                  return (
                    <div className="arena-media">
                      {mediaUrl ? (
                        video ? (
                          <video src={mediaUrl} controls playsInline muted loop />
                        ) : (
                          <img src={mediaUrl} alt={contestant.name || contestant.file_name} />
                        )
                      ) : (
                        <div className="arena-media-fallback">
                          <img src={placeholderImage} alt="NO IMAGE" />
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="arena-full-name">
                  {contestant.name || contestant.file_name}
                </div>
                <div className="arena-full-meta">#{contestant.sort_order + 1}</div>
              </button>
            );
          })}
          <div className="vs-badge large">VS</div>
        </div>
      ) : (
        <div className="arena-shell">준비 중입니다...</div>
      )}
    </div>
  );
}
