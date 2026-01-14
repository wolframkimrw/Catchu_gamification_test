import { Link } from "react-router-dom";
import { useAuthUser } from "../hooks/useAuthUser";
import "./AdminShell.css";

type AdminTabKey = "games" | "logs" | "users" | "requests";

type AdminShellProps = {
  active: AdminTabKey;
  title: string;
  description?: string;
  showTabs?: boolean;
  headerTop?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({
  active,
  title,
  description,
  showTabs = true,
  headerTop,
  children,
}: AdminShellProps) {
  const { user } = useAuthUser();

  if (!user?.is_staff) {
    return (
      <div className="admin-shell">
        <header className="admin-shell-header">
          <h1>관리자 전용</h1>
          <p>이 페이지는 관리자만 접근할 수 있습니다.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-shell-header">
        {headerTop ? <div className="admin-shell-header-top">{headerTop}</div> : null}
        {title ? <h1>{title}</h1> : null}
        {description ? <p>{description}</p> : null}
        {showTabs ? (
          <nav className="admin-shell-tabs">
            <Link className={active === "games" ? "active" : ""} to="/admin/games">
              게임 관리
            </Link>
            <Link className={active === "requests" ? "active" : ""} to="/admin/requests">
              수정 요청
            </Link>
            <Link className={active === "logs" ? "active" : ""} to="/admin/logs">
              결과/로그
            </Link>
            <Link className={active === "users" ? "active" : ""} to="/admin/users">
              유저
            </Link>
          </nav>
        ) : null}
      </header>
      {children}
    </div>
  );
}
