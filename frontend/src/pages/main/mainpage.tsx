// src/pages/main/mainpage.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
  // type MouseEvent,
  type PointerEvent,
} from "react";
import { Link } from "react-router-dom";
import "../games/worldcup.css";
import type { BannerItem, Game } from "../../api/games";
import { fetchBanners, fetchGamesList, fetchTodayPick } from "../../api/games";




export function WorldcupListPage() {
  const [apiGames, setApiGames] = useState<Game[]>([]);
  const [worldcupApiGames, setWorldcupApiGames] = useState<Game[]>([]);
  const [todayPick, setTodayPick] = useState<Game[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [gameTopBanners, setGameTopBanners] = useState<BannerItem[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerPointer = useRef({
    isDown: false,
    startX: 0,
    lastX: 0,
  });
  const bannerTouchStartX = useRef<number | null>(null);
  const bannerTouchLastX = useRef<number | null>(null);
  const bannerDragDistanceRef = useRef(0);
  const bannerBlockClickRef = useRef(false);
  const bannerTrackRef = useRef<HTMLDivElement | null>(null);
  const [bannerDragOffset, setBannerDragOffset] = useState(0);
  const bannerTimerRef = useRef<number | null>(null);
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
    fetchBanners("GAME_TOP")
      .then((items) => {
        console.log("GAME_TOP 배너:", items);
        setGameTopBanners(items);
      })
      .catch((err) => {
        console.error("GAME_TOP 배너 로드 실패:", err);
        setGameTopBanners([]);
      });
  }, []);

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

  const bannerSlides = useMemo(() => {
    if (banners.length > 0) {
      return banners.map((banner) => {
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
      });
    }
    const worldcup = worldcupGames[0];
    if (worldcup) {
      return [
        {
          title: worldcup.title,
          subtitle: "오늘의 월드컵 추천",
          image: worldcup.thumbnail,
          link: `/worldcup/${worldcup.id}/play`,
          isExternal: false,
          useContent: true,
        },
      ];
    }
    const fortune = fortuneGames[0];
    if (fortune) {
      return [
        {
          title: fortune.title,
          subtitle: "오늘의 운게임",
          image: fortune.thumbnail,
          link: "/saju",
          isExternal: false,
          useContent: true,
        },
      ];
    }
    return [
      {
        title: "오늘의 사주 운세",
        subtitle: "오늘의 운게임",
        image: "",
        link: "/saju",
        isExternal: false,
        useContent: true,
      },
    ];
  }, [banners, fortuneGames, worldcupGames]);

  const resetBannerTimer = useCallback(() => {
    if (bannerTimerRef.current) {
      window.clearInterval(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    if (bannerSlides.length <= 1) {
      return;
    }
    bannerTimerRef.current = window.setInterval(() => {
      setBannerIndex((prev) => {
        const len = bannerSlides.length;
        // 마지막에서 처음으로 순환
        return (prev + 1) % len;
      });
    }, 5000);
  }, [bannerSlides.length]);

  useEffect(() => {
    setBannerIndex(0);
    resetBannerTimer();
  }, [bannerSlides.length, resetBannerTimer]);

  const bumpBannerIndexByDrag = (direction: number) => {
    if (bannerSlides.length <= 1) {
      return;
    }
    setBannerIndex((prev) => {
      const len = bannerSlides.length;
      const next = prev + direction;
      // 순환 처리
      if (next < 0) return len - 1;
      if (next >= len) return 0;
      return next;
    });
    resetBannerTimer();
  };

  const handleBannerPointerDown = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (event.pointerType === "touch") {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    bannerPointer.current = {
      isDown: true,
      startX: event.clientX,
      lastX: event.clientX,
    };
    bannerDragDistanceRef.current = 0;
    setBannerDragOffset(0);
    bannerBlockClickRef.current = false;
  };

  const handleBannerPointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (event.pointerType === "touch") {
      return;
    }
    if (!bannerPointer.current.isDown) {
      return;
    }
    event.preventDefault();
    const delta = event.clientX - bannerPointer.current.startX;
    bannerPointer.current.lastX = event.clientX;
    bannerDragDistanceRef.current = Math.abs(delta);
    setBannerDragOffset(delta);
  };

  const handleBannerPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      return;
    }
    if (!bannerPointer.current.isDown) {
      return;
    }
    const delta = bannerPointer.current.lastX - bannerPointer.current.startX;
    setBannerDragOffset(0);
    if (Math.abs(delta) > 40) {
      bumpBannerIndexByDrag(delta > 0 ? -1 : 1);
    }
    bannerBlockClickRef.current = bannerDragDistanceRef.current > 10;
    bannerPointer.current.isDown = false;
    window.setTimeout(() => {
      bannerBlockClickRef.current = false;
    }, 0);
  };

  const handleBannerTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    bannerTouchStartX.current = touch?.clientX ?? null;
    bannerTouchLastX.current = touch?.clientX ?? null;
    bannerBlockClickRef.current = false;
  };

  const handleBannerTouchMove = (event: TouchEvent<HTMLDivElement>) => {
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
    bannerBlockClickRef.current = Math.abs(delta) > 10;
    if (Math.abs(delta) > 40) {
      bumpBannerIndexByDrag(delta > 0 ? -1 : 1);
    }
    bannerTouchStartX.current = null;
    bannerTouchLastX.current = null;
    window.setTimeout(() => {
      bannerBlockClickRef.current = false;
    }, 0);
  };

  const bannerDisplayIndex = bannerIndex;

  useEffect(() => {
    if (bannerSlides.length <= 1) {
      return;
    }
    resetBannerTimer();
    return () => {
      if (bannerTimerRef.current) {
        window.clearInterval(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
    };
  }, [bannerSlides.length, resetBannerTimer]);

  return (
    <div className="page">
      <section className="section hero full-bleed">
        <div className="wc-banner-slider">
          <div
            className="wc-banner-track"
            ref={bannerTrackRef}
            style={{
              transform: `translateX(calc(-${bannerIndex * 100}% + ${bannerDragOffset}px))`,
            }}
            onPointerDown={handleBannerPointerDown}
            onPointerMove={handleBannerPointerMove}
            onPointerUp={handleBannerPointerEnd}
            onPointerCancel={handleBannerPointerEnd}
            onTouchStart={handleBannerTouchStart}
            onTouchMove={handleBannerTouchMove}
            onTouchEnd={handleBannerTouchEnd}
            onClickCapture={(event) => {
              if (bannerBlockClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
                bannerBlockClickRef.current = false;
              }
            }}
            onDragStart={(event) => event.preventDefault()}
          >
            {bannerSlides.map((banner, index) => {
              const bannerCard = (
                <>
                  <div className="wc-banner-media">
                    {banner.image ? (
                      <img
                        src={banner.image}
                        alt={banner.title || "banner"}
                        draggable={false}
                      />
                    ) : (
                      <div className="wc-banner-fallback" />
                    )}
                  </div>
                  {banner.useContent ? (
                    <div className="wc-banner-content wc-content">
                      <span className="badge badge-hot">TODAY</span>
                      <h2>{banner.title}</h2>
                      <p>{banner.subtitle}</p>
                    </div>
                  ) : null}
                  {!banner.useContent && banner.title ? (
                    <div className="wc-banner-title">{banner.title}</div>
                  ) : null}
                </>
              );
              return (
                <div key={`banner-${index}`} className="wc-banner-slide">
                  {banner.isExternal ? (
                    <a href={banner.link} className="wc-banner">
                      {bannerCard}
                    </a>
                  ) : (
                    <Link to={banner.link} className="wc-banner">
                      {bannerCard}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          {bannerSlides.length > 1 ? (
            <>
              <div className="wc-banner-dots">
                {bannerSlides.map((_, index) => (
                  <button
                    key={`banner-dot-${index}`}
                    type="button"
                    className={`wc-banner-dot ${index === bannerDisplayIndex ? "active" : ""}`}
                    aria-label={`배너 ${index + 1}`}
                    onClick={() => {
                      setBannerIndex(index);
                      resetBannerTimer();
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
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
              {gameTopBanners.length > 0 ? (
                <div className="worldcup-hero" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="wc-banner-slider" style={{ width: "100%" }}>
                    <div className="wc-banner-track" style={{ display: "flex", gap: "0" }}>
                      {gameTopBanners.map((banner) => (
                        <div key={banner.id} className="wc-banner-slide" style={{ flex: "0 0 100%" }}>
                          {banner.link_type === "GAME" && banner.game ? (
                            <Link
                              to={resolveGameLink({
                                id: banner.game.id,
                                title: banner.game.title,
                                slug: banner.game.slug,
                                type: banner.game.type,
                                thumbnail: "",
                              })}
                              className="wc-banner"
                              style={{ margin: 0, borderRadius: "16px" }}
                            >
                              <div className="wc-banner-media" style={{ aspectRatio: "auto", maxHeight: "120px" }}>
                                <img src={banner.image_url} alt={banner.name} draggable={false} style={{ objectFit: "contain", maxHeight: "100%" }} />
                              </div>
                            </Link>
                          ) : (
                            <a
                              href={banner.link_url || "/"}
                              className="wc-banner"
                              target={banner.link_url?.startsWith("http") ? "_blank" : undefined}
                              rel={banner.link_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                              style={{ margin: 0, borderRadius: "16px" }}
                            >
                              <div className="wc-banner-media" style={{ aspectRatio: "auto", maxHeight: "120px" }}>
                                <img src={banner.image_url} alt={banner.name} draggable={false} style={{ objectFit: "contain", maxHeight: "100%" }} />
                              </div>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="worldcup-hero">
                  <div>
                    <h2>오늘도 만나서 반가워! 추천 콘텐츠를 즐겨봐 🎵</h2>
                    <p>월드컵 게임과 테스트로 기분 전환해 보세요.</p>
                  </div>
                  <div className="hero-emoji">🐣</div>
                </div>
              )}
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
  const dragStateRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
  });
  const railDragDistanceRef = useRef(0);
  const railBlockClickRef = useRef(false);
  const handleRailPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const rail = event.currentTarget;
    dragStateRef.current = {
      isDown: true,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
    };
    railDragDistanceRef.current = 0;
    railBlockClickRef.current = false;
    rail.classList.add("is-dragging");
  };
  const handleRailPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDown) {
      return;
    }
    event.preventDefault();
    const rail = event.currentTarget;
    const delta = event.clientX - dragStateRef.current.startX;
    railDragDistanceRef.current = Math.abs(delta);
    rail.scrollLeft = dragStateRef.current.scrollLeft - delta;
  };
  const handleRailPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    dragStateRef.current.isDown = false;
    event.currentTarget.classList.remove("is-dragging");
    railBlockClickRef.current = railDragDistanceRef.current > 10;
    window.setTimeout(() => {
      railBlockClickRef.current = false;
    }, 0);
  };

  return (
    <section className="cat-section">
      <div className="cat-header">
        <h3>{title}</h3>
      </div>
      <div
        className={`cat-grid ${variant} h-rail`}
        onPointerDown={handleRailPointerDown}
        onPointerMove={handleRailPointerMove}
        onPointerUp={handleRailPointerEnd}
        onPointerCancel={handleRailPointerEnd}
        onClickCapture={(event) => {
          if (railBlockClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            railBlockClickRef.current = false;
          }
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        <div className="h-rail-track">
          {hasGames
            ? games.map((game) => {
              const meta = getMeta(game);
              const content = (
                <>
                  <div className="gc-thumb">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.title} draggable={false} />
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
