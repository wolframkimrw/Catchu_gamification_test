import { useEffect, useState, type ReactNode } from "react";
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
  const parsedRequestId = Number(requestId);
  const isValidRequestId = Number.isFinite(parsedRequestId);
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidRequestId) {
      return;
    }
    fetchAdminEditRequestDetail(parsedRequestId)
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => {
        if (err instanceof ApiError) {
          setState({ status: "error", message: err.meta.message || "요청을 불러오지 못했습니다." });
        } else {
          setState({ status: "error", message: "요청을 불러오지 못했습니다." });
        }
      });
  }, [isValidRequestId, parsedRequestId]);

  if (!isValidRequestId) {
    return (
      <AdminShell
        active="requests"
        title="수정 요청 상세"
        showTabs={false}
        headerTop={
          <Link className="admin-back-button" to="/admin/requests">
            <span className="admin-back-icon" aria-hidden="true" />
            뒤로가기
          </Link>
        }
      >
        <div className="admin-games-error">요청 ID가 올바르지 않습니다.</div>
      </AdminShell>
    );
  }

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

  if (state.status === "loading") {
    return (
      <AdminShell
        active="requests"
        title="수정 요청 상세"
        showTabs={false}
        headerTop={
          <Link className="admin-back-button" to="/admin/requests">
            <span className="admin-back-icon" aria-hidden="true" />
            뒤로가기
          </Link>
        }
      >
        <div className="admin-games-empty">불러오는 중...</div>
      </AdminShell>
    );
  }

  if (state.status === "error") {
    return (
      <AdminShell
        active="requests"
        title="수정 요청 상세"
        showTabs={false}
        headerTop={
          <Link className="admin-back-button" to="/admin/requests">
            <span className="admin-back-icon" aria-hidden="true" />
            뒤로가기
          </Link>
        }
      >
        <div className="admin-games-error">{state.message}</div>
      </AdminShell>
    );
  }

  const normalizeText = (value?: string | null) => (value ?? "").trim();
  const normalizeUrl = (value?: string | null) => (value ?? "").trim();
  const normalizeImagePath = (value?: string | null) => {
    const normalized = normalizeUrl(value);
    if (!normalized) {
      return "";
    }
    const withoutQuery = normalized.split("?")[0] ?? normalized;
    const withoutProtocol = withoutQuery.replace(/^https?:\/\//, "");
    return withoutProtocol.toLowerCase();
  };

  const getImageBasename = (value?: string | null) => {
    const normalized = normalizeImagePath(value);
    if (!normalized) {
      return "";
    }
    const segments = normalized.split("/").filter(Boolean);
    return (segments[segments.length - 1] ?? normalized).toLowerCase();
  };

  const imagesMatch = (left?: string | null, right?: string | null) => {
    const leftPath = normalizeImagePath(left);
    const rightPath = normalizeImagePath(right);
    if (!leftPath && !rightPath) {
      return true;
    }
    if (leftPath && rightPath && leftPath === rightPath) {
      return true;
    }
    return getImageBasename(left) !== "" && getImageBasename(left) === getImageBasename(right);
  };

  const normalizedCurrentTitle = normalizeText(state.data.game.title);
  const normalizedPayloadTitle = normalizeText(state.data.payload.title);
  const normalizedCurrentDescription = normalizeText(state.data.game.description);
  const normalizedPayloadDescription = normalizeText(state.data.payload.description);
  const hasPayloadTitle = state.data.payload.title !== undefined && state.data.payload.title !== null;
  const hasPayloadDescription =
    state.data.payload.description !== undefined && state.data.payload.description !== null;
  const hasPayloadThumb =
    state.data.payload.thumbnail_url !== undefined && state.data.payload.thumbnail_url !== null;

  const renderTextValue = (text: string) => <div className="admin-change-value">{text || "-"}</div>;
  const renderMutedValue = (text: string) => <div className="admin-change-muted">{text}</div>;
  const renderThumbValue = (src: string | null | undefined, alt: string, emptyText: string) =>
    src ? (
      <div className="admin-games-thumb">
        <img src={src} alt={alt} />
      </div>
    ) : (
      renderMutedValue(emptyText)
    );

  const changeEntries: Array<{
    key: string;
    label: string;
    type: "update" | "add" | "remove";
    current: ReactNode;
    request: ReactNode;
  }> = [];

  if (hasPayloadTitle && normalizedPayloadTitle !== normalizedCurrentTitle) {
    changeEntries.push({
      key: "title",
      label: "제목",
      type: "update",
      current: renderTextValue(state.data.game.title || "-"),
      request: renderTextValue(state.data.payload.title || "-"),
    });
  }

  if (hasPayloadDescription && normalizedPayloadDescription !== normalizedCurrentDescription) {
    changeEntries.push({
      key: "description",
      label: "설명",
      type: "update",
      current: renderTextValue(state.data.game.description || "-"),
      request: renderTextValue(state.data.payload.description || "-"),
    });
  }

  if (hasPayloadThumb && !imagesMatch(state.data.game.thumbnail_image_url, state.data.payload.thumbnail_url)) {
    changeEntries.push({
      key: "thumbnail",
      label: "썸네일",
      type: "update",
      current: renderThumbValue(
        state.data.game.thumbnail_image_url,
        state.data.game.title || "thumbnail",
        "이미지 없음"
      ),
      request: renderThumbValue(
        state.data.payload.thumbnail_url,
        state.data.payload.title || "thumbnail",
        "이미지 없음"
      ),
    });
  }

  if (Array.isArray(state.data.payload.items)) {
    const currentItems = state.data.game.items;
    const requestItems = state.data.payload.items ?? [];
    const requestIds = new Set(requestItems.map((item) => item.id).filter(Boolean));
    const diffs: Array<{
      key: string;
      type: "add" | "remove" | "update";
      currentItem?: typeof currentItems[number];
      requestItem?: typeof requestItems[number];
    }> = [];

    currentItems.forEach((item) => {
      if (!requestIds.has(item.id)) {
        diffs.push({ key: `removed-${item.id}`, type: "remove", currentItem: item });
      }
    });

    requestItems.forEach((item, index) => {
      if (!item.id) {
        diffs.push({ key: `added-${index}`, type: "add", requestItem: item });
        return;
      }
      const current = currentItems.find((currentItem) => currentItem.id === item.id);
      if (!current) {
        diffs.push({ key: `added-${item.id}`, type: "add", requestItem: item });
        return;
      }
      const nameChanged = normalizeText(item.name) !== normalizeText(current.name);
      const imageChanged = !imagesMatch(item.image_url, current.file_name);
      if (nameChanged || imageChanged) {
        diffs.push({ key: `updated-${item.id}`, type: "update", currentItem: current, requestItem: item });
      }
    });

    diffs.forEach((diff) => {
      const getItemImage = (
        item: typeof currentItems[number] | typeof requestItems[number] | undefined
      ) => {
        if (!item) {
          return null;
        }
        if ("file_name" in item) {
          return item.file_name ?? null;
        }
        return item.image_url ?? null;
      };
      const renderItemBlock = (
        item: typeof currentItems[number] | typeof requestItems[number] | undefined,
        fallbackText: string,
        fallbackName: string
      ) => (
        <div className="admin-change-stack">
          {renderThumbValue(getItemImage(item), item?.name || "item", fallbackText)}
          {renderTextValue(item?.name || fallbackName)}
        </div>
      );

      const currentName = normalizeText(diff.currentItem?.name);
      const requestName = normalizeText(diff.requestItem?.name);
      const itemLabel =
        currentName && requestName && currentName !== requestName
          ? `${currentName} → ${requestName}`
          : currentName || requestName || "-";
      changeEntries.push({
        key: diff.key,
        label: `아이템: ${itemLabel}`,
        type: diff.type,
        current: renderItemBlock(diff.currentItem, "없음", "-"),
        request: renderItemBlock(diff.requestItem, diff.type === "remove" ? "삭제됨" : "이미지 없음", "-"),
      });
    });
  }

  return (
    <AdminShell
      active="requests"
      title=""
      description={`수정 요청 · ${state.data.game.title}`}
      showTabs={false}
      headerTop={
        <Link className="admin-back-button" to="/admin/requests">
          <span className="admin-back-icon" aria-hidden="true" />
          뒤로가기
        </Link>
      }
    >
      {actionError ? <div className="admin-games-error">{actionError}</div> : null}
      <div className="admin-game-info-card">
        <div className="admin-game-info-view">
          <div>
            <h2>{state.data.game.title}</h2>
            <p>
              요청자: {state.data.user.name} · 요청일:{" "}
              {new Date(state.data.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      <section className="admin-item-section">
        <div className="admin-item-header">
          <h3>변경 항목</h3>
        </div>
      </section>
      <section className="admin-change-list">
        {changeEntries.length === 0 ? (
          <div className="admin-games-empty">변경된 항목이 없습니다.</div>
        ) : (
          changeEntries.map((entry) => (
            <div key={entry.key} className="admin-change-card">
              <div className="admin-change-header">
                <div className="admin-change-title">{entry.label}</div>
              </div>
              <div className="admin-change-row">
                <div className="admin-change-column">{entry.current}</div>
                <div className="admin-change-arrow" aria-hidden="true">
                  →
                </div>
                <div className="admin-change-column">{entry.request}</div>
              </div>
            </div>
          ))
        )}
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
    </AdminShell>
  );
}
