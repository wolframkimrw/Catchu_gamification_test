// src/pages/WorldcupListPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
    id: 5,
    title: "치킨 월드컵",
    type: "WORLD_CUP",
    thumbnail:
      "https://images.unsplash.com/photo-1604908177225-00f8e8f35012?w=800&q=80&auto=format&fit=crop",
    topic: { id: 1, name: "치킨" },
    badge: "NEW",
    caption: "오늘의 치킨",
  },
  {
    id: 6,
    title: "커피 월드컵",
    type: "WORLD_CUP",
    thumbnail:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80&auto=format&fit=crop",
    topic: { id: 3, name: "카페" },
    badge: "NEW",
    caption: "취향 찾기",
  },
  {
    id: 7,
    title: "야식 월드컵",
    type: "WORLD_CUP",
    thumbnail:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&auto=format&fit=crop",
    topic: { id: 4, name: "야식" },
    badge: "HOT",
    caption: "오늘 밤 선택",
  },
  {
    id: 8,
    title: "간식 월드컵",
    type: "WORLD_CUP",
    thumbnail:
      "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80&auto=format&fit=crop",
    topic: { id: 5, name: "간식" },
    badge: "NEW",
    caption: "달콤한 승부",
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

const psychoFallbackGames: GameCard[] = Array.from({ length: 10 }, (_, index) => ({
  id: 1000 + index,
  title: `심리테스트 ${index + 1}`,
  type: "PSYCHO_TEST",
  thumbnail:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80&auto=format&fit=crop",
  topic: null,
  badge: "NEW",
  caption: "준비중",
}));

export function WorldcupListPage() {
  const [apiGames, setApiGames] = useState<Game[]>([]);
  const [activeTab, setActiveTab] = useState<"worldcup" | "fortune" | "psycho">(
    "worldcup"
  );
  const worldcupRef = useRef<HTMLDivElement | null>(null);
  const fortuneRef = useRef<HTMLDivElement | null>(null);
  const psychoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchGamesList()
      .then((games) => {
        setApiGames(games);
      })
      .catch(() => {
        // 실패하면 하드코딩 데이터 사용
      });
  }, []);

  const catalogGames = useMemo(() => {
    if (apiGames.length === 0) {
      return gameCards;
    }
    const merged = new Map<number, Game | GameCard>();
    apiGames.forEach((game) => {
      merged.set(game.id, game);
    });
    gameCards.forEach((game) => {
      if (!merged.has(game.id)) {
        merged.set(game.id, game);
      }
    });
    return Array.from(merged.values());
  }, [apiGames]);

  const worldcupGames = catalogGames.filter((game) => game.type === "WORLD_CUP");
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

  const getCardMeta = (game: Game | GameCard) => {
    const badge = isGameCard(game) ? game.badge : undefined;
    const caption = isGameCard(game) ? game.caption : undefined;
    return { badge, caption };
  };

  return (
    <div className="page">
      <section className="section hero full-bleed">
        <div className="wc-page-header">
          <div className="wc-header-inner wc-content">
            <div className="wc-header-title">캐치유 플레이</div>
            <div className="wc-header-actions">
              <button type="button" className="wc-icon-button" aria-disabled="true">
                🔍
              </button>
              <button type="button" className="wc-icon-button" aria-disabled="true">
                ⚙️
              </button>
            </div>
          </div>
        </div>

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
        <section className="section categories">
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
        </section>

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
                getMeta={getCardMeta}
              />
            </div>
            <div ref={fortuneRef}>
              <CategorySection
                title="운게임 (사주팔자)"
                variant="small"
                games={fortuneGames}
                fallbackLabel="운게임 준비중"
                onCardClick={() => "/saju"}
                getMeta={getCardMeta}
              />
            </div>
            <div ref={psychoRef} className="psy-section">
              <CategorySection
                title="심리테스트"
                variant="small"
                games={resolvedPsychoGames}
                fallbackLabel="심리테스트 준비중"
                onCardClick={null}
                getMeta={getCardMeta}
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
  games: Array<Game | GameCard>;
  fallbackLabel: string;
  onCardClick: ((game: Game | GameCard) => string) | null;
  getMeta: (game: Game | GameCard) => { badge?: "HOT" | "NEW"; caption?: string };
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
                      <div className="cat-thumb">
                        {game.thumbnail ? (
                          <img src={game.thumbnail} alt={game.title} />
                        ) : (
                          <div className="cat-thumb-placeholder">준비중</div>
                        )}
                      </div>
                      <div className="cat-body">
                        <div className="cat-meta">
                          {meta.badge ? (
                            <span
                              className={`badge ${
                                meta.badge === "HOT" ? "badge-hot" : "badge-new"
                              }`}
                            >
                              {meta.badge}
                            </span>
                          ) : null}
                          {meta.caption ? <span>{meta.caption}</span> : null}
                        </div>
                        <div className="cat-title">{game.title}</div>
                      </div>
                    </>
                  );

                  const cardNode = !onCardClick ? (
                    <div className="cat-card disabled">{content}</div>
                  ) : (
                    <Link to={onCardClick(game)} className="cat-card">
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
                <div className="cat-card placeholder">
                  <div className="cat-thumb">
                    <div className="cat-thumb-placeholder">준비중</div>
                  </div>
                  <div className="cat-body">
                    <div className="cat-title">{fallbackLabel}</div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
