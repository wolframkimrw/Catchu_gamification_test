import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import { fetchAdminUsers, type AdminUser } from "../../api/accounts";
import { fetchAdminChoiceLogs, type AdminChoiceLog } from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const parsedUserId = Number(userId);
  const isValidUserId = Number.isFinite(parsedUserId);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [choiceLogs, setChoiceLogs] = useState<AdminChoiceLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isValidUserId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    Promise.all([fetchAdminUsers(), fetchAdminChoiceLogs()])
      .then(([userData, choiceData]) => {
        setUsers(userData);
        setChoiceLogs(choiceData);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "유저 정보를 불러오지 못했습니다.");
        } else {
          setError("유저 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [isValidUserId]);

  const user = useMemo(
    () => users.find((item) => item.id === parsedUserId) || null,
    [users, parsedUserId]
  );

  const userLogs = useMemo(
    () => choiceLogs.filter((log) => log.user?.id === parsedUserId),
    [choiceLogs, parsedUserId]
  );

  const summary = useMemo(() => {
    const gameIds = new Set<number>();
    let lastStartedAt: string | null = null;
    userLogs.forEach((log) => {
      gameIds.add(log.game.id);
      if (!lastStartedAt || new Date(log.started_at) > new Date(lastStartedAt)) {
        lastStartedAt = log.started_at;
      }
    });
    return {
      starts: userLogs.length,
      games: gameIds.size,
      lastStartedAt,
    };
  }, [userLogs]);

  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : "-";

  if (!isValidUserId) {
    return (
      <AdminShell
        active="users"
        title="유저"
        showTabs={false}
        headerTop={
          <Link className="admin-back-button" to="/admin/users">
            <span className="admin-back-icon" aria-hidden="true" />
            뒤로가기
          </Link>
        }
      >
        <div className="admin-games-error">유저 ID가 올바르지 않습니다.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      active="users"
      title=""
      description={user ? `유저 · ${user.name}` : "유저"}
      headerTop={
        <Link className="admin-back-button" to="/admin/users">
          <span className="admin-back-icon" aria-hidden="true" />
          뒤로가기
        </Link>
      }
    >
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : !user ? (
        <div className="admin-games-empty">유저 정보를 찾을 수 없습니다.</div>
      ) : (
        <>
          <div className="admin-game-info-card">
            <div className="admin-game-info-view">
              <div>
                <h2>{user.name}</h2>
                <p>
                  {user.email} · {user.is_staff ? "스태프" : "유저"} ·{" "}
                  {user.is_active ? "활성" : "비활성"}
                </p>
                <p>가입일: {formatDateTime(user.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="admin-log-summary">
            <div>
              <strong>{summary.starts}</strong>
              <span>게임 시작</span>
            </div>
            <div>
              <strong>{summary.games}</strong>
              <span>참여 게임</span>
            </div>
            <div>
              <strong>{formatDateTime(summary.lastStartedAt)}</strong>
              <span>최근 이용</span>
            </div>
          </div>

          <section className="admin-item-section">
            <div className="admin-item-header">
              <h3>이용 내역 목록</h3>
            </div>
          </section>
          {userLogs.length === 0 ? (
            <div className="admin-games-empty">이용 내역이 없습니다.</div>
          ) : (
            <div className="admin-log-list">
              {userLogs
                .slice()
                .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                .map((log) => (
                  <div key={log.id} className="admin-log-card admin-log-card-compact">
                    <div className="admin-log-lines">
                      <div className="admin-log-line">
                        <span className="admin-log-label">게임</span>
                        <span className="admin-log-value">{log.game.title}</span>
                      </div>
                      <div className="admin-log-line">
                        <span className="admin-log-label">시작날짜</span>
                        <span className="admin-log-value">{formatDateTime(log.started_at)}</span>
                      </div>
                      <div className="admin-log-line">
                        <span className="admin-log-label">IP</span>
                        <span className="admin-log-value">{log.ip_address || "-"}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
