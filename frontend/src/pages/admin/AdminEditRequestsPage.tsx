import { useEffect, useState } from "react";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import {
  approveAdminEditRequest,
  fetchAdminEditRequests,
  rejectAdminEditRequest,
  type AdminEditRequest,
} from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

export function AdminEditRequestsPage() {
  const [requests, setRequests] = useState<AdminEditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = () => {
    setIsLoading(true);
    setError(null);
    fetchAdminEditRequests()
      .then((data) => setRequests(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "요청 목록을 불러오지 못했습니다.");
        } else {
          setError("요청 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId: number) => {
    try {
      await approveAdminEditRequest(requestId);
      loadRequests();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "승인 처리에 실패했습니다.");
      } else {
        setError("승인 처리에 실패했습니다.");
      }
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await rejectAdminEditRequest(requestId);
      loadRequests();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "반려 처리에 실패했습니다.");
      } else {
        setError("반려 처리에 실패했습니다.");
      }
    }
  };

  return (
    <AdminShell
      active="requests"
      title="수정 요청"
      description="유저가 제출한 게임 수정 요청을 확인하고 승인/반려합니다."
    >
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : requests.length === 0 ? (
        <div className="admin-games-empty">대기 중인 요청이 없습니다.</div>
      ) : (
        <div className="admin-games-list">
          {requests.map((request) => (
            <div key={request.id} className="admin-games-card">
              <div className="admin-games-info">
                <div className="admin-games-title">{request.game.title}</div>
                <div className="admin-games-meta">
                  <span>요청자: {request.user.name}</span>
                  <span>요청일: {new Date(request.updated_at).toLocaleString()}</span>
                </div>
                <div className="admin-games-meta">
                  <span>요청 제목: {request.payload?.title || "-"}</span>
                  <span>아이템: {request.payload?.items?.length ?? 0}개</span>
                </div>
                {request.payload?.description ? (
                  <div className="admin-games-meta">
                    <span>요청 설명: {request.payload.description}</span>
                  </div>
                ) : null}
                <div className="admin-games-tags">
                  <span className="admin-badge badge-status is-active">승인 대기</span>
                </div>
                <div className="admin-games-actions">
                  <button type="button" onClick={() => handleApprove(request.id)}>
                    승인
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleReject(request.id)}
                  >
                    반려
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
