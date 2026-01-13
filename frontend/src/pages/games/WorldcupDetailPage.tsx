// src/pages/WorldcupDetailPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./worldcup.css";
import { ApiError } from "../../api/http";
import { fetchGameDetail } from "../../api/games";
import type { GameDetailData } from "../../api/games";
import { getLocalWorldcupDetail, LOCAL_WORLDCUP_ID } from "../../data/localWorldcup";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: GameDetailData };

export function WorldcupDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const parsedGameId = useMemo(() => {
    const idNumber = Number(gameId);
    return Number.isFinite(idNumber) ? idNumber : null;
  }, [gameId]);
  const isLocalGame = parsedGameId === LOCAL_WORLDCUP_ID;
  const localData = useMemo(
    () => (isLocalGame ? getLocalWorldcupDetail() : null),
    [isLocalGame]
  );

  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    if (parsedGameId === null) {
      return;
    }
    if (isLocalGame) {
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
  }, [isLocalGame, parsedGameId]);

  if (parsedGameId === null) {
    return <div className="state-box">잘못된 게임 ID 입니다.</div>;
  }

  const resolvedState: PageState = localData
    ? { status: "success", data: localData }
    : state;

  if (resolvedState.status === "loading") {
    return <div className="state-box">불러오는 중...</div>;
  }

  if (resolvedState.status === "error") {
    return <div className="state-box">에러: {resolvedState.message}</div>;
  }

  const { game, items } = resolvedState.data;

  return (
    <div className="page-section detail-card">
      <div className="detail-header">
        <img src={game.thumbnail} alt={game.title} />
        <div>
          <p className="badge badge-hot" style={{ display: "inline-flex" }}>
            WORLD CUP
          </p>
          <h1 className="detail-title">{game.title}</h1>
          <div className="detail-meta">
            <span>{game.type}</span>
            {game.topic?.name && <span>• {game.topic.name}</span>}
          </div>
        </div>
      </div>

      <div className="page-section">
        <h3>게임 아이템</h3>
        {items.length === 0 ? (
          <div className="state-box">아직 등록된 항목이 없습니다.</div>
        ) : (
          <ul>
            {items.map((item, idx) => (
              <li key={idx}>{JSON.stringify(item)}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
