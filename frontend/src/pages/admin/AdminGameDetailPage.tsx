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

type IdiomEntry = {
  key: string;
  text: string;
  reading: string;
  meaning: string;
  message: string;
};

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
  const [activeBucket, setActiveBucket] = useState<"high" | "mid" | "low">("high");
  const [idiomBuckets, setIdiomBuckets] = useState<{
    high: IdiomEntry[];
    mid: IdiomEntry[];
    low: IdiomEntry[];
  }>({ high: [], mid: [], low: [] });
  const [activeEntryIndex, setActiveEntryIndex] = useState<number | null>(null);
  const [isSajuDeleteMode, setIsSajuDeleteMode] = useState(false);
  const [selectedSajuIndexes, setSelectedSajuIndexes] = useState<number[]>([]);

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
      setIdiomBuckets({ high: [], mid: [], low: [] });
      return;
    }
    fetchAdminJsonFile(jsonPath)
      .then((data) => {
        const content = (data.content || {}) as Record<string, IdiomEntry[]>;
        setIdiomBuckets({
          high: Array.isArray(content.high) ? content.high : [],
          mid: Array.isArray(content.mid) ? content.mid : [],
          low: Array.isArray(content.low) ? content.low : [],
        });
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
    const editCount =
      Object.keys(editingItems).length + (showNewItemForm ? 1 : 0) + (isEditingInfo ? 1 : 0);
    if (editCount > 0 && !window.confirm(`${editCount}개 수정하시겠습니까?`)) {
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
    if (!window.confirm(`${selectedItemIds.length}개 삭제하시겠습니까?`)) {
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

  const handleSaveJson = async (): Promise<boolean> => {
    if (!jsonPath) {
      return false;
    }
    const totalCount =
      idiomBuckets.high.length + idiomBuckets.mid.length + idiomBuckets.low.length;
    if (totalCount > 0 && !window.confirm(`${totalCount}개 수정하시겠습니까?`)) {
      return false;
    }
    setError(null);
    const sanitize = (entries: IdiomEntry[]) =>
      entries
        .map((entry) => ({
          key: entry.key.trim(),
          text: entry.text.trim(),
          reading: entry.reading.trim(),
          meaning: entry.meaning.trim(),
          message: entry.message.trim(),
        }))
        .filter(
          (entry) =>
            entry.key ||
            entry.text ||
            entry.reading ||
            entry.meaning ||
            entry.message
        );
    const next = {
      high: sanitize(idiomBuckets.high),
      mid: sanitize(idiomBuckets.mid),
      low: sanitize(idiomBuckets.low),
    };
    try {
      await saveAdminJsonFile(jsonPath, next);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "JSON 저장에 실패했습니다.");
      } else {
        setError("JSON 저장에 실패했습니다.");
      }
      return false;
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

  const currentBucket = idiomBuckets[activeBucket];

  const updateEntry = (index: number, updates: Partial<IdiomEntry>) => {
    setIdiomBuckets((prev) => {
      const next = [...prev[activeBucket]];
      next[index] = { ...next[index], ...updates };
      return { ...prev, [activeBucket]: next };
    });
  };

  const addEntry = () => {
    setIdiomBuckets((prev) => {
      const next = [
        ...prev[activeBucket],
        { key: "", text: "", reading: "", meaning: "", message: "" },
      ];
      setActiveEntryIndex(next.length - 1);
      return { ...prev, [activeBucket]: next };
    });
  };

  const clampTextarea = (element: HTMLTextAreaElement, maxLines: number) => {
    const computed = window.getComputedStyle(element);
    const lineHeight = parseFloat(computed.lineHeight || "20");
    element.style.height = "auto";
    const maxHeight = lineHeight * maxLines;
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
    element.style.height = `${nextHeight}px`;
  };

  const hasPendingChanges =
    showNewItemForm ||
    Object.keys(editingItems).length > 0 ||
    isEditingInfo ||
    isDeleteMode;

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
        <section className="admin-json-editor">
          <div className="admin-json-tabs">
            {(["high", "mid", "low"] as const).map((bucket) => (
              <button
                key={bucket}
                type="button"
                className={activeBucket === bucket ? "active" : ""}
                onClick={() => setActiveBucket(bucket)}
              >
                {bucket.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="admin-json-actions">
            <button type="button" onClick={addEntry}>
              문단 추가
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                setIsSajuDeleteMode(true);
                setSelectedSajuIndexes([]);
              }}
              disabled={isSajuDeleteMode}
            >
              삭제
            </button>
          </div>
          {currentBucket.length === 0 ? (
            <div className="admin-json-empty">표시할 문단이 없습니다.</div>
          ) : (
            <div className="admin-json-list">
              {currentBucket.map((entry, index) => (
                <div
                  key={`${entry.key}-${index}`}
                  className={`admin-json-item ${
                    selectedSajuIndexes.includes(index) ? "admin-card-selected admin-card-selected-delete" : ""
                  }`}
                  onClick={
                    isSajuDeleteMode
                      ? () =>
                          setSelectedSajuIndexes((prev) =>
                            prev.includes(index)
                              ? prev.filter((id) => id !== index)
                              : [...prev, index]
                          )
                      : undefined
                  }
                >
                  {isSajuDeleteMode ? (
                    <input
                      type="checkbox"
                      className="admin-item-checkbox is-delete"
                      checked={selectedSajuIndexes.includes(index)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setSelectedSajuIndexes((prev) =>
                          event.target.checked
                            ? [...prev, index]
                            : prev.filter((id) => id !== index)
                        )
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    className="admin-json-item-button"
                    onClick={() => !isSajuDeleteMode && setActiveEntryIndex(index)}
                  >
                    <div className="admin-json-idiom">
                      <strong>{entry.text || "사자성어"}</strong>
                      <span>{entry.reading ? `(${entry.reading})` : ""}</span>
                    </div>
                    <div className="admin-json-key">{entry.key}</div>
                  </button>
                </div>
              ))}
            </div>
          )}
          {isSajuDeleteMode ? (
            <div className="admin-floating-actions">
              <button
                type="button"
                onClick={() => {
                  if (selectedSajuIndexes.length === 0) {
                    setIsSajuDeleteMode(false);
                    return;
                  }
                  if (!window.confirm(`${selectedSajuIndexes.length}개 삭제하시겠습니까?`)) {
                    return;
                  }
                  setIdiomBuckets((prev) => {
                    const next = prev[activeBucket].filter(
                      (_, idx) => !selectedSajuIndexes.includes(idx)
                    );
                    return { ...prev, [activeBucket]: next };
                  });
                  setSelectedSajuIndexes([]);
                  setIsSajuDeleteMode(false);
                }}
              >
                {selectedSajuIndexes.length}개 삭제
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setSelectedSajuIndexes([]);
                  setIsSajuDeleteMode(false);
                }}
              >
                취소
              </button>
            </div>
          ) : null}
          {activeEntryIndex !== null && !isSajuDeleteMode ? (
            <div className="admin-json-overlay" role="dialog" aria-modal="true">
              <div className="admin-json-overlay-backdrop" onClick={() => setActiveEntryIndex(null)} />
              <div className="admin-json-overlay-card">
                <div className="admin-json-overlay-header">
                  <button type="button" className="ghost" onClick={() => setActiveEntryIndex(null)}>
                    닫기
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={async () => {
                      const saved = await handleSaveJson();
                      if (saved) {
                        setActiveEntryIndex(null);
                      }
                    }}
                  >
                    완료
                  </button>
                </div>
                <div className="admin-json-edit">
                  <div className="admin-json-edit-title">
                    <input
                      type="text"
                      placeholder="사자성어"
                      value={currentBucket[activeEntryIndex].text}
                      onChange={(event) => updateEntry(activeEntryIndex, { text: event.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="읽기"
                      value={currentBucket[activeEntryIndex].reading}
                      onChange={(event) => updateEntry(activeEntryIndex, { reading: event.target.value })}
                    />
                  </div>
                  <textarea
                    className="admin-json-edit-meaning"
                    rows={1}
                    placeholder="의미"
                    value={currentBucket[activeEntryIndex].meaning}
                    onChange={(event) => {
                      updateEntry(activeEntryIndex, { meaning: event.target.value });
                      clampTextarea(event.currentTarget, 3);
                    }}
                    onFocus={(event) => clampTextarea(event.currentTarget, 3)}
                  />
                  <textarea
                    className="admin-json-edit-message"
                    rows={10}
                    placeholder="메시지"
                    value={currentBucket[activeEntryIndex].message}
                    onChange={(event) => updateEntry(activeEntryIndex, { message: event.target.value })}
                  />
                  <input
                    type="text"
                    className="admin-json-edit-key"
                    placeholder="한자 key"
                    value={currentBucket[activeEntryIndex].key}
                    onChange={(event) => updateEntry(activeEntryIndex, { key: event.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}
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
                            isSelected: prev[item.id]?.isSelected ?? item.is_active,
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
      {hasPendingChanges && !isSajuDeleteMode ? (
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
