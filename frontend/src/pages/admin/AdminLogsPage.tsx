import { useEffect, useState } from "react";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import { fetchAdminGames, type AdminGame } from "../../api/games";
import { AdminShell } from "../../components/AdminShell";
import { useNavigate } from "react-router-dom";

export function AdminLogsPage() {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    setVisibleCount(3);
    setIsLoading(true);
    fetchAdminGames()
      .then((data) => setGames(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "게임 목록을 불러오지 못했습니다.");
        } else {
          setError("게임 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

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

  const getStatusLabel = (value: string) => {
    const map: Record<string, string> = {
      ACTIVE: "활성",
      STOPPED: "중지",
      DRAFT: "작성중",
      ARCHIVED: "보관",
    };
    return map[value] || value;
  };

  return (
    <AdminShell active="logs" title="결과/로그" description="게임별 로그와 통계를 확인합니다.">
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : games.length === 0 ? (
        <div className="admin-games-empty">로그가 없습니다.</div>
      ) : (
        <>
          <div className="admin-games-list">
            {games.slice(0, visibleCount).map((game) => (
              <div key={game.id} className="admin-games-card">
                <div
                  className="admin-games-info"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/logs/${game.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/admin/logs/${game.id}`);
                    }
                  }}
                >
                  <div className="admin-games-thumb">
                    {game.thumbnail_image_url ? (
                      <img src={game.thumbnail_image_url} alt={game.title} />
                    ) : (
                      <div className="admin-games-thumb-placeholder">NO</div>
                    )}
                  </div>
                  <div className="admin-item-fields">
                    <div className="admin-games-title">{game.title}</div>
                    <div className="admin-games-tags">
                      <span className="admin-badge badge-type">{getTypeLabel(game.type)}</span>
                      <span
                        className={`admin-badge badge-status ${
                          game.status === "ACTIVE" ? "is-active" : "is-inactive"
                        }`}
                      >
                        {getStatusLabel(game.status)}
                      </span>
                    </div>
                    <div className="admin-games-meta">
                      생성일: {new Date(game.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {games.length > visibleCount ? (
            <button
              type="button"
              className="admin-log-more"
              onClick={() => setVisibleCount(games.length)}
            >
              더보기
            </button>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
