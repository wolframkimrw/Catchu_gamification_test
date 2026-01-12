import { useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { WorldcupDetailPage } from "./pages/WorldcupDetailPage";
import { WorldcupListPage } from "./pages/WorldcupListPage";
import { WorldcupPlayPage } from "./pages/WorldcupPlayPage";
import { WorldcupArenaPage } from "./pages/WorldcupArenaPage";
import { SajuLuckPage } from "./pages/SajuLuckPage";

function Layout() {
  const location = useLocation();
  const isArena = location.pathname.includes("/arena");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <button className="app-icon" type="button" aria-label="로그인">
              👤
            </button>
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
            <Route path="/saju" element={<SajuLuckPage />} />
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
