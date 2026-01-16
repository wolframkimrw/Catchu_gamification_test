// src/pages/WorldcupPlayPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./worldcup.css";
import { ApiError } from "../../api/http";
import { fetchGameDetail } from "../../api/games";
import { useGameSessionStart } from "../../hooks/useGameSessionStart";
import type { GameDetailData, GameItem } from "../../api/games";
import { GameStartScreen } from "../../components/GameStartScreen";
import { TagIconGamepad, TagIconCreator } from "../../components/GameStartIcons";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: GameDetailData };

const getTypeLabel = (value: string) => {
  const map: Record<string, string> = {
    WORLD_CUP: "월드컵",
    FORTUNE_TEST: "운세",
    PSYCHOLOGICAL: "심리테스트",
    PSYCHO_TEST: "심리테스트",
    QUIZ: "퀴즈",
  };
  return map[value] || value;
};

export function WorldcupPlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const parsedGameId = useMemo(() => {
    const idNumber = Number(gameId);
    return Number.isFinite(idNumber) ? idNumber : null;
  }, [gameId]);

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [started, setStarted] = useState(false);
  const [champion, setChampion] = useState<GameItem | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [roundSize, setRoundSize] = useState(0);
  const [currentRound, setCurrentRound] = useState<GameItem[]>([]);
  const [nextRound, setNextRound] = useState<GameItem[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const { startSession } = useGameSessionStart(parsedGameId, "worldcup_play_start");

  useEffect(() => {
    if (parsedGameId === null) {
      return;
    }
    fetchGameDetail(parsedGameId)
      .then((data) => setState({ status: "success", data }))
      .catch((err: unknown) => {
        const message =
          (err instanceof ApiError && err.meta.message) ||
          (err instanceof Error && err.message) ||
          "게임 정보를 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
  }, [parsedGameId]);

  if (parsedGameId === null) {
    return <div className="state-box">잘못된 게임 ID 입니다.</div>;
  }

  const resolvedState: PageState = state;

  if (resolvedState.status === "loading") {
    return <div className="state-box">불러오는 중...</div>;
  }

  if (resolvedState.status === "error") {
    return <div className="state-box">에러: {resolvedState.message}</div>;
  }

  const { game, items } = resolvedState.data;
  const totalMatches = currentRound.length / 2;
  const a = currentRound[matchIndex * 2];
  const b = currentRound[matchIndex * 2 + 1];

  const startRound = (roundItems: GameItem[], round: number) => {
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
    setRoundSize(roundItems.length);
    setCurrentRound(candidates);
    setNextRound(carry ? [carry] : []);
    setMatchIndex(0);
  };

  const startGame = async () => {
    if (!items.length || parsedGameId === null) return;
    try {
      await startSession();
    } catch {
      // 로그 실패는 게임 진행을 막지 않음
    }
    window.location.href = `/worldcup/${parsedGameId}/arena`;
  };

  const handleSelect = (winner: GameItem) => {
    if (!started || !a || !b) return;

    const total = currentRound.length / 2;
    const next = [...nextRound, winner];
    const isLastMatch = matchIndex + 1 >= total;

    if (isLastMatch) {
      if (next.length === 1) {
        setChampion(next[0]);
        setStarted(false);
        setCurrentRound([]);
        setNextRound([]);
        setMatchIndex(0);
        return;
      }
      setNextRound([]);
      startRound(next, roundNumber + 1);
    } else {
      setNextRound(next);
      setMatchIndex((idx) => idx + 1);
    }
  };

  return (
    <div className="page-section detail-card play-card">
      {items.length < 2 ? (
        <div className="play-start-section">
          <div className="state-box">후보가 2개 이상 있어야 게임을 시작할 수 있습니다.</div>
        </div>
      ) : !started && !champion ? (
        <GameStartScreen
          title={game.title}
          tags={[
            {
              label: getTypeLabel(game.type),
              icon: TagIconGamepad,
            },
            ...(game.created_by
              ? [
                  {
                    label: game.created_by.name,
                    icon: TagIconCreator,
                  },
                ]
              : []),
          ]}
          media={<img src={game.thumbnail} alt={game.title} />}
          buttonLabel="게임 시작"
          onStart={startGame}
        />
      ) : (
        <div className="play-start-section">
          <div className="play-round">
            <div className="round-meta">
              <span className="badge badge-hot">{roundSize ? `${roundSize}강` : "대기"}</span>
              <span className="round-progress">
                {totalMatches ? `${matchIndex + 1}/${totalMatches} 경기` : "시작 전"}
              </span>
            </div>
            {a && b ? (
              <div className="match-box">
                {[a, b].map((contestant) => (
                  <button
                    key={contestant.id}
                    className="contestant-card"
                    type="button"
                    onClick={() => handleSelect(contestant)}
                  >
                    <div className="contestant-name">
                      {contestant.name || contestant.file_name}
                    </div>
                    <div className="contestant-meta">
                      #{contestant.sort_order + 1}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {champion ? (
            <div className="state-box play-winner">
              <p className="badge badge-hot" style={{ display: "inline-flex" }}>
                WINNER
              </p>
              <h3>{champion.name || champion.file_name}</h3>
              <div className="game-actions" style={{ justifyContent: "center" }}>
                <button className="btn btn-primary" type="button" onClick={startGame}>
                  다시 플레이
                </button>
                <Link to="/" className="btn btn-ghost">
                  리스트로
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
