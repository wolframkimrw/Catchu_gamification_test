// src/pages/WorldcupPlayPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../pages/worldcup.css";
import { ApiError } from "../api/http";
import { fetchGameDetail } from "../api/games";
import type { GameDetailData, GameItem } from "../api/games";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: GameDetailData };

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
  const [currentRound, setCurrentRound] = useState<GameItem[]>([]);
  const [nextRound, setNextRound] = useState<GameItem[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

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

  if (state.status === "loading") {
    return <div className="state-box">불러오는 중...</div>;
  }

  if (state.status === "error") {
    return <div className="state-box">에러: {state.message}</div>;
  }

  const { game, items } = state.data;
  const previewItems = items.slice(0, 4);
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
    setCurrentRound(candidates);
    setNextRound(carry ? [carry] : []);
    setMatchIndex(0);
  };

  const startGame = () => {
    if (!items.length || parsedGameId === null) return;
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
      <div className="detail-header play-header">
        <img src={game.thumbnail} alt={game.title} />
        <div className="play-info">
          <p className="badge badge-hot" style={{ display: "inline-flex" }}>
            WORLD CUP
          </p>
          <h1 className="detail-title">{game.title}</h1>
          <div className="detail-meta">
            <span>{game.type}</span>
            {game.topic?.name && <span>• {game.topic.name}</span>}
            <span>• 후보 {items.length}개</span>
          </div>
          <p className="play-sub">
            메인에서 바로 시작! 라운드 선택 없이 일단 플레이해요.
          </p>
          <div className="game-actions">
            <Link to={`/worldcup/${game.id}`} className="btn btn-ghost">
              상세보기
            </Link>
            <button className="btn btn-primary" type="button" onClick={startGame}>
              게임 시작
            </button>
          </div>
        </div>
      </div>

      <div className="page-section">
        <h3>게임 프리뷰</h3>
        {previewItems.length === 0 ? (
          <div className="state-box">등록된 항목이 없습니다.</div>
        ) : (
          <div className="play-preview">
            {previewItems.map((item) => (
              <div key={item.id} className="play-chip">
                <span className="chip-order">#{item.sort_order + 1}</span>
                <span>{item.name || item.file_name}</span>
              </div>
            ))}
            {items.length > previewItems.length ? (
              <div className="play-chip muted">
                +{items.length - previewItems.length}개 더 있음
              </div>
            ) : null}
          </div>
        )}
      </div>

      {items.length < 2 ? (
        <div className="state-box">후보가 2개 이상 있어야 게임을 시작할 수 있습니다.</div>
      ) : (
        <>
          <div className="play-round">
            <div className="round-meta">
              <span className="badge badge-hot">ROUND {roundNumber || 1}</span>
              <span className="round-progress">
                {started && totalMatches
                  ? `${matchIndex + 1}/${totalMatches} 경기`
                  : "시작 전"}
              </span>
            </div>
            {!started && !champion ? (
              <div className="state-box">시작 버튼을 눌러 주세요.</div>
            ) : null}
            {started && a && b ? (
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
                <Link to="/worldcup" className="btn btn-ghost">
                  리스트로
                </Link>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
