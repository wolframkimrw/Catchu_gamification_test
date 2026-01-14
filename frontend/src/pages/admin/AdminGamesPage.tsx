import { useEffect, useState } from "react";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import type { AdminGame } from "../../api/games";
import { Link } from "react-router-dom";
import { fetchAdminGames } from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

export function AdminGamesPage() {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadGames = () => {
    setIsLoading(true);
    setError(null);
    fetchAdminGames()
      .then((data) => setGames(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "목록을 불러오지 못했습니다.");
        } else {
          setError("목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadGames();
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

  const getVisibilityLabel = (value: string) => {
    const map: Record<string, string> = {
      PUBLIC: "공개",
      PRIVATE: "비공개",
      UNLISTED: "링크 공개",
    };
    return map[value] || value;
  };

  return (
    <AdminShell active="games" title="게임 관리" description="게임 목록을 확인하고 상세에서 관리합니다.">
      {error ? <div className="admin-games-error">{error}</div> : null}

      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : games.length === 0 ? (
        <div className="admin-games-empty">게임이 없습니다.</div>
      ) : (
        <div className="admin-games-list">
          {games.map((game) => (
            <div key={game.id} className="admin-games-card">
              <Link to={`/admin/games/${game.id}`} className="admin-card-link">
                <div className="admin-games-info">
                  <div className="admin-games-thumb">
                    {game.thumbnail_image_url ? (
                      <img src={game.thumbnail_image_url} alt={game.title} />
                  ) : (
                    <div className="admin-games-thumb-placeholder">NO</div>
                  )}
                </div>
                <div>
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
                    <span
                      className={`admin-badge badge-visibility ${
                        game.visibility === "PUBLIC" ? "is-public" : "is-private"
                      }`}
                    >
                      {getVisibilityLabel(game.visibility)}
                    </span>
                  </div>
                  <div className="admin-games-owner">
                    {game.created_by
                      ? `${game.created_by.name} (${game.created_by.email})`
                      : "작성자 없음"}
                  </div>
                </div>
              </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
