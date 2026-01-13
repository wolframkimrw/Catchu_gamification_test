import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import type { AdminGameDetail } from "../../api/games";
import {
  createAdminGameItem,
  deleteAdminGameItem,
  deleteAdminGame,
  fetchAdminGameDetail,
  fetchAdminJsonFile,
  saveAdminJsonFile,
  updateAdminGame,
  updateAdminGameItem,
} from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

export function AdminGameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<AdminGameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newItemName, setNewItemName] = useState("");
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [newItemPreview, setNewItemPreview] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [editingItems, setEditingItems] = useState<
    Record<number, { name: string; image: File | null; preview: string | null; isSelected: boolean }>
  >({});
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [isDeletingItems, setIsDeletingItems] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [jsonRows, setJsonRows] = useState<{ key: string; value: string }[]>([]);
  const [isJsonSaving, setIsJsonSaving] = useState(false);

  useEffect(() => {
    if (!gameId) {
      return;
    }
    setIsLoading(true);
    fetchAdminGameDetail(Number(gameId))
      .then((data) => setGame(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "게임을 불러오지 못했습니다.");
        } else {
          setError("게임을 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [gameId]);

  const jsonPath = useMemo(() => {
    if (!game) {
      return null;
    }
    if (game.slug === "saju-luck") {
      return "fortune/idioms.json";
    }
    return null;
  }, [game]);

  useEffect(() => {
    if (!jsonPath) {
      setJsonRows([]);
      return;
    }
    fetchAdminJsonFile(jsonPath)
      .then((data) => {
        const entries = Object.entries(data.content || {});
        setJsonRows(
          entries.map(([key, value]) => ({
            key,
            value: JSON.stringify(value, null, 2),
          }))
        );
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "JSON을 불러오지 못했습니다.");
        } else {
          setError("JSON을 불러오지 못했습니다.");
        }
      });
  }, [jsonPath]);

  const handleUpdate = async (updates: { visibility?: string; status?: string }) => {
    if (!game) {
      return;
    }
    try {
      const updated = await updateAdminGame({ game_id: game.id, ...updates });
      setGame((prev) =>
        prev
          ? {
              ...prev,
              visibility: updated.visibility,
              status: updated.status,
            }
          : prev
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "변경에 실패했습니다.");
      } else {
        setError("변경에 실패했습니다.");
      }
    }
  };

  const handleDelete = async () => {
    if (!game) {
      return;
    }
    if (!window.confirm("정말로 삭제할까요?")) {
      return;
    }
    try {
      await deleteAdminGame(game.id);
      navigate("/admin/games");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "삭제에 실패했습니다.");
      } else {
        setError("삭제에 실패했습니다.");
      }
    }
  };

  const handleAddItem = async (): Promise<boolean> => {
    if (!game || !newItemImage) {
      setError("아이템 이미지가 필요합니다.");
      return false;
    }
    setError(null);
    setIsAddingItem(true);
    const formData = new FormData();
    formData.append("game_id", String(game.id));
    if (newItemName.trim()) {
      formData.append("name", newItemName.trim());
    }
    formData.append("image", newItemImage);
    try {
      const created = await createAdminGameItem(formData);
      setGame((prev) =>
        prev
          ? {
              ...prev,
              items: [
                ...prev.items,
                {
                  id: created.item_id,
                  name: newItemName.trim(),
                  file_name: created.file_name,
                  sort_order: created.sort_order,
                  is_active: true,
                },
              ],
            }
          : prev
      );
      setNewItemName("");
      setNewItemImage(null);
      setNewItemPreview(null);
      setShowNewItemForm(false);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "아이템 추가에 실패했습니다.");
      } else {
        setError("아이템 추가에 실패했습니다.");
      }
      return false;
    } finally {
      setIsAddingItem(false);
    }
  };

  const cancelEditAll = () => {
    setEditingItems({});
    setShowNewItemForm(false);
    setNewItemName("");
    setNewItemImage(null);
    setNewItemPreview(null);
    setIsDeleteMode(false);
    setSelectedItemIds([]);
    setIsEditingInfo(false);
    setEditingTitle("");
    setEditingDescription("");
  };

  const startEditAllItems = () => {
    if (!game) {
      return;
    }
    setIsDeleteMode(false);
    setSelectedItemIds([]);
    const next = game.items.reduce<
      Record<number, { name: string; image: File | null; preview: string | null; isSelected: boolean }>
    >(
      (acc, item) => {
        acc[item.id] = {
          name: item.name || "",
          image: null,
          preview: item.file_name || null,
          isSelected: item.is_active,
        };
        return acc;
      },
      {}
    );
    setEditingItems(next);
  };

  const handleConfirmAll = async () => {
    if (!game) {
      return;
    }
    setError(null);
    try {
      if (isEditingInfo) {
        const updated = await updateAdminGame({
          game_id: game.id,
          title: editingTitle.trim(),
          description: editingDescription.trim(),
        });
        setGame((prev) =>
          prev
            ? {
                ...prev,
                title: editingTitle.trim(),
                description: editingDescription.trim(),
                status: updated.status,
                visibility: updated.visibility,
              }
            : prev
        );
        setIsEditingInfo(false);
        setEditingTitle("");
        setEditingDescription("");
      }

      if (showNewItemForm) {
        const added = await handleAddItem();
        if (!added) {
          return;
        }
      }

      const editEntries = Object.entries(editingItems);
      for (const [itemId, edit] of editEntries) {
        const formData = new FormData();
        formData.append("item_id", String(itemId));
        formData.append("name", edit.name.trim());
        formData.append("is_active", String(edit.isSelected));
        if (edit.image) {
          formData.append("image", edit.image);
        }
        const updated = await updateAdminGameItem(formData);
        setGame((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((item) =>
                  item.id === Number(itemId)
                    ? {
                        ...item,
                        name: updated.name ?? edit.name.trim(),
                        file_name: updated.file_name ?? item.file_name,
                        is_active: updated.is_active,
                      }
                    : item
                ),
              }
            : prev
        );
      }
      setEditingItems({});
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "변경에 실패했습니다.");
      } else {
        setError("변경에 실패했습니다.");
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (!game) {
      return;
    }
    if (selectedItemIds.length === 0) {
      setIsDeleteMode(false);
      return;
    }
    try {
      setIsDeletingItems(true);
      await Promise.all(selectedItemIds.map((id) => deleteAdminGameItem(id)));
      setGame((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((item) => !selectedItemIds.includes(item.id)),
            }
          : prev
      );
      setSelectedItemIds([]);
      setIsDeleteMode(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "아이템 삭제에 실패했습니다.");
      } else {
        setError("아이템 삭제에 실패했습니다.");
      }
    } finally {
      setIsDeletingItems(false);
    }
  };

  const handleSaveJson = async () => {
    if (!jsonPath) {
      return;
    }
    setError(null);
    const next: Record<string, unknown> = {};
    for (const row of jsonRows) {
      const trimmedKey = row.key.trim();
      if (!trimmedKey) {
        setError("키가 비어 있습니다.");
        return;
      }
      try {
        next[trimmedKey] = row.value ? JSON.parse(row.value) : "";
      } catch (parseErr) {
        setError(`값 파싱 실패: ${trimmedKey}`);
        return;
      }
    }
    try {
      setIsJsonSaving(true);
      await saveAdminJsonFile(jsonPath, next);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "JSON 저장에 실패했습니다.");
      } else {
        setError("JSON 저장에 실패했습니다.");
      }
    } finally {
      setIsJsonSaving(false);
    }
  };

  const getTypeLabel = (value: string) => {
    const map: Record<string, string> = {
      WORLD_CUP: "월드컵",
      FORTUNE_TEST: "운세",
      QUIZ: "퀴즈",
    };
    return map[value] || value;
  };

  const getStatusLabel = (value: string) => {
    const map: Record<string, string> = {
      ACTIVE: "승인",
      STOPPED: "중지",
      DRAFT: "작성중",
      ARCHIVED: "보관",
    };
    return map[value] || value;
  };

  const getVisibilityLabel = (value: string) => {
    const map: Record<string, string> = {
      PUBLIC: "공개",
      PRIVATE: "비공개",
      UNLISTED: "링크 공개",
    };
    return map[value] || value;
  };

  const hasPendingChanges =
    showNewItemForm || Object.keys(editingItems).length > 0 || isEditingInfo || isDeleteMode;

  if (isLoading) {
    return (
      <AdminShell active="games" title="게임 상세">
        <div className="admin-games-empty">불러오는 중...</div>
      </AdminShell>
    );
  }

  if (!game) {
    return (
      <AdminShell active="games" title="게임 상세">
        <div className="admin-games-empty">게임을 찾을 수 없습니다.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      active="games"
      title=""
      description={`게임 설정 · ${getTypeLabel(game.type)}`}
      showTabs={false}
      headerTop={
        <button type="button" className="admin-back-button" onClick={() => navigate(-1)}>
          <span className="admin-back-icon" aria-hidden="true" />
          뒤로가기
        </button>
      }
    >
      {error ? <div className="admin-games-error">{error}</div> : null}

      <div className="admin-game-info-card">
        {isEditingInfo ? (
          <div className="admin-game-info-edit">
            <input
              type="text"
              value={editingTitle}
              placeholder="게임 제목"
              onChange={(event) => setEditingTitle(event.target.value)}
            />
            <textarea
              rows={3}
              value={editingDescription}
              placeholder="게임 설명"
              onChange={(event) => setEditingDescription(event.target.value)}
            />
          </div>
        ) : (
          <div className="admin-game-info-view">
            <div>
              <h2>{game.title}</h2>
              <p>{game.description || "설명이 없습니다."}</p>
            </div>
            <button
              type="button"
              className="admin-icon-button"
              onClick={() => {
                setIsEditingInfo(true);
                setEditingTitle(game.title);
                setEditingDescription(game.description || "");
              }}
              aria-label="게임 정보 수정"
            >
              <span className="admin-icon-pen" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="admin-status-card">
        <h3>현재 상태</h3>
        <div className="admin-status-list">
          <div className="admin-status-item">
            <span>상태:</span>
            <strong>{getStatusLabel(game.status)}</strong>
          </div>
          <div className="admin-status-item">
            <span>공개:</span>
            <strong>{getVisibilityLabel(game.visibility)}</strong>
          </div>
          <div className="admin-status-item">
            <span>유형:</span>
            <strong>{getTypeLabel(game.type)}</strong>
          </div>
        </div>
        <div className="admin-status-actions">
          <button
            type="button"
            className={game.visibility === "PUBLIC" ? "visibility-private" : "visibility-public"}
            onClick={() =>
              handleUpdate({
                visibility: game.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
                status: game.visibility === "PUBLIC" ? undefined : "ACTIVE",
              })
            }
          >
            {game.visibility === "PUBLIC" ? "비공개로 전환" : "공개로 전환"}
          </button>
          <button type="button" onClick={() => handleUpdate({ status: "STOPPED" })}>
            중지
          </button>
          <button type="button" className="danger" onClick={handleDelete}>
            삭제
          </button>
        </div>
      </div>

      <section className="admin-item-section">
        <div className="admin-item-header">
          <h3>{jsonPath ? "JSON 데이터" : "아이템"}</h3>
          {!jsonPath ? (
            <div className="admin-item-header-actions">
              <button
                type="button"
                className="admin-item-add-button"
                onClick={() => setShowNewItemForm(true)}
                disabled={showNewItemForm}
              >
                아이템 추가
              </button>
              <button
                type="button"
                className="admin-item-editall-button"
                onClick={startEditAllItems}
                disabled={!game.items.length}
              >
                아이템 수정
              </button>
              <button
                type="button"
                className="admin-item-editall-button danger"
                onClick={() => {
                  setIsDeleteMode(true);
                  setSelectedItemIds([]);
                  setEditingItems({});
                }}
                disabled={!game.items.length || isDeleteMode}
              >
                삭제
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {jsonPath ? (
        <section className="admin-json-list">
          {jsonRows.length === 0 ? (
            <div className="admin-json-empty">표시할 데이터가 없습니다.</div>
          ) : (
            jsonRows.map((row, index) => (
              <div key={`${row.key}-${index}`} className="admin-json-row">
                <input
                  type="text"
                  value={row.key}
                  placeholder="key"
                  onChange={(event) =>
                    setJsonRows((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, key: event.target.value } : item
                      )
                    )
                  }
                />
                <textarea
                  rows={6}
                  value={row.value}
                  placeholder="value (JSON)"
                  onChange={(event) =>
                    setJsonRows((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, value: event.target.value } : item
                      )
                    )
                  }
                />
                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    setJsonRows((prev) => prev.filter((_, idx) => idx !== index))
                  }
                >
                  삭제
                </button>
              </div>
            ))
          )}
          <div className="admin-json-actions">
            <button type="button" onClick={() => setJsonRows((prev) => [...prev, { key: "", value: "" }])}>
              키 추가
            </button>
            <button type="button" onClick={handleSaveJson} disabled={isJsonSaving}>
              {isJsonSaving ? "저장 중..." : "JSON 저장"}
            </button>
          </div>
        </section>
      ) : (
        <section className="admin-games-list">
        {showNewItemForm ? (
          <div className="admin-games-card admin-item-card">
            <div className="admin-games-info">
              <label className="admin-upload-box" htmlFor="new-item-image">
                {newItemPreview ? (
                  <img src={newItemPreview} alt="preview" />
                ) : (
                  <span className="admin-upload-plus">+</span>
                )}
                <input
                  id="new-item-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setNewItemImage(file);
                    setNewItemPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>
              <div className="admin-item-fields">
                <input
                  type="text"
                  placeholder="아이템 이름"
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                />
                <div className="admin-item-meta">신규 아이템</div>
              </div>
            </div>
          </div>
        ) : null}
        {game.items.map((item) => (
          <div
            key={item.id}
            className={`admin-games-card ${
              selectedItemIds.includes(item.id) ? "admin-card-selected admin-card-selected-delete" : ""
            }`}
            onClick={
              isDeleteMode
                ? () =>
                    setSelectedItemIds((prev) =>
                      prev.includes(item.id)
                        ? prev.filter((id) => id !== item.id)
                        : [...prev, item.id]
                    )
                : editingItems[item.id]
                ? () =>
                    setEditingItems((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        isSelected: !prev[item.id].isSelected,
                      },
                    }))
                : undefined
            }
          >
            <div className="admin-games-info">
              {isDeleteMode ? (
                <input
                  type="checkbox"
                  className="admin-item-checkbox is-delete"
                  checked={selectedItemIds.includes(item.id)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    setSelectedItemIds((prev) =>
                      event.target.checked
                        ? [...prev, item.id]
                        : prev.filter((id) => id !== item.id)
                    )
                  }
                />
              ) : null}
              <div className="admin-games-thumb admin-item-thumb">
                {editingItems[item.id] ? (
                  <label
                    className="admin-upload-box admin-upload-overlay"
                    htmlFor={`item-image-${item.id}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {editingItems[item.id].preview ? (
                      <img src={editingItems[item.id].preview ?? ""} alt={item.name || "item"} />
                    ) : (
                      <span className="admin-upload-plus">+</span>
                    )}
                    <input
                      id={`item-image-${item.id}`}
                      type="file"
                      accept="image/*"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setEditingItems((prev) => ({
                          ...prev,
                          [item.id]: {
                            name: prev[item.id]?.name ?? item.name,
                            image: file,
                            preview: file ? URL.createObjectURL(file) : item.file_name || null,
                          },
                        }));
                      }}
                    />
                  </label>
                ) : item.file_name ? (
                  <img src={item.file_name} alt={item.name || "item"} />
                ) : (
                  <div className="admin-games-thumb-placeholder">NO</div>
                )}
              </div>
              <div className="admin-item-fields">
                {editingItems[item.id] && !isDeleteMode ? (
                  <input
                    type="checkbox"
                    className="admin-item-checkbox"
                    checked={editingItems[item.id].isSelected}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      setEditingItems((prev) => ({
                        ...prev,
                        [item.id]: {
                          ...prev[item.id],
                          isSelected: event.target.checked,
                        },
                      }))
                    }
                  />
                ) : null}
                {editingItems[item.id] && !isDeleteMode ? (
                  <input
                    type="text"
                    value={editingItems[item.id].name}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      setEditingItems((prev) => ({
                        ...prev,
                        [item.id]: {
                          ...prev[item.id],
                          name: event.target.value,
                        },
                      }))
                    }
                  />
                ) : (
                  <div className="admin-games-title">{item.name || "이름 없음"}</div>
                )}
                <div className="admin-item-meta">
                  <span
                    className={
                      (editingItems[item.id]?.isSelected ?? item.is_active)
                        ? "status-pill active"
                        : "status-pill inactive"
                    }
                  >
                    {(editingItems[item.id]?.isSelected ?? item.is_active) ? "활성" : "비활성"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
      )}
      {hasPendingChanges ? (
        <div className="admin-floating-actions">
          <button
            type="button"
            onClick={isDeleteMode ? handleDeleteSelected : handleConfirmAll}
            disabled={isAddingItem || isDeletingItems}
          >
            {isDeleteMode
              ? isDeletingItems
                ? "삭제 중..."
                : `${selectedItemIds.length}개 삭제`
              : isAddingItem
              ? "처리 중..."
              : "확인"}
          </button>
          <button type="button" className="ghost" onClick={cancelEditAll} disabled={isAddingItem}>
            취소
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
