import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./worldcup-create.css";
import { ApiError, resolveMediaUrl } from "../../api/http";
import { createWorldcupGame, fetchWorldcupDraft, saveWorldcupDraft } from "../../api/games";
import { useAuthUser } from "../../hooks/useAuthUser";

type WorldcupItemForm = {
  name: string;
  imageFile: File | null;
  imageUrl: string;
  previewUrl: string;
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

export function WorldcupCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [items, setItems] = useState<WorldcupItemForm[]>([
    { name: "", imageFile: null, imageUrl: "", previewUrl: "" },
    { name: "", imageFile: null, imageUrl: "", previewUrl: "" },
  ]);
  const [roundSize, setRoundSize] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const { user } = useAuthUser();
  const draftTimerRef = useRef<number | null>(null);
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
        if (draft.round_size) {
          setRoundSize(draft.round_size);
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

  const imageCount = useMemo(
    () => items.filter((item) => item.imageFile || item.imageUrl).length,
    [items]
  );

  const availableRoundSizes = useMemo(() => {
    const sizes: number[] = [];
    let size = 2;
    while (size <= imageCount) {
      sizes.push(size);
      size *= 2;
    }
    return sizes.reverse();
  }, [imageCount]);

  const maxRoundSize = availableRoundSizes[0] ?? 2;

  useEffect(() => {
    if (availableRoundSizes.length === 0) {
      setRoundSize(null);
      return;
    }
    setRoundSize((prev) =>
      prev && availableRoundSizes.includes(prev) ? prev : maxRoundSize
    );
  }, [availableRoundSizes, maxRoundSize]);

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

  const handleItemFileSelect = (index: number, file: File | null) => {
    const previewUrl = file ? URL.createObjectURL(file) : "";
    updateItem(index, (item) => ({
      ...item,
      imageFile: file,
      imageUrl: "",
      previewUrl,
    }));
  };

  const handleBulkItemFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const incoming = Array.from(files);
    setItems((prev) => {
      const next = [...prev];
      let incomingIndex = 0;
      for (let i = 0; i < next.length && incomingIndex < incoming.length; i += 1) {
        const item = next[i];
        const isEmpty =
          !item.name.trim() &&
          !item.imageFile &&
          !item.imageUrl &&
          !item.previewUrl;
        if (!isEmpty) {
          continue;
        }
        const file = incoming[incomingIndex];
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
      while (incomingIndex < incoming.length) {
        next.push(createItemFromFile(incoming[incomingIndex]));
        incomingIndex += 1;
      }
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { name: "", imageFile: null, imageUrl: "", previewUrl: "" },
    ]);
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
      if (roundSize) {
        formData.append("round_size", String(roundSize));
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
  }, [description, isSubmitting, items, roundSize, thumbnail, thumbnailUrl, title, user]);

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
    if (roundSize) {
      formData.append("round_size", String(roundSize));
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

        <label className="worldcup-create-field">
          <span>진행 강수</span>
          <select
            value={roundSize ?? ""}
            onChange={(event) => setRoundSize(Number(event.target.value))}
            disabled={availableRoundSizes.length === 0}
          >
            {availableRoundSizes.map((size) => (
              <option key={size} value={size}>
                {size}강
              </option>
            ))}
          </select>
          {availableRoundSizes.length === 0 ? (
            <small>이미지를 2개 이상 등록하면 선택할 수 있습니다.</small>
          ) : (
            <small>현재 이미지 {imageCount}개 기준 최대 {maxRoundSize}강</small>
          )}
        </label>

        <div className="worldcup-create-items">
          <div className="worldcup-create-items-header">
            <h2>아이템</h2>
            <div>
              <input
                ref={bulkInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  handleBulkItemFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => bulkInputRef.current?.click()}
              >
                여러 이미지 추가
              </button>
              <button type="button" onClick={handleAddItem}>
                아이템 추가
              </button>
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
                    handleItemFileSelect(index, file);
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
                    accept="image/*"
                    onChange={(event) =>
                      handleItemFileSelect(index, event.target.files?.[0] || null)
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
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className="danger"
                onClick={() => handleRemoveItem(index)}
                disabled={items.length <= 2}
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
    </div>
  );
}
