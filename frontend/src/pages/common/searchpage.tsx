import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./search.css";
import { fetchGamesList, type Game } from "../../api/games";

export function SearchPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchGamesList()
      .then((items) => setGames(items))
      .catch(() => setGames([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGames = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }
    return games.filter((game) =>
      game.title.toLowerCase().includes(normalizedQuery)
    );
  }, [games, normalizedQuery]);

  const resolveGameLink = (game: Game) => {
    if (game.type === "WORLD_CUP") {
      return `/worldcup/${game.id}/play`;
    }
    if (game.type === "FORTUNE_TEST") {
      return "/saju";
    }
    if (game.type === "PSYCHOLOGICAL" || game.type === "PSYCHO_TEST") {
      return `/psycho/${game.slug || "major-arcana"}`;
    }
    return "/";
  };

  return (
    <div className="page search-page">
      <div className="search-shell">
        <section className="section search-hero">
          <div className="search-hero-inner">
            <h2>게임 검색</h2>
            <p>지금 하고 싶은 게임을 바로 찾아보세요.</p>
          </div>
          <div className="search-input">
            <input
              ref={inputRef}
              type="search"
              value={query}
              placeholder="게임 이름으로 검색"
              onChange={(event) => setQuery(event.target.value)}
              aria-label="게임 검색"
            />
          </div>
        </section>
      </div>
      <section className="section search-results">
        {!normalizedQuery ? (
          <div className="search-hint">검색어를 입력하면 결과가 보여요.</div>
        ) : null}
        {normalizedQuery && isLoading ? (
          <div className="search-hint">검색 중...</div>
        ) : null}
        {normalizedQuery && !isLoading ? (
          filteredGames.length > 0 ? (
            <>
              <div className="search-count">검색 결과 {filteredGames.length}개</div>
              <div className="search-list">
                {filteredGames.map((game) => (
                  <Link key={game.id} to={resolveGameLink(game)} className="search-row">
                    <div className="search-row-title">{game.title}</div>
                    <div className="search-row-meta">{game.type}</div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="search-hint">검색 결과가 없어요.</div>
          )
        ) : null}
      </section>
    </div>
  );
}
