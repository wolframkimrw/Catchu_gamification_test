// src/pages/main/mainpage.tsx
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import "../games/worldcup.css";
import type { BannerItem, Game } from "../../api/games";
import { fetchBanners, fetchGamesList, fetchTodayPick } from "../../api/games";


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
  const [todayPick, setTodayPick] = useState<Game[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTouchStartX = useRef<number | null>(null);
  const bannerTouchLastX = useRef<number | null>(null);
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
    fetchTodayPick()
      .then((picks) => setTodayPick(picks))
      .catch(() => {
        setTodayPick([]);
      });
    fetchBanners("TOP_GLOBAL")
      .then((items) => setBanners(items))
      .catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (bannerIndex >= banners.length) {
      setBannerIndex(0);
    }
  }, [banners.length, bannerIndex]);

  const catalogGames = useMemo(() => apiGames, [apiGames]);

  const worldcupGames = useMemo(() => worldcupApiGames, [worldcupApiGames]);
  const fortuneGames = catalogGames.filter(
    (game) => game.type === "FORTUNE_TEST"
  );

  const psychoGames = catalogGames.filter(
    (game) => game.type === "PSYCHOLOGICAL" || game.type === "PSYCHO_TEST"
  );
  const resolvedPsychoGames =
    psychoGames.length > 0 ? psychoGames : psychoFallbackGames;

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

  const bannerTarget = useMemo(() => {
    const banner = banners[bannerIndex];
    if (banner) {
      if (banner.link_type === "GAME" && banner.game) {
        return {
          title: banner.name || banner.game.title,
          subtitle: "",
          image: banner.image_url,
          link: resolveGameLink({
            id: banner.game.id,
            title: banner.game.title,
            slug: banner.game.slug,
            type: banner.game.type,
            thumbnail: "",
          }),
          isExternal: false,
          useContent: false,
        };
      }
      return {
        title: banner.name,
        subtitle: "",
        image: banner.image_url,
        link: banner.link_url || "/",
        isExternal: banner.link_url?.startsWith("http") ?? false,
        useContent: false,
      };
    }
    const worldcup = worldcupGames[0];
    if (worldcup) {
      return {
        title: worldcup.title,
        subtitle: "오늘의 월드컵 추천",
        image: worldcup.thumbnail,
        link: `/worldcup/${worldcup.id}/play`,
        isExternal: false,
        useContent: true,
      };
    }
    const fortune = fortuneGames[0];
    if (fortune) {
      return {
        title: fortune.title,
        subtitle: "오늘의 운게임",
        image: fortune.thumbnail,
        link: "/saju",
        isExternal: false,
        useContent: true,
      };
    }
    return {
      title: "오늘의 사주 운세",
      subtitle: "오늘의 운게임",
      image: "",
      link: "/saju",
      isExternal: false,
      useContent: true,
    };
  }, [banners, bannerIndex, fortuneGames, worldcupGames]);

  const bumpBannerIndex = (direction: number) => {
    if (banners.length === 0) {
      return;
    }
    setBannerIndex((prev) => (prev + direction + banners.length) % banners.length);
  };

  const handleBannerTouchStart = (
    event: TouchEvent<HTMLAnchorElement | HTMLDivElement>
  ) => {
    const touch = event.touches[0];
    bannerTouchStartX.current = touch?.clientX ?? null;
    bannerTouchLastX.current = touch?.clientX ?? null;
  };

  const handleBannerTouchMove = (
    event: TouchEvent<HTMLAnchorElement | HTMLDivElement>
  ) => {
    const touch = event.touches[0];
    bannerTouchLastX.current = touch?.clientX ?? null;
  };

  const handleBannerTouchEnd = () => {
    if (bannerTouchStartX.current === null || bannerTouchLastX.current === null) {
      bannerTouchStartX.current = null;
      bannerTouchLastX.current = null;
      return;
    }
    const delta = bannerTouchLastX.current - bannerTouchStartX.current;
    if (Math.abs(delta) > 40) {
      bumpBannerIndex(delta > 0 ? -1 : 1);
    }
    bannerTouchStartX.current = null;
    bannerTouchLastX.current = null;
  };

  useEffect(() => {
    if (bannerIndex >= banners.length) {
      setBannerIndex(0);
    }
  }, [banners.length, bannerIndex]);

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners]);

  return (
    <div className="page">
      <section className="section hero full-bleed">
        {bannerTarget.isExternal ? (
          <a
            href={bannerTarget.link}
            className="wc-banner"
            onTouchStart={handleBannerTouchStart}
            onTouchMove={handleBannerTouchMove}
            onTouchEnd={handleBannerTouchEnd}
          >
            <div className="wc-banner-media">
              {bannerTarget.image ? (
                <img src={bannerTarget.image} alt={bannerTarget.title || "banner"} />
              ) : (
                <div className="wc-banner-fallback" />
              )}
            </div>
            {bannerTarget.useContent ? (
              <div className="wc-banner-content wc-content">
                <span className="badge badge-hot">TODAY</span>
                <h2>{bannerTarget.title}</h2>
                <p>{bannerTarget.subtitle}</p>
              </div>
            ) : null}
            {!bannerTarget.useContent && bannerTarget.title ? (
              <div className="wc-banner-title">{bannerTarget.title}</div>
            ) : null}
          </a>
        ) : (
          <Link
            to={bannerTarget.link}
            className="wc-banner"
            onTouchStart={handleBannerTouchStart}
            onTouchMove={handleBannerTouchMove}
            onTouchEnd={handleBannerTouchEnd}
          >
            <div className="wc-banner-media">
              {bannerTarget.image ? (
                <img src={bannerTarget.image} alt={bannerTarget.title || "banner"} />
              ) : (
                <div className="wc-banner-fallback" />
              )}
            </div>
            {bannerTarget.useContent ? (
              <div className="wc-banner-content wc-content">
                <span className="badge badge-hot">TODAY</span>
                <h2>{bannerTarget.title}</h2>
                <p>{bannerTarget.subtitle}</p>
              </div>
            ) : null}
            {!bannerTarget.useContent && bannerTarget.title ? (
              <div className="wc-banner-title">{bannerTarget.title}</div>
            ) : null}
          </Link>
        )}
      </section>

      <div className="wc-content">
        <section className="section list">
          <div className="category-page">
            <div className="worldcup-gap" aria-hidden="true" />
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
            <section className="section intro">
              <div className="worldcup-hero">
                <div>
                  <h2>오늘도 만나서 반가워! 추천 콘텐츠를 즐겨봐 🎵</h2>
                  <p>월드컵 게임과 테스트로 기분 전환해 보세요.</p>
                </div>
                <div className="hero-emoji">🐣</div>
              </div>
            </section>
            <section className="section">
              <CategorySection
                title="오늘의 추천"
                variant="small"
                games={todayPick}
                fallbackLabel="추천 준비중"
                onCardClick={todayPick.length > 0 ? resolveGameLink : null}
                getMeta={() => ({})}
              />
            </section>
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
            <div ref={fortuneRef}>
              <CategorySection
                title="운세"
                variant="small"
                games={fortuneGames}
                fallbackLabel="운게임 준비중"
                onCardClick={() => "/saju"}
                getMeta={() => ({})}
              />
            </div>
            <div ref={psychoRef} className="psy-section">
              <CategorySection
                title="심리 테스트"
                variant="small"
                games={resolvedPsychoGames}
                fallbackLabel="심리테스트 준비중"
                onCardClick={(game) => `/psycho/${game.slug || "major-arcana"}`}
                getMeta={() => ({})}
              />
            </div>
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
const psychoFallbackGames: Game[] = [];
