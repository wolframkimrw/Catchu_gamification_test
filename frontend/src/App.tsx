import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { WorldcupDetailPage } from "./pages/games/WorldcupDetailPage";
import { WorldcupListPage } from "./pages/main/mainpage";
import { WorldcupPlayPage } from "./pages/games/WorldcupPlayPage";
import { WorldcupArenaPage } from "./pages/games/WorldcupArenaPage";
import { WorldcupResultPage } from "./pages/games/WorldcupResultPage";
import { WorldcupCreatePage } from "./pages/games/WorldcupCreatePage";
import { MyGameEditListPage } from "./pages/games/MyGameEditListPage";
import { MyGameEditRequestPage } from "./pages/games/MyGameEditRequestPage";
import { SajuLuckPage } from "./pages/games/SajuLuckPage";
import { PsychoTestPage } from "./pages/games/PsychoTestPage";
import { LoginPage } from "./pages/loginpage";
import { AdminGamesPage } from "./pages/admin/AdminGamesPage";
import { AdminEditRequestsPage } from "./pages/admin/AdminEditRequestsPage";
import { AdminEditRequestDetailPage } from "./pages/admin/AdminEditRequestDetailPage";
import { AdminGameDetailPage } from "./pages/admin/AdminGameDetailPage";
import { AdminLogsPage } from "./pages/admin/AdminLogsPage";
import { AdminLogDetailPage } from "./pages/admin/AdminLogDetailPage";
import { AdminTodayPickPage } from "./pages/admin/AdminTodayPickPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { AdminBannersPage } from "./pages/admin/AdminBannersPage";
import { useAuthUser } from "./hooks/useAuthUser";
import { SearchPage } from "./pages/common/searchpage";
import { MyInfoPage } from "./pages/common/my-info";

function Layout() {
  const location = useLocation();
  const isArena = location.pathname.includes("/arena");
  const isInGame = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/saju") || path.startsWith("/psycho")) {
      return true;
    }
    if (path.startsWith("/worldcup/")) {
      return path.includes("/play") || path.includes("/arena") || path.includes("/result");
    }
    return false;
  }, [location.pathname]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { user, logout } = useAuthUser();

  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!userMenuRef.current) {
        return;
      }
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [isUserMenuOpen]);

  return (
    <div className="app-viewport">
      <div className="app-shell">
        <header className={`app-header ${isArena ? "" : "app-header-fixed"}`}>
          <button
            className="app-menu"
            type="button"
            aria-label="메뉴 열기"
            onClick={() => setIsMenuOpen(true)}
          >
            ☰
          </button>
          <Link className="app-title" to="/">
            캐치유 테스트
          </Link>
          <div className="app-actions">
            {!isInGame ? (
              <Link className="app-icon app-icon-button" to="/search" aria-label="검색">
                <span className="app-icon-svg" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation">
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="16.2" y1="16.2" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
              </Link>
            ) : null}
            <div className="app-user" ref={userMenuRef}>
              {user ? (
                <button
                  className="app-icon app-icon-button"
                  type="button"
                  aria-label="계정 메뉴"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                >
                  <span className="app-icon-svg" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="presentation">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                      <path
                        d="M4 20c1.7-4 5.1-6 8-6s6.3 2 8 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>
              ) : (
                <Link className="app-icon app-icon-button" to="/login" aria-label="로그인">
                  <span className="app-icon-svg" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="presentation">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                      <path
                        d="M4 20c1.7-4 5.1-6 8-6s6.3 2 8 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </Link>
              )}
              {user && isUserMenuOpen ? (
                <div className="app-user-menu" role="menu">
                  <div className="app-user-name">{user.name}</div>
                  <Link
                    to="/me"
                    className="app-user-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    내정보
                  </Link>
                  <button
                    type="button"
                    className="app-user-item danger"
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                  >
                    로그아웃
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {isMenuOpen ? (
          <div className="app-menu-overlay" onClick={() => setIsMenuOpen(false)}>
            <aside className="app-menu-panel" onClick={(event) => event.stopPropagation()}>
              <div className="app-menu-header">
                <span />
                <button
                  type="button"
                  className="app-menu-close"
                  aria-label="메뉴 닫기"
                  onClick={() => setIsMenuOpen(false)}
                >
                  ✕
                </button>
              </div>
              <nav className="app-menu-nav">
                <Link to="/" onClick={() => setIsMenuOpen(false)}>
                  홈
                </Link>
                <Link to="/worldcup/create" onClick={() => setIsMenuOpen(false)}>
                  월드컵 만들기
                </Link>
                {user ? (
                  <Link to="/my/games" onClick={() => setIsMenuOpen(false)}>
                    내 게임
                  </Link>
                ) : null}
                {user?.is_staff ? (
                  <Link to="/admin/games" onClick={() => setIsMenuOpen(false)}>
                    관리자
                  </Link>
                ) : null}
              </nav>
            </aside>
          </div>
        ) : null}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<WorldcupListPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/worldcup/:gameId" element={<WorldcupDetailPage />} />
            <Route path="/worldcup/:gameId/play" element={<WorldcupPlayPage />} />
            <Route path="/worldcup/:gameId/arena" element={<WorldcupArenaPage />} />
            <Route path="/worldcup/:gameId/result" element={<WorldcupResultPage />} />
            <Route path="/worldcup/create" element={<WorldcupCreatePage />} />
            <Route path="/my/games" element={<MyGameEditListPage />} />
            <Route path="/my/games/:gameId/edit" element={<MyGameEditRequestPage />} />
            <Route path="/me" element={<MyInfoPage />} />
            <Route path="/saju" element={<SajuLuckPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/psycho/:slug" element={<PsychoTestPage />} />
            <Route path="/admin/games" element={<AdminGamesPage />} />
            <Route path="/admin/games/:gameId" element={<AdminGameDetailPage />} />
            <Route path="/admin/today-pick" element={<AdminTodayPickPage />} />
            <Route path="/admin/banners" element={<AdminBannersPage />} />
            <Route path="/admin/requests" element={<AdminEditRequestsPage />} />
            <Route path="/admin/requests/:requestId" element={<AdminEditRequestDetailPage />} />
            <Route path="/admin/logs" element={<AdminLogsPage />} />
            <Route path="/admin/logs/:gameId" element={<AdminLogDetailPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
