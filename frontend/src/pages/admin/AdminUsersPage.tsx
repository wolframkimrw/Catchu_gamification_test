import { useEffect, useMemo, useState } from "react";
import "./admin-games.css";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/http";
import type { AdminUser } from "../../api/accounts";
import { fetchAdminUsers } from "../../api/accounts";
import { AdminShell } from "../../components/AdminShell";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setVisibleCount(3);
    fetchAdminUsers()
      .then((userData) => {
        setUsers(userData);
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
        <>
          <div className="admin-games-list">
            {sortedUsers.slice(0, visibleCount).map((user) => {
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
                      <div className="admin-games-owner">
                        가입일: {formatDateTime(user.created_at)}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
          {sortedUsers.length > visibleCount ? (
            <button
              type="button"
              className="admin-log-more"
              onClick={() => setVisibleCount(sortedUsers.length)}
            >
              더보기
            </button>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
