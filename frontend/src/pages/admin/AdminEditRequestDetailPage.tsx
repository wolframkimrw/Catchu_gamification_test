import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import {
  approveAdminEditRequest,
  fetchAdminEditRequestDetail,
  rejectAdminEditRequest,
  type AdminEditRequestDetail,
} from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AdminEditRequestDetail };

export function AdminEditRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = Number(requestId);
    if (!Number.isFinite(parsed)) {
      setState({ status: "error", message: "요청 ID가 올바르지 않습니다." });
      return;
    }
    fetchAdminEditRequestDetail(parsed)
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => {
        if (err instanceof ApiError) {
          setState({ status: "error", message: err.meta.message || "요청을 불러오지 못했습니다." });
        } else {
          setState({ status: "error", message: "요청을 불러오지 못했습니다." });
        }
      });
  }, [requestId]);

  const handleApprove = async () => {
    if (state.status !== "ready") {
      return;
    }
    setActionError(null);
    try {
      await approveAdminEditRequest(state.data.id);
      setState((prev) =>
        prev.status === "ready"
          ? { ...prev, data: { ...prev.data, status: "APPROVED" } }
          : prev
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.meta.message || "승인 처리에 실패했습니다.");
      } else {
        setActionError("승인 처리에 실패했습니다.");
      }
    }
  };

  const handleReject = async () => {
    if (state.status !== "ready") {
      return;
    }
    setActionError(null);
    try {
      await rejectAdminEditRequest(state.data.id);
      setState((prev) =>
        prev.status === "ready"
          ? { ...prev, data: { ...prev.data, status: "REJECTED" } }
          : prev
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.meta.message || "반려 처리에 실패했습니다.");
      } else {
        setActionError("반려 처리에 실패했습니다.");
      }
    }
  };

  return (
    <AdminShell
      active="requests"
      title="수정 요청 상세"
      description="현재 게임과 요청 변경 내용을 비교합니다."
      headerTop={
        <Link className="admin-back-link" to="/admin/requests">
          목록으로
        </Link>
      }
    >
      {state.status === "loading" ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : state.status === "error" ? (
        <div className="admin-games-error">{state.message}</div>
      ) : (
        <>
          {actionError ? <div className="admin-games-error">{actionError}</div> : null}
          <section className="admin-games-list">
            {state.data.payload.title !== state.data.game.title ? (
              <div className="admin-games-card">
                <div className="admin-games-info">
                  <div className="admin-games-thumb">
                    <div className="admin-games-thumb-placeholder">제목</div>
                  </div>
                  <div className="admin-item-fields">
                    <div className="admin-games-meta">현재</div>
                    <div className="admin-games-title">{state.data.game.title || "-"}</div>
                  </div>
                  <div className="admin-item-fields">
                    <div className="admin-games-meta">요청</div>
                    <div className="admin-games-title">{state.data.payload.title || "-"}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {state.data.payload.description !== state.data.game.description ? (
              <div className="admin-games-card">
                <div className="admin-games-info">
                  <div className="admin-games-thumb">
                    <div className="admin-games-thumb-placeholder">설명</div>
                  </div>
                  <div className="admin-item-fields">
                    <div className="admin-games-meta">현재</div>
                    <div className="admin-games-meta">{state.data.game.description || "-"}</div>
                  </div>
                  <div className="admin-item-fields">
                    <div className="admin-games-meta">요청</div>
                    <div className="admin-games-meta">{state.data.payload.description || "-"}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {state.data.payload.thumbnail_url !== state.data.game.thumbnail_image_url ? (
              <div className="admin-games-card">
                <div className="admin-games-info">
                  <div className="admin-games-thumb">
                    <div className="admin-games-thumb-placeholder">썸네일</div>
                  </div>
                  <div className="admin-item-fields">
                    <div className="admin-games-meta">현재</div>
                    <div className="admin-games-thumb">
                      {state.data.game.thumbnail_image_url ? (
                        <img src={state.data.game.thumbnail_image_url} alt={state.data.game.title} />
                      ) : (
                        <div className="admin-games-thumb-placeholder">NO</div>
                      )}
                    </div>
                  </div>
                  <div className="admin-item-fields">
                    <div className="admin-games-meta">요청</div>
                    <div className="admin-games-thumb">
                      {state.data.payload.thumbnail_url ? (
                        <img src={state.data.payload.thumbnail_url} alt={state.data.payload.title || "thumbnail"} />
                      ) : (
                        <div className="admin-games-thumb-placeholder">NO</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {(() => {
              const currentItems = state.data.game.items;
              const requestItems = state.data.payload.items ?? [];
              const requestIds = new Set(requestItems.map((item) => item.id).filter(Boolean));
              const diffs: Array<{
                key: string;
                currentItem?: typeof currentItems[number];
                requestItem?: typeof requestItems[number];
              }> = [];

              currentItems.forEach((item) => {
                if (!requestIds.has(item.id)) {
                  diffs.push({ key: `removed-${item.id}`, currentItem: item });
                }
              });

              requestItems.forEach((item, index) => {
                if (!item.id) {
                  diffs.push({ key: `added-${index}`, requestItem: item });
                  return;
                }
                const current = currentItems.find((currentItem) => currentItem.id === item.id);
                if (!current) {
                  diffs.push({ key: `added-${item.id}`, requestItem: item });
                  return;
                }
                const nameChanged = (item.name || "") !== (current.name || "");
                const imageChanged = (item.image_url || "") !== (current.file_name || "");
                if (nameChanged || imageChanged) {
                  diffs.push({ key: `updated-${item.id}`, currentItem: current, requestItem: item });
                }
              });

              return diffs.map((diff, index) => (
                <div key={`${diff.key}-${index}`} className="admin-games-card">
                  <div className="admin-games-info">
                    <div className="admin-games-thumb">
                      <div className="admin-games-thumb-placeholder">#{index + 1}</div>
                    </div>
                    <div className="admin-item-fields">
                      <div className="admin-games-meta">현재</div>
                      <div className="admin-games-thumb">
                        {diff.currentItem?.file_name ? (
                          <img src={diff.currentItem.file_name} alt={diff.currentItem.name || "item"} />
                        ) : (
                          <div className="admin-games-thumb-placeholder">NO</div>
                        )}
                      </div>
                      <div className="admin-games-title">{diff.currentItem?.name || "-"}</div>
                    </div>
                    <div className="admin-item-fields">
                      <div className="admin-games-meta">요청</div>
                      <div className="admin-games-thumb">
                        {diff.requestItem?.image_url ? (
                          <img src={diff.requestItem.image_url} alt={diff.requestItem.name || "item"} />
                        ) : (
                          <div className="admin-games-thumb-placeholder">NO</div>
                        )}
                      </div>
                      <div className="admin-games-title">{diff.requestItem?.name || "-"}</div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </section>

          <div className="admin-games-actions">
            <button type="button" onClick={handleApprove} disabled={state.data.status !== "PENDING"}>
              승인
            </button>
            <button
              type="button"
              className="danger"
              onClick={handleReject}
              disabled={state.data.status !== "PENDING"}
            >
              반려
            </button>
          </div>
        </>
      )}
    </AdminShell>
  );
}
