import { useEffect, useMemo, useState } from "react";
import "./admin-games.css";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/http";
import type { AdminUser } from "../../api/accounts";
import { fetchAdminUsers } from "../../api/accounts";
import { fetchAdminChoiceLogs, type AdminChoiceLog } from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [choiceLogs, setChoiceLogs] = useState<AdminChoiceLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([fetchAdminUsers(), fetchAdminChoiceLogs()])
      .then(([userData, choiceData]) => {
        setUsers(userData);
        setChoiceLogs(choiceData);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "유저 목록을 불러오지 못했습니다.");
        } else {
          setError("유저 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const usageByUser = useMemo(() => {
    const map = new Map<
      number,
      { starts: number; lastStartedAt: string | null; gameIds: Set<number> }
    >();
    choiceLogs.forEach((log) => {
      if (!log.user?.id) {
        return;
      }
      const entry = map.get(log.user.id) ?? {
        starts: 0,
        lastStartedAt: null,
        gameIds: new Set<number>(),
      };
      entry.starts += 1;
      entry.gameIds.add(log.game.id);
      if (!entry.lastStartedAt || new Date(log.started_at) > new Date(entry.lastStartedAt)) {
        entry.lastStartedAt = log.started_at;
      }
      map.set(log.user.id, entry);
    });
    return map;
  }, [choiceLogs]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.is_staff !== b.is_staff) {
        return a.is_staff ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [users]);

  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : "-";

  return (
    <AdminShell active="users" title="유저" description="스태프 우선, 최근 가입자 순으로 표시됩니다.">
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="admin-games-empty">유저가 없습니다.</div>
      ) : (
        <div className="admin-games-list">
          {sortedUsers.map((user) => {
            const usage = usageByUser.get(user.id);
            const starts = usage?.starts ?? 0;
            const games = usage?.gameIds.size ?? 0;
            const lastStartedAt = usage?.lastStartedAt ?? null;
            return (
              <div key={user.id} className="admin-games-card">
                <Link to={`/admin/users/${user.id}`} className="admin-card-link">
                  <div>
                    <div className="admin-games-title">{user.name}</div>
                    <div className="admin-games-meta">
                      <span>{user.email}</span>
                      <span>{user.is_staff ? "스태프" : "유저"}</span>
                      <span>{user.is_active ? "활성" : "비활성"}</span>
                    </div>
                    <div className="admin-games-owner">
                      {user.profile ? `닉네임: ${user.profile.nickname}` : "프로필 없음"}
                    </div>
                    <div className="admin-games-owner">가입일: {formatDateTime(user.created_at)}</div>
                    <div className="admin-user-dashboard">
                      <div className="admin-user-dashboard-title">이용 내역</div>
                      <div className="admin-log-summary admin-user-summary">
                        <div>
                          <strong>{starts}</strong>
                          <span>게임 시작</span>
                        </div>
                        <div>
                          <strong>{games}</strong>
                          <span>참여 게임</span>
                        </div>
                        <div>
                          <strong>{formatDateTime(lastStartedAt)}</strong>
                          <span>최근 이용</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
