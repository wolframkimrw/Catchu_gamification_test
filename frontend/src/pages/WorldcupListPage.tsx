// src/pages/WorldcupListPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../pages/worldcup.css";
import type { Game } from "../api/games";
import { fetchGamesList } from "../api/games";

type GameCard = Game & { badge?: "HOT" | "NEW"; caption?: string };

const isGameCard = (game: Game | GameCard): game is GameCard =>
  "badge" in game || "caption" in game;

const gameCards: GameCard[] = [
  {
    id: 1,
    title: "라면 이상형 월드컵",
    type: "WORLD_CUP",
    thumbnail:
      "https://images.unsplash.com/photo-1604908177225-00f8e8f35012?w=800&q=80&auto=format&fit=crop",
    topic: { id: 1, name: "라면" },
    badge: "HOT",
    caption: "오늘의 추천",
  },
  {
    id: 2,
    title: "2025 금전운 테스트",
    type: "FORTUNE_TEST",
    thumbnail:
      "https://images.unsplash.com/photo-1508387024700-9fe5c0b37f83?w=800&q=80&auto=format&fit=crop",
    topic: { id: 2, name: "운세" },
    badge: "NEW",
    caption: "금전운 확인",
  },
  {
    id: 3,
    title: "슬버릇 테스트",
    type: "QUIZ",
    thumbnail:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=800&q=80&auto=format&fit=crop",
    topic: null,
    badge: "NEW",
    caption: "습관 점검",
  },
  {
    id: 4,
    title: "예민 타입 진단서",
    type: "TEST",
    thumbnail:
      "https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=800&q=80&auto=format&fit=crop",
    topic: null,
    badge: "HOT",
    caption: "나의 예민도",
  },
];

const categories = [
  { label: "MBTI·유형", emoji: "🧠" },
  { label: "취미·궁합", emoji: "🎮" },
  { label: "연애", emoji: "❤️" },
  { label: "퀴즈·능력고사", emoji: "❓" },
  { label: "미궁·방탈출", emoji: "🔒" },
  { label: "미니게임", emoji: "🎲" },
  { label: "짤 뽑기", emoji: "🖼️" },
  { label: "짤 만들기", emoji: "✨" },
  { label: "운세·타로", emoji: "🔮" },
  { label: "스낵테스트", emoji: "🍪" },
];

const sajuCard = {
  title: "오늘의 사주 운세 보기",
  thumbnail:
    "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800&q=80&auto=format&fit=crop",
  type: "FORTUNE_TEST",
  caption: "나의 오늘 운세",
};

export function WorldcupListPage() {
  const [highlight, ...restGames] = gameCards;
  const [apiHighlight, setApiHighlight] = useState<Game | null>(null);

  useEffect(() => {
    fetchGamesList()
      .then((games) => {
        const worldcup = games.find((g) => g.type === "WORLD_CUP");
        if (worldcup) {
          setApiHighlight(worldcup);
        }
      })
      .catch(() => {
        // 실패하면 하드코딩 데이터 사용
      });
  }, []);

  const highlightCard = apiHighlight || highlight;
  const highlightBadge = isGameCard(highlightCard)
    ? highlightCard.badge
    : undefined;
  const highlightCaption = isGameCard(highlightCard)
    ? highlightCard.caption
    : undefined;

  return (
    <div className="page-section">
      <section className="worldcup-hero">
        <div>
          <h2>오늘도 만나서 반가워! 추천 콘텐츠를 즐겨봐 🎵</h2>
          <p>월드컵 게임과 테스트로 기분 전환해 보세요.</p>
        </div>
        <div className="hero-emoji">🐣</div>
      </section>

      <div className="section-title">
        <span className="badge badge-hot">HOT</span>
        <span>추천 월드컵</span>
      </div>
      <div className="game-grid highlight-grid">
        {highlightCard ? (
          <Link
            to={`/worldcup/${highlightCard.id}/play`}
            className="game-card game-card-link game-card-highlight"
            key={highlightCard.id}
          >
            <div className="game-thumb wide-thumb">
              <img src={highlightCard.thumbnail} alt={highlightCard.title} />
            </div>
            <div className="highlight-info">
              <div className="game-meta">
                {highlightBadge ? (
                  <span
                    className={`badge ${
                      highlightBadge === "HOT" ? "badge-hot" : "badge-new"
                    }`}
                  >
                    {highlightBadge}
                  </span>
                ) : null}
                {highlightCaption ? (
                  <span>{highlightCaption}</span>
                ) : null}
              </div>
              <h3 className="game-title-link">{highlightCard.title}</h3>
              <div className="game-meta">
                <span>{highlightCard.type}</span>
                {highlightCard.topic?.name && <span>• {highlightCard.topic.name}</span>}
              </div>
            </div>
          </Link>
        ) : null}
      </div>

      <div className="game-grid">
        {restGames.map((game) => (
          <Link
            to={`/worldcup/${game.id}/play`}
            key={game.id}
            className="game-card game-card-link"
          >
            <div className="game-thumb">
              <img src={game.thumbnail} alt={game.title} />
            </div>
            <div className="game-meta">
              {game.badge ? (
                <span
                  className={`badge ${game.badge === "HOT" ? "badge-hot" : "badge-new"
                    }`}
                >
                  {game.badge}
                </span>
              ) : null}
              {game.caption && <span>{game.caption}</span>}
            </div>
            <h3 className="game-title-link">{game.title}</h3>
            <div className="game-meta">
              <span>{game.type}</span>
              {game.topic?.name && <span>• {game.topic.name}</span>}
            </div>
          </Link>
        ))}
        <Link to="/saju" className="game-card game-card-link">
          <div className="game-thumb">
            <img src={sajuCard.thumbnail} alt={sajuCard.title} />
          </div>
          <div className="game-meta">
            <span className="badge badge-new">NEW</span>
            <span>{sajuCard.caption}</span>
          </div>
          <h3 className="game-title-link">{sajuCard.title}</h3>
          <div className="game-meta">
            <span>{sajuCard.type}</span>
          </div>
        </Link>
      </div>

      <div className="section-title">
        <span className="badge badge-new">NEW</span>
        <span>카테고리 둘러보기</span>
      </div>
      <div className="category-grid">
        {categories.map((cat) => (
          <div key={cat.label} className="category-tile">
            <span className="category-emoji">{cat.emoji}</span>
            <span>{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
