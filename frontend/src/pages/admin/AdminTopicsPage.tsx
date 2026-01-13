import { useEffect, useState } from "react";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import type { AdminTopic } from "../../api/games";
import { createWorldcupTopic, deleteAdminTopic, fetchAdminTopics, updateAdminTopic } from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

type EditableTopic = AdminTopic & { draftName: string; isSelected: boolean };

export function AdminTopicsPage() {
  const [topics, setTopics] = useState<EditableTopic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTopics = () => {
    setIsLoading(true);
    fetchAdminTopics()
      .then((data) =>
        setTopics(
          data.map((topic) => ({
            ...topic,
            draftName: topic.name,
            isSelected: topic.is_active,
          }))
        )
      )
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "주제를 불러오지 못했습니다.");
        } else {
          setError("주제를 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const handleSaveAll = async () => {
    try {
      await Promise.all(
        topics.map((topic) =>
          updateAdminTopic({
            topic_id: topic.id,
            name: topic.draftName,
            is_active: topic.isSelected,
          })
        )
      );
      if (showNewTopic && newTopicName.trim()) {
        await createWorldcupTopic(newTopicName.trim());
      }
      setIsEditingAll(false);
      setShowNewTopic(false);
      setNewTopicName("");
      loadTopics();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "저장에 실패했습니다.");
      } else {
        setError("저장에 실패했습니다.");
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setIsDeleteMode(false);
      return;
    }
    try {
      setIsDeleting(true);
      await Promise.all(selectedIds.map((id) => deleteAdminTopic(id)));
      setTopics((prev) => prev.filter((topic) => !selectedIds.includes(topic.id)));
      setSelectedIds([]);
      setIsDeleteMode(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "삭제에 실패했습니다.");
      } else {
        setError("삭제에 실패했습니다.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setIsEditingAll(false);
    setShowNewTopic(false);
    setNewTopicName("");
    setIsDeleteMode(false);
    setSelectedIds([]);
    loadTopics();
  };

  const hasPendingChanges = isEditingAll || showNewTopic || isDeleteMode;

  return (
    <AdminShell active="topics" title="월드컵 주제" description="주제 노출 여부와 정렬을 관리합니다.">
      {error ? <div className="admin-games-error">{error}</div> : null}
      <div className="admin-item-section">
        <div className="admin-item-header">
          <h3>월드컵 주제</h3>
          <div className="admin-item-header-actions">
            <button
              type="button"
              className="admin-item-add-button"
              onClick={() => setShowNewTopic(true)}
              disabled={showNewTopic}
            >
              추가
            </button>
            <button
              type="button"
              className="admin-item-editall-button"
              onClick={() => setIsEditingAll(true)}
              disabled={isEditingAll}
            >
              수정
            </button>
            <button
              type="button"
              className="admin-item-editall-button danger"
              onClick={() => {
                setIsDeleteMode(true);
                setSelectedIds([]);
              }}
              disabled={isDeleteMode}
            >
              삭제
            </button>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : topics.length === 0 ? (
        <div className="admin-games-empty">주제가 없습니다.</div>
      ) : (
        <div className="admin-games-list">
          {showNewTopic ? (
            <div className="admin-games-card admin-topic-card">
              <div className="admin-games-info">
                <div className="admin-topic-edit">
                  <input
                    type="text"
                    placeholder="주제 이름"
                    value={newTopicName}
                    onChange={(event) => setNewTopicName(event.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={`admin-games-card ${
                selectedIds.includes(topic.id) ? "admin-card-selected admin-card-selected-delete" : ""
              }`}
              onClick={
                isDeleteMode
                  ? () =>
                      setSelectedIds((prev) =>
                        prev.includes(topic.id)
                          ? prev.filter((id) => id !== topic.id)
                          : [...prev, topic.id]
                      )
                  : isEditingAll
                  ? () =>
                      setTopics((prev) =>
                        prev.map((item) =>
                          item.id === topic.id
                            ? { ...item, isSelected: !item.isSelected }
                            : item
                        )
                      )
                  : undefined
              }
            >
              <div className="admin-games-info">
                {isDeleteMode ? (
                  <input
                    type="checkbox"
                    className="admin-item-checkbox is-delete"
                    checked={selectedIds.includes(topic.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      setSelectedIds((prev) =>
                        event.target.checked
                          ? [...prev, topic.id]
                          : prev.filter((id) => id !== topic.id)
                      )
                    }
                  />
                ) : null}
                <div>
                  <div className="admin-games-title">{topic.name}</div>
                  <div className="admin-games-tags">
                    <span className="admin-badge badge-id">id: {topic.slug}</span>
                    <span
                      className={`admin-badge badge-status ${
                        topic.is_active ? "is-active" : "is-inactive"
                      }`}
                    >
                      {topic.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  {isEditingAll ? (
                    <div className="admin-topic-edit">
                      <input
                        type="checkbox"
                        className="admin-item-checkbox"
                        checked={topic.isSelected}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setTopics((prev) =>
                            prev.map((item) =>
                              item.id === topic.id
                                ? { ...item, isSelected: event.target.checked }
                                : item
                            )
                          )
                        }
                      />
                      <input
                        type="text"
                        value={topic.draftName}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setTopics((prev) =>
                            prev.map((item) =>
                              item.id === topic.id ? { ...item, draftName: event.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {hasPendingChanges ? (
        <div className="admin-floating-actions">
          <button
            type="button"
            onClick={isDeleteMode ? handleDeleteSelected : handleSaveAll}
            disabled={isLoading || isDeleting}
          >
            {isDeleteMode
              ? isDeleting
                ? "삭제 중..."
                : `${selectedIds.length}개 삭제`
              : isLoading
              ? "처리 중..."
              : "확인"}
          </button>
          <button type="button" className="ghost" onClick={handleCancel} disabled={isLoading}>
            취소
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
