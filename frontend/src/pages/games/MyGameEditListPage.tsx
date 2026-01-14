import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./my-game-edit.css";
import { ApiError } from "../../api/http";
import { fetchMyGames } from "../../api/games";
import type { Game } from "../../api/games";
import { useAuthUser } from "../../hooks/useAuthUser";

export function MyGameEditListPage() {
  const { user } = useAuthUser();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    fetchMyGames()
      .then((data) => setGames(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "게임 목록을 불러오지 못했습니다.");
        } else {
          setError("게임 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!user) {
    return <div className="my-edit-state">로그인이 필요합니다.</div>;
  }

  return (
    <div className="my-edit-page">
      <header className="my-edit-header">
        <h1>내 게임 수정</h1>
        <p>수정 요청은 관리자 승인 후 반영됩니다.</p>
      </header>
      {error ? <div className="my-edit-state">{error}</div> : null}
      {isLoading ? (
        <div className="my-edit-state">불러오는 중...</div>
      ) : games.length === 0 ? (
        <div className="my-edit-state">등록된 게임이 없습니다.</div>
      ) : (
        <div className="my-edit-list">
          {games.map((game) => (
            <div key={game.id} className="my-edit-card">
              <div className="my-edit-thumb">
                {game.thumbnail ? (
                  <img src={game.thumbnail} alt={game.title} />
                ) : (
                  <div className="my-edit-thumb-placeholder">NO</div>
                )}
              </div>
              <div className="my-edit-info">
                <div className="my-edit-title">{game.title}</div>
                <div className="my-edit-meta">{game.type}</div>
                <Link to={`/my/games/${game.id}/edit`} className="my-edit-button">
                  수정 요청
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
