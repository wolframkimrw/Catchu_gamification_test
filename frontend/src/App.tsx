import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { WorldcupDetailPage } from "./pages/WorldcupDetailPage";
import { WorldcupListPage } from "./pages/WorldcupListPage";
import { WorldcupPlayPage } from "./pages/WorldcupPlayPage";
import { WorldcupArenaPage } from "./pages/WorldcupArenaPage";
import { SajuLuckPage } from "./pages/SajuLuckPage";

function NavLinks() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="app-nav">
      <Link className={isActive("/worldcup") ? "active" : ""} to="/worldcup">
        월드컵
      </Link>
    </nav>
  );
}

function Layout() {
  const location = useLocation();
  const isArena = location.pathname.includes("/arena");

  return (
    <div className="app-viewport">
      <div className={`app-shell ${isArena ? "app-shell-full" : ""}`}>
        <header className={`app-header ${isArena ? "" : "app-header-fixed"}`}>
          <div className="app-left">
            <div className="app-logo">캐치유 테스트</div>
            <NavLinks />
          </div>
          <div className="app-actions">🔍 ☰</div>
        </header>
        <main className={isArena ? "app-main-full" : "app-main"}>
          <Routes>
            <Route path="/worldcup" element={<WorldcupListPage />} />
            <Route path="/worldcup/:gameId" element={<WorldcupDetailPage />} />
            <Route path="/worldcup/:gameId/play" element={<WorldcupPlayPage />} />
            <Route path="/worldcup/:gameId/arena" element={<WorldcupArenaPage />} />
            <Route path="/saju" element={<SajuLuckPage />} />
            <Route path="*" element={<Navigate to="/worldcup" replace />} />
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
