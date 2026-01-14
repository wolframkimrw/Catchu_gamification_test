// src/pages/WorldcupDetailPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
        <div className="detail-thumb">
          <div className="detail-thumb-message">🎉 월드컵이 생성되었습니다! 🎉</div>
          <img src={game.thumbnail} alt={game.title} />
        </div>
        <div>
          <p className="badge badge-hot" style={{ display: "inline-flex" }}>
            월드컵
          </p>
          <h1 className="detail-title">게임명 : {game.title}</h1>
          <div className="detail-actions">
            <Link to="/" className="detail-home-button">
              홈으로
            </Link>
          </div>
        </div>
      </div>

      <div className="page-section">
        <h3>월드컵 항목</h3>
        {items.length === 0 ? (
          <div className="state-box">아직 등록된 항목이 없습니다.</div>
        ) : (
          <ul className="detail-items">
            {items.map((item) => (
              <li key={item.id} className="detail-item">
                <div className="detail-item-image">
                  {item.file_name ? (
                    <img src={item.file_name} alt={item.name || "게임 아이템"} />
                  ) : (
                    <span className="detail-item-fallback">이미지 없음</span>
                  )}
                </div>
                <div className="detail-item-name">{item.name || "이름 없음"}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
