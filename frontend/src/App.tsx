import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { WorldcupDetailPage } from "./pages/games/WorldcupDetailPage";
import { WorldcupListPage } from "./pages/main/mainpage";
import { WorldcupPlayPage } from "./pages/games/WorldcupPlayPage";
import { WorldcupArenaPage } from "./pages/games/WorldcupArenaPage";
import { WorldcupCreatePage } from "./pages/games/WorldcupCreatePage";
import { MyGameEditListPage } from "./pages/games/MyGameEditListPage";
import { MyGameEditRequestPage } from "./pages/games/MyGameEditRequestPage";
import { SajuLuckPage } from "./pages/games/SajuLuckPage";
import { LoginPage } from "./pages/loginpage";
import { AdminGamesPage } from "./pages/admin/AdminGamesPage";
import { AdminEditRequestsPage } from "./pages/admin/AdminEditRequestsPage";
import { AdminEditRequestDetailPage } from "./pages/admin/AdminEditRequestDetailPage";
import { AdminGameDetailPage } from "./pages/admin/AdminGameDetailPage";
import { AdminLogsPage } from "./pages/admin/AdminLogsPage";
import { AdminTopicsPage } from "./pages/admin/AdminTopicsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { useAuthUser } from "./hooks/useAuthUser";

function Layout() {
  const location = useLocation();
  const isArena = location.pathname.includes("/arena");
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
          <div className="app-title">캐치유 테스트</div>
          <div className="app-actions">
            <button className="app-icon" type="button" aria-label="검색">
              🔍
            </button>
            <div className="app-user" ref={userMenuRef}>
              {user ? (
                <button
                  className="app-icon"
                  type="button"
                  aria-label="계정 메뉴"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                >
                  👤
                </button>
              ) : (
                <Link className="app-icon" to="/login" aria-label="로그인">
                  👤
                </Link>
              )}
              {user && isUserMenuOpen ? (
                <div className="app-user-menu" role="menu">
                  <div className="app-user-name">{user.name}</div>
                  <button
                    type="button"
                    className="app-user-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    내정보
                  </button>
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
                <span>메뉴</span>
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
                {user?.is_staff ? (
                  <Link to="/admin/games" onClick={() => setIsMenuOpen(false)}>
                    관리자
                  </Link>
                ) : user ? (
                  <Link to="/my/games" onClick={() => setIsMenuOpen(false)}>
                    내 게임 수정
                  </Link>
                ) : null}
              </nav>
            </aside>
          </div>
        ) : null}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<WorldcupListPage />} />
            <Route path="/worldcup/:gameId" element={<WorldcupDetailPage />} />
            <Route path="/worldcup/:gameId/play" element={<WorldcupPlayPage />} />
            <Route path="/worldcup/:gameId/arena" element={<WorldcupArenaPage />} />
            <Route path="/worldcup/create" element={<WorldcupCreatePage />} />
            <Route path="/my/games" element={<MyGameEditListPage />} />
            <Route path="/my/games/:gameId/edit" element={<MyGameEditRequestPage />} />
            <Route path="/saju" element={<SajuLuckPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/games" element={<AdminGamesPage />} />
            <Route path="/admin/games/:gameId" element={<AdminGameDetailPage />} />
            <Route path="/admin/requests" element={<AdminEditRequestsPage />} />
            <Route path="/admin/requests/:requestId" element={<AdminEditRequestDetailPage />} />
            <Route path="/admin/topics" element={<AdminTopicsPage />} />
            <Route path="/admin/logs" element={<AdminLogsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
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
