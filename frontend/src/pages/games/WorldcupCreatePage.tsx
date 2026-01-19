import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./worldcup-create.css";
import { ApiError, resolveMediaUrl } from "../../api/http";
import { createWorldcupGame, fetchWorldcupDraft, saveWorldcupDraft } from "../../api/games";
import { useAuthUser } from "../../hooks/useAuthUser";
import { validateImageFile, validateImageUrl } from "../../utils/imageValidation";

type WorldcupItemForm = {
  name: string;
  imageFile: File | null;
  imageUrl: string;
  previewUrl: string;
  source?: "bulk-url";
};

const isMediaUrl = (value: string) => {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.pathname.startsWith("/media/");
  } catch {
    return value.startsWith("/media/");
  }
};

const createItemFromFile = (file: File): WorldcupItemForm => ({
  name: "",
  imageFile: file,
  imageUrl: "",
  previewUrl: URL.createObjectURL(file),
});

const createItemFromUrl = (url: string): WorldcupItemForm => ({
  name: "",
  imageFile: null,
  imageUrl: url,
  previewUrl: "",
  source: "bulk-url",
});

const formatUrlTag = (url: string) => {
  if (url.length <= 10) {
    return url;
  }
  return `${url.slice(0, 10)}...`;
};

export function WorldcupCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [items, setItems] = useState<WorldcupItemForm[]>([]);
  const [bulkUrlInput, setBulkUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const { user } = useAuthUser();
  const draftTimerRef = useRef<number | null>(null);
  const bodyOverflowRef = useRef("");
  const itemsRef = useRef(items);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

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
        if (draft.thumbnail_url) {
          setThumbnailUrl(resolveMediaUrl(draft.thumbnail_url));
        }
        if (draft.items && draft.items.length) {
          setItems(
            draft.items.map((item) => {
              const resolved = item.image_url ? resolveMediaUrl(item.image_url) : "";
              return {
                name: item.name || "",
                imageFile: null,
                imageUrl: resolved,
                previewUrl: "",
              };
            })
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

  const updateItem = (
    index: number,
    updater: (item: WorldcupItemForm) => WorldcupItemForm
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) {
          return item;
        }
        const next = updater(item);
        if (item.previewUrl && item.previewUrl !== next.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        return next;
      })
    );
  };

  const handleItemChange = (index: number, next: Partial<WorldcupItemForm>) => {
    updateItem(index, (item) => ({ ...item, ...next }));
  };

  const handleItemFileSelect = async (index: number, file: File | null) => {
    if (!file) {
      updateItem(index, (item) => ({
        ...item,
        imageFile: null,
        imageUrl: "",
        previewUrl: "",
        source: undefined,
      }));
      return;
    }
    const error = await validateImageFile(file);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    const previewUrl = URL.createObjectURL(file);
    updateItem(index, (item) => ({
      ...item,
      imageFile: file,
      imageUrl: "",
      previewUrl,
      source: undefined,
    }));
  };

  const handleBulkItemFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const incoming = Array.from(files);
    const validated = await Promise.all(
      incoming.map(async (file) => ({
        file,
        error: await validateImageFile(file),
      }))
    );
    const usable = validated.filter((entry) => !entry.error).map((entry) => entry.file);
    const firstError = validated.find((entry) => entry.error)?.error;
    if (firstError) {
      setFormError(firstError || null);
    } else {
      setFormError(null);
    }
    if (usable.length === 0) {
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      let incomingIndex = 0;
      for (let i = 0; i < next.length && incomingIndex < usable.length; i += 1) {
        const item = next[i];
        const isEmpty =
          !item.name.trim() &&
          !item.imageFile &&
          !item.imageUrl &&
          !item.previewUrl;
        if (!isEmpty) {
          continue;
        }
        const file = usable[incomingIndex];
        incomingIndex += 1;
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        next[i] = {
          ...item,
          imageFile: file,
          imageUrl: "",
          previewUrl: URL.createObjectURL(file),
        };
      }
      while (incomingIndex < usable.length) {
        next.push(createItemFromFile(usable[incomingIndex]));
        incomingIndex += 1;
      }
      return next;
    });
  };

  const handleBulkItemUrlSubmit = async () => {
    const trimmed = bulkUrlInput.trim();
    if (!trimmed) {
      return;
    }
    const error = await validateImageUrl(trimmed);
    if (error) {
      setFormError("유효하지 않은 URL입니다.");
      return;
    }
    setFormError(null);
    setItems((prev) => [...prev, createItemFromUrl(trimmed)]);
    setBulkUrlInput("");
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!formError) {
      return;
    }
    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflowRef.current;
    };
  }, [formError]);

  const scheduleDraftSave = useCallback(() => {
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
  }, [description, isSubmitting, items, thumbnail, thumbnailUrl, title, user]);

  useEffect(() => {
    scheduleDraftSave();
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, [description, isSubmitting, items, scheduleDraftSave, thumbnail, thumbnailUrl, title, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setFormError("필수 항목을 모두 입력해 주세요.");
      return;
    }
    if (thumbnailUrl) {
      const error = await validateImageUrl(thumbnailUrl);
      if (error) {
        setFormError(error);
        return;
      }
    }
    for (const item of items) {
      if (item.imageUrl && !item.imageFile) {
        const error = await validateImageUrl(item.imageUrl);
        if (error) {
          setFormError(error);
          return;
        }
      }
    }
    setFormError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("title", title.trim());
    if (description.trim()) {
      formData.append("description", description.trim());
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
        <p>정보와 아이템을 입력하면 바로 월드컵이 만들어집니다.</p>
      </header>

      <form className="worldcup-create-form" onSubmit={handleSubmit}>

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
          <span>썸네일 (선택)</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              if (!nextFile) {
                setThumbnail(null);
                return;
              }
              void (async () => {
                const error = await validateImageFile(nextFile);
                if (error) {
                  setFormError(error);
                  return;
                }
                setFormError(null);
                setThumbnail(nextFile);
                setThumbnailUrl("");
              })();
            }}
          />
          <small>미등록 시 첫 번째 아이템 이미지가 썸네일로 사용됩니다.</small>
        </label>
        <label className="worldcup-create-field">
          <span>썸네일 URL (선택)</span>
          <input
            type="text"
            placeholder="이미지 주소를 입력해 주세요"
            value={thumbnail ? "" : thumbnailUrl}
            onChange={(event) => {
              setThumbnailUrl(event.target.value);
              setThumbnail(null);
            }}
          />
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
          </div>
          <div className="worldcup-create-item worldcup-create-item-bulk">
            <div className="worldcup-create-bulk-header">
              <h3>여러 이미지 추가</h3>
              <p>클릭하거나 여러 이미지를 드래그하면 바로 추가됩니다.</p>
            </div>
            <label
              className="worldcup-create-upload worldcup-create-upload-bulk"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleBulkItemFiles(event.dataTransfer.files);
              }}
            >
              <span className="worldcup-create-upload-plus">+</span>
              <span className="worldcup-create-upload-text">
                클릭 또는 드래그로 여러 이미지를 업로드
              </span>
              <input
                ref={bulkInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={(event) => {
                  void handleBulkItemFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <div className="worldcup-create-bulk-url">
              <div className="worldcup-create-bulk-url-field">
                <input
                  type="text"
                  className="worldcup-create-bulk-url-input"
                  placeholder="이미지 URL을 입력하고 Enter"
                  value={bulkUrlInput}
                  onChange={(event) => setBulkUrlInput(event.target.value)}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData("text");
                    if (!pasted) {
                      return;
                    }
                    event.preventDefault();
                    setBulkUrlInput(pasted);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleBulkItemUrlSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="worldcup-create-bulk-url-button"
                  onClick={() => void handleBulkItemUrlSubmit()}
                >
                  추가
                </button>
              </div>
              <div className="worldcup-create-url-tags">
                {items
                  .filter((item) => item.source === "bulk-url" && item.imageUrl)
                  .map((item, index) => (
                    <span key={`url-tag-${index}`} className="worldcup-create-url-tag">
                      {formatUrlTag(item.imageUrl)}
                    </span>
                  ))}
              </div>
            </div>
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
                <label
                  className="worldcup-create-upload"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0] || null;
                    void handleItemFileSelect(index, file);
                  }}
                >
                  {item.previewUrl || item.imageUrl ? (
                    <img
                      className="worldcup-create-upload-image"
                      src={item.previewUrl || item.imageUrl}
                      alt={item.name || "item"}
                    />
                  ) : (
                    <>
                      <span className="worldcup-create-upload-plus">+</span>
                      <span className="worldcup-create-upload-text">
                        클릭하거나 드래그해서 업로드
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(event) =>
                      void handleItemFileSelect(index, event.target.files?.[0] || null)
                    }
                  />
                </label>
              </label>
              <label>
                <span>이미지 URL</span>
                <input
                  type="text"
                  placeholder="이미지 주소를 입력해 주세요"
                  value={
                    item.imageFile || (item.imageUrl && isMediaUrl(item.imageUrl))
                      ? ""
                      : item.imageUrl
                  }
                  disabled={Boolean(item.imageFile)}
                  onChange={(event) =>
                    updateItem(index, (item) => ({
                      ...item,
                      imageUrl: event.target.value,
                      imageFile: null,
                      previewUrl: "",
                      source: undefined,
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className="danger"
                onClick={() => handleRemoveItem(index)}
              >
                삭제
              </button>
            </div>
          ))}
        </div>

        <button className="worldcup-create-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "생성 중..." : "월드컵 만들기"}
        </button>
      </form>
      {formError ? (
        <div className="wc-popup" role="dialog" aria-modal="true">
          <div className="wc-popup-backdrop" onClick={() => setFormError(null)} />
          <div className="wc-popup-card">
            <p className="wc-popup-title">업로드 실패</p>
            <p className="wc-popup-message">{formError}</p>
            <div className="wc-popup-actions">
              <button
                type="button"
                className="wc-popup-button"
                onClick={() => setFormError(null)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
