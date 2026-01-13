import { useEffect, useState } from "react";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import type { AdminUser } from "../../api/accounts";
import { fetchAdminUsers } from "../../api/accounts";
import { AdminShell } from "../../components/AdminShell";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminUsers()
      .then((data) => setUsers(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "유저 목록을 불러오지 못했습니다.");
        } else {
          setError("유저 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AdminShell active="users" title="유저 프로필" description="최근 가입자 기준으로 표시됩니다.">
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="admin-games-empty">유저가 없습니다.</div>
      ) : (
        <div className="admin-games-list">
          {users.map((user) => (
            <div key={user.id} className="admin-games-card">
              <div>
                <div className="admin-games-title">{user.name}</div>
                <div className="admin-games-meta">
                  <span>{user.email}</span>
                  <span>{user.is_staff ? "STAFF" : "USER"}</span>
                  <span>{user.is_active ? "ACTIVE" : "INACTIVE"}</span>
                </div>
                <div className="admin-games-owner">
                  {user.profile
                    ? `Lv.${user.profile.level} · EXP ${user.profile.exp}`
                    : "프로필 없음"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
