import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./worldcup-create.css";
import { ApiError, resolveMediaUrl } from "../../api/http";
import {
  createWorldcupGame,
  createWorldcupTopic,
  fetchWorldcupDraft,
  fetchWorldcupTopics,
  saveWorldcupDraft,
} from "../../api/games";
import type { Topic } from "../../api/games";
import { useAuthUser } from "../../hooks/useAuthUser";

type WorldcupItemForm = {
  name: string;
  imageFile: File | null;
  imageUrl: string;
};

export function WorldcupCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [parentTopicId, setParentTopicId] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [items, setItems] = useState<WorldcupItemForm[]>([
    { name: "", imageFile: null, imageUrl: "" },
    { name: "", imageFile: null, imageUrl: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const { user } = useAuthUser();
  const draftTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchWorldcupTopics()
      .then((data) => setTopics(data))
      .catch(() => {
        // 주제 목록 실패는 폼 진행을 막지 않음
      });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    fetchWorldcupDraft()
      .then((draft) => {
        if (!draft) {
          return;
        }
        if (draft.id) {
          setDraftId(draft.id);
        }
        if (draft.title) {
          setTitle(draft.title);
        }
        if (draft.description) {
          setDescription(draft.description);
        }
        if (draft.parent_topic_id) {
          setParentTopicId(draft.parent_topic_id);
        }
        if (draft.thumbnail_url) {
          setThumbnailUrl(resolveMediaUrl(draft.thumbnail_url));
        }
        if (draft.items && draft.items.length) {
          setItems(
            draft.items.map((item) => ({
              name: item.name || "",
              imageFile: null,
              imageUrl: item.image_url ? resolveMediaUrl(item.image_url) : "",
            }))
          );
        }
      })
      .catch(() => {
        // 드래프트 불러오기 실패는 진행을 막지 않음
      });
  }, [user]);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (items.length < 2) return false;
    return items.every((item) => item.imageFile || item.imageUrl);
  }, [items, title]);

  const handleItemChange = (index: number, next: Partial<WorldcupItemForm>) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...next } : item))
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: "", imageFile: null, imageUrl: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const scheduleDraftSave = () => {
    if (!user || isSubmitting) {
      return;
    }
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = window.setTimeout(() => {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      if (parentTopicId && parentTopicId !== "new") {
        formData.append("parent_topic_id", parentTopicId);
      }
      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      } else if (thumbnailUrl) {
        formData.append("thumbnail_url", thumbnailUrl);
      }
      items.forEach((item, index) => {
        if (item.name.trim()) {
          formData.append(`items[${index}].name`, item.name.trim());
        }
        if (item.imageFile) {
          formData.append(`items[${index}].image`, item.imageFile);
        } else if (item.imageUrl) {
          formData.append(`items[${index}].image_url`, item.imageUrl);
        }
      });
      saveWorldcupDraft(formData)
        .then((draft) => {
          if (draft.id) {
            setDraftId(draft.id);
          }
        })
        .catch(() => {
          // 드래프트 저장 실패는 진행을 막지 않음
        });
    }, 800);
  };

  useEffect(() => {
    scheduleDraftSave();
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, [title, description, parentTopicId, thumbnail, thumbnailUrl, items, user, isSubmitting]);

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) {
      setFormError("새 주제명을 입력해 주세요.");
      return;
    }
    setFormError(null);
    setIsCreatingTopic(true);
    try {
      const topic = await createWorldcupTopic(newTopicName.trim());
      setTopics((prev) => [...prev, topic]);
      setParentTopicId(String(topic.id));
      setNewTopicName("");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.meta.message || "주제 생성에 실패했습니다.");
      } else {
        setFormError("주제 생성에 실패했습니다.");
      }
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setFormError("필수 항목을 모두 입력해 주세요.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("title", title.trim());
    if (description.trim()) {
      formData.append("description", description.trim());
    }
    if (parentTopicId.trim() && parentTopicId !== "new") {
      formData.append("parent_topic_id", parentTopicId.trim());
    }
    if (thumbnail) {
      formData.append("thumbnail", thumbnail);
    } else if (thumbnailUrl) {
      formData.append("thumbnail_url", thumbnailUrl);
    }
    items.forEach((item, index) => {
      if (item.name.trim()) {
        formData.append(`items[${index}].name`, item.name.trim());
      }
      if (item.imageFile) {
        formData.append(`items[${index}].image`, item.imageFile);
      } else if (item.imageUrl) {
        formData.append(`items[${index}].image_url`, item.imageUrl);
      }
    });
    if (draftId) {
      formData.append("draft_id", String(draftId));
    }

    try {
      const data = await createWorldcupGame(formData);
      navigate(`/worldcup/${data.game_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.meta.message || "월드컵 생성에 실패했습니다.");
      } else {
        setFormError("월드컵 생성에 실패했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="worldcup-create-page">
      <header className="worldcup-create-header">
        <h1>월드컵 만들기</h1>
        <p>주제와 아이템을 입력하면 바로 월드컵이 만들어집니다.</p>
      </header>

      <form className="worldcup-create-form" onSubmit={handleSubmit}>
        {formError ? <p className="worldcup-create-error">{formError}</p> : null}

        <label className="worldcup-create-field">
          <span>제목</span>
          <input
            type="text"
            placeholder="예: 라면 월드컵"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <label className="worldcup-create-field">
          <span>설명</span>
          <textarea
            placeholder="게임 소개를 입력해 주세요."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="worldcup-create-field">
          <span>주제 선택 (선택)</span>
          <select
            value={parentTopicId}
            onChange={(event) => setParentTopicId(event.target.value)}
          >
            <option value="">선택 안 함</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
            <option value="new">새로 만들기...</option>
          </select>
        </label>

        {parentTopicId === "new" ? (
          <div className="worldcup-create-new-topic">
            <label>
              <span>새 주제명</span>
              <input
                type="text"
                placeholder="예: 라면"
                value={newTopicName}
                onChange={(event) => setNewTopicName(event.target.value)}
              />
            </label>
            <button type="button" onClick={handleCreateTopic} disabled={isCreatingTopic}>
              {isCreatingTopic ? "생성 중..." : "주제 만들기"}
            </button>
          </div>
        ) : null}

        <label className="worldcup-create-field">
          <span>썸네일 (선택)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              setThumbnail(nextFile);
              if (nextFile) {
                setThumbnailUrl("");
              }
            }}
          />
          <small>미등록 시 첫 번째 아이템 이미지가 썸네일로 사용됩니다.</small>
        </label>
        {thumbnailUrl ? (
          <div className="worldcup-create-preview">
            <span>현재 썸네일</span>
            <img src={thumbnailUrl} alt="Draft thumbnail" />
          </div>
        ) : null}

        <div className="worldcup-create-items">
          <div className="worldcup-create-items-header">
            <h2>아이템</h2>
            <button type="button" onClick={handleAddItem}>
              아이템 추가
            </button>
          </div>

          {items.map((item, index) => (
            <div key={`item-${index}`} className="worldcup-create-item">
              <label>
                <span>이름 (선택)</span>
                <input
                  type="text"
                  placeholder="아이템 이름"
                  value={item.name}
                  onChange={(event) =>
                    handleItemChange(index, { name: event.target.value })
                  }
                />
              </label>
              <label>
                <span>이미지</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handleItemChange(index, {
                      imageFile: event.target.files?.[0] || null,
                      imageUrl: "",
                    })
                  }
                  required={!item.imageUrl}
                />
              </label>
              {item.imageUrl ? (
                <div className="worldcup-create-preview">
                  <span>저장된 이미지</span>
                  <img src={item.imageUrl} alt={item.name || "item"} />
                </div>
              ) : null}
              {items.length > 2 ? (
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleRemoveItem(index)}
                >
                  삭제
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <button className="worldcup-create-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "생성 중..." : "월드컵 만들기"}
        </button>
      </form>
    </div>
  );
}
