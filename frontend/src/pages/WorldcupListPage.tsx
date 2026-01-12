// src/pages/WorldcupListPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../pages/worldcup.css";
import type { Game } from "../api/games";
import { fetchGamesList } from "../api/games";


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

export function WorldcupListPage() {
  const [apiGames, setApiGames] = useState<Game[]>([]);
  const [worldcupApiGames, setWorldcupApiGames] = useState<Game[]>([]);
  const worldcupRef = useRef<HTMLDivElement | null>(null);
  const fortuneRef = useRef<HTMLDivElement | null>(null);
  const psychoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchGamesList()
      .then((games) => {
        setApiGames(games);
        setWorldcupApiGames(games.filter((game) => game.type === "WORLD_CUP"));
      })
      .catch(() => {
        // 실패하면 하드코딩 데이터 사용
      });
  }, []);

  const catalogGames = useMemo(() => apiGames, [apiGames]);

  const worldcupGames = worldcupApiGames;
  const fortuneGames = catalogGames.filter(
    (game) => game.type === "FORTUNE_TEST"
  );

  const psychoGames = catalogGames.filter(
    (game) => game.type === "PSYCHO_TEST"
  );
  const resolvedPsychoGames =
    psychoGames.length > 0 ? psychoGames : psychoFallbackGames;

  const bannerTarget = useMemo(() => {
    const worldcup = worldcupGames[0];
    if (worldcup) {
      return {
        title: worldcup.title,
        subtitle: "오늘의 월드컵 추천",
        image: worldcup.thumbnail,
        link: `/worldcup/${worldcup.id}/play`,
      };
    }
    const fortune = fortuneGames[0];
    if (fortune) {
      return {
        title: fortune.title,
        subtitle: "오늘의 운게임",
        image: fortune.thumbnail,
        link: "/saju",
      };
    }
    return {
      title: "오늘의 사주 운세",
      subtitle: "오늘의 운게임",
      image: "",
      link: "/saju",
    };
  }, [fortuneGames, worldcupGames]);


  return (
    <div className="page">
      <section className="section hero full-bleed">

        <Link to={bannerTarget.link} className="wc-banner">
          <div className="wc-banner-media">
            {bannerTarget.image ? (
              <img src={bannerTarget.image} alt={bannerTarget.title} />
            ) : (
              <div className="wc-banner-fallback" />
            )}
          </div>
          <div className="wc-banner-content wc-content">
            <span className="badge badge-hot">TODAY</span>
            <h2>{bannerTarget.title}</h2>
            <p>{bannerTarget.subtitle}</p>
          </div>
        </Link>
      </section>

      <div className="wc-content">
        {/* <section className="section categories">
          <div className="wc-tabs h-rail" style={{ "--gap": "0.5rem" } as CSSProperties}>
            <div className="h-rail-track">
              <button
                type="button"
                className={`wc-tab ${activeTab === "worldcup" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("worldcup");
                  worldcupRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                월드컵
              </button>
              <button
                type="button"
                className={`wc-tab ${activeTab === "fortune" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("fortune");
                  fortuneRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                운게임
              </button>
              <button
                type="button"
                className={`wc-tab ${activeTab === "psycho" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("psycho");
                  psychoRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                심리테스트
              </button>
            </div>
          </div>
        </section> */}

        <section className="section intro">
          <div className="worldcup-hero">
            <div>
              <h2>오늘도 만나서 반가워! 추천 콘텐츠를 즐겨봐 🎵</h2>
              <p>월드컵 게임과 테스트로 기분 전환해 보세요.</p>
            </div>
            <div className="hero-emoji">🐣</div>
          </div>
        </section>

        <section className="section list">
          <div className="category-page">
            <div ref={worldcupRef} className="worldcup-rail">
              <CategorySection
                title="월드컵"
                variant="big"
                games={worldcupGames}
                fallbackLabel="월드컵 준비중"
                onCardClick={(game) => `/worldcup/${game.id}/play`}
                getMeta={() => ({})}
              />
            </div>
            <div ref={fortuneRef}>
              <CategorySection
                title="운게임 (사주팔자)"
                variant="small"
                games={fortuneGames}
                fallbackLabel="운게임 준비중"
                onCardClick={() => "/saju"}
                getMeta={() => ({})}
              />
            </div>
            <div ref={psychoRef} className="psy-section">
              <CategorySection
                title="심리테스트"
                variant="small"
                games={resolvedPsychoGames}
                fallbackLabel="심리테스트 준비중"
                onCardClick={null}
                getMeta={() => ({})}
              />
            </div>
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
        </section>
      </div>
    </div>
  );
}

type CategoryVariant = "big" | "small";

type CategorySectionProps = {
  title: string;
  variant: CategoryVariant;
  games: Game[];
  fallbackLabel: string;
  onCardClick: ((game: Game) => string) | null;
  getMeta: (game: Game) => { badge?: "HOT" | "NEW"; caption?: string };
};


function CategorySection({
  title,
  variant,
  games,
  fallbackLabel,
  onCardClick,
  getMeta,
}: CategorySectionProps) {
  const hasGames = games.length > 0;
  return (
    <section className="cat-section">
      <div className="cat-header">
        <h3>{title}</h3>
      </div>
      <div className={`cat-grid ${variant} h-rail`}>
        <div className="h-rail-track">
          {hasGames
            ? games.map((game) => {
                const meta = getMeta(game);
                const content = (
                  <>
                    <div className="gc-thumb">
                      {game.thumbnail ? (
                        <img src={game.thumbnail} alt={game.title} />
                      ) : (
                        <div className="gc-thumb-placeholder">준비중</div>
                      )}
                    </div>
                    <div className="gc-body">
                      <div className="gc-title">{game.title}</div>
                      {meta.caption ? (
                        <div className="gc-meta">{meta.caption}</div>
                      ) : null}
                    </div>
                  </>
                );

                const cardNode = !onCardClick ? (
                  <div className="gc-card">{content}</div>
                ) : (
                  <Link to={onCardClick(game)} className="gc-card">
                    {content}
                  </Link>
                );

                return (
                  <div key={game.id} className="h-rail-item">
                    {cardNode}
                  </div>
                );
              })
            : (
                <div className="h-rail-item">
                  <div className="gc-card">
                    <div className="gc-thumb">
                      <div className="gc-thumb-placeholder">준비중</div>
                    </div>
                    <div className="gc-body">
                      <div className="gc-title">{fallbackLabel}</div>
                    </div>
                  </div>
                </div>
              )}
        </div>
      </div>
    </section>
  );
}
const psychoFallbackGames: Game[] = Array.from({ length: 10 }, (_, index) => ({
  id: 1000 + index,
  title: `심리테스트 ${index + 1}`,
  type: "PSYCHO_TEST",
  thumbnail:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80&auto=format&fit=crop",
  topic: null,
}));
