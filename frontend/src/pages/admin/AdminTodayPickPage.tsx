import { useEffect, useMemo, useState } from "react";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import {
  fetchAdminGames,
  fetchAdminTodayPick,
  setAdminTodayPick,
  type AdminGame,
} from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

export function AdminTodayPickPage() {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [picks, setPicks] = useState<AdminGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([fetchAdminGames(), fetchAdminTodayPick()])
      .then(([gameList, todayPick]) => {
        setGames(gameList);
        setPicks(todayPick);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "데이터를 불러오지 못했습니다.");
        } else {
          setError("데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const activeGameIds = useMemo(() => new Set(picks.map((item) => item.id)), [picks]);

  const visibleGames = useMemo(
    () =>
      games.filter((game) => game.status === "ACTIVE" && game.visibility === "PUBLIC"),
    [games]
  );

  const handlePick = async (gameId: number, isActive: boolean) => {
    setIsSaving(true);
    setError(null);
    try {
      const next = await setAdminTodayPick(gameId, isActive);
      setPicks(next);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "오늘의 추천을 저장하지 못했습니다.");
      } else {
        setError("오늘의 추천을 저장하지 못했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell
      active="today"
      title="오늘의 추천"
      description="게임을 선택하면 메인 페이지의 오늘의 추천에 노출됩니다."
    >
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : (
        <>
          <div className="admin-log-summary">
            <div>
              <strong>{picks.length}</strong>
              <span>현재 추천 개수</span>
            </div>
            <div>
              <strong>{picks.length ? "선택됨" : "-"}</strong>
              <span>선택 상태</span>
            </div>
          </div>
          <div className="admin-games-list">
            {visibleGames.map((game) => (
              <div key={game.id} className="admin-games-card">
                <div className="admin-games-info">
                  <div className="admin-games-thumb">
                    {game.thumbnail_image_url ? (
                      <img src={game.thumbnail_image_url} alt={game.title} />
                    ) : (
                      <div className="admin-games-thumb-placeholder">NO</div>
                    )}
                  </div>
                  <div className="admin-item-fields">
                    <div className="admin-games-title">
                      {game.title}
                      {activeGameIds.has(game.id) ? (
                        <span className="admin-badge badge-status is-active">오늘의 추천</span>
                      ) : null}
                    </div>
                    <div className="admin-games-meta">{game.type}</div>
                  </div>
                </div>
                <div className="admin-games-actions">
                  {activeGameIds.has(game.id) ? (
                    <button
                      type="button"
                      className="ghost"
                      disabled={isSaving}
                      onClick={() => handlePick(game.id, false)}
                    >
                      해제
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handlePick(game.id, true)}
                    >
                      오늘의 추천으로 지정
                    </button>
                  )}
                </div>
              </div>
            ))}
            {visibleGames.length === 0 ? (
              <div className="admin-games-empty">추천 가능한 게임이 없습니다.</div>
            ) : null}
          </div>
        </>
      )}
    </AdminShell>
  );
}
