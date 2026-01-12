// src/pages/WorldcupArenaPage.tsx
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../pages/worldcup.css";
import { ApiError } from "../api/http";
import { fetchGameDetail } from "../api/games";
import type { GameDetailData, GameItem } from "../api/games";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: GameDetailData };

export function WorldcupArenaPage() {
  type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>;
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
  const isSelecting = selectedId !== null;

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
        startRound(shuffled, 1);
      })
      .catch((err: unknown) => {
        const message =
          (err instanceof ApiError && err.meta.message) ||
          (err instanceof Error && err.message) ||
          "게임 정보를 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedGameId]);

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

  const handleSelect = (winner: GameItem) => {
    setSelectedId(winner.id);
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

  if (parsedGameId === null) {
    return <div className="arena-shell">잘못된 게임 ID 입니다.</div>;
  }

  if (state.status === "loading") {
    return <div className="arena-shell">불러오는 중...</div>;
  }

  if (state.status === "error") {
    return <div className="arena-shell">에러: {state.message}</div>;
  }

  const { game, items } = state.data;
  const totalMatches = currentRound.length / 2;
  const a = currentRound[matchIndex * 2];
  const b = currentRound[matchIndex * 2 + 1];

  const getMediaUrl = (item: GameItem) => {
    const url = item.file_name;
    if (!url) return null;
    // file_name이 절대경로일 때만 사용
    if (url.startsWith("http://") || url.startsWith("https://")) {
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
                  <div className="arena-media-fallback">이미지를 불러올 수 없습니다.</div>
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
                  setChampion(null);
                  startRound(shuffled, 1);
                }}
              >
                다시 플레이
              </button>
              <Link to="/worldcup" className="btn btn-ghost">
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
            const slideDir = idx === 0 ? "-80px" : "80px";
            const style: CSSVarStyle = {};
            if (isOther) {
              style["--slide-dir"] = slideDir;
            }
            if (isSelected) {
              style["--selected-shift"] = idx === 0 ? "14%" : "-14%";
            }
            return (
              <button
                key={contestant.id}
                className={`arena-full-card ${isSelected ? "selecting" : ""} ${
                  isOther ? "exiting" : ""
                }`}
                type="button"
                onClick={() => handleSelect(contestant)}
                style={style}
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
                        <div className="arena-media-fallback">미리보기를 불러올 수 없습니다.</div>
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
