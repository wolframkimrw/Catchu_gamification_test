import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./worldcup-create.css";
import "./my-game-edit.css";
import { ApiError, resolveMediaUrl } from "../../api/http";
import { fetchGameDetail, submitGameEditRequest } from "../../api/games";
import type { GameDetailData } from "../../api/games";

type EditItemForm = {
  id?: number;
  name: string;
  imageFile: File | null;
  imageUrl: string;
  previewUrl: string;
};

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: GameDetailData };

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

export function MyGameEditRequestPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const parsedGameId = useMemo(() => {
    const idNumber = Number(gameId);
    return Number.isFinite(idNumber) ? idNumber : null;
  }, [gameId]);

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [items, setItems] = useState<EditItemForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const itemsRef = useRef<EditItemForm[]>([]);

  useEffect(() => {
    if (parsedGameId === null) {
      return;
    }
    fetchGameDetail(parsedGameId)
      .then((data) => {
        setState({ status: "ready", data });
        setTitle(data.game.title || "");
        setDescription(data.game.description || "");
        setThumbnailUrl(data.game.thumbnail || "");
        setItems(
          data.items.map((item) => {
            const resolved = item.file_name ? resolveMediaUrl(item.file_name) : "";
            return {
              id: item.id,
              name: item.name || "",
              imageFile: null,
              imageUrl: resolved,
              previewUrl: "",
            };
          })
        );
      })
      .catch((err: unknown) => {
        const message =
          (err instanceof ApiError && err.meta.message) ||
          (err instanceof Error && err.message) ||
          "게임 정보를 불러오지 못했습니다.";
        setState({ status: "error", message });
      });
  }, [parsedGameId]);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (items.length < 2) return false;
    return items.every((item) => item.imageFile || item.imageUrl);
  }, [items, title]);

  const updateItem = (
    index: number,
    updater: (item: EditItemForm) => EditItemForm
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

  const handleItemChange = (index: number, next: Partial<EditItemForm>) => {
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || parsedGameId === null) {
      setFormError("필수 항목을 모두 입력해 주세요.");
      return;
    }
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("game_id", String(parsedGameId));
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
      if (item.id) {
        formData.append(`items[${index}].id`, String(item.id));
      }
      if (item.name.trim()) {
        formData.append(`items[${index}].name`, item.name.trim());
      }
      if (item.imageFile) {
        formData.append(`items[${index}].image`, item.imageFile);
      } else if (item.imageUrl) {
        formData.append(`items[${index}].image_url`, item.imageUrl);
      }
    });

    try {
      await submitGameEditRequest(formData);
      window.alert("수정 요청이 접수되었습니다. 승인 후 반영됩니다.");
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.meta.message || "수정 요청에 실패했습니다.");
      } else {
        setFormError("수정 요청에 실패했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (parsedGameId === null) {
    return <div className="my-edit-state">잘못된 게임 ID 입니다.</div>;
  }

  if (state.status === "loading") {
    return <div className="my-edit-state">불러오는 중...</div>;
  }

  if (state.status === "error") {
    return <div className="my-edit-state">에러: {state.message}</div>;
  }

  return (
    <div className="worldcup-create-page">
      <div className="worldcup-create-actions worldcup-create-actions-top">
        <button type="button" className="ghost" onClick={() => navigate("/my/games")}>
          목록으로
        </button>
      </div>
      <header className="worldcup-create-header">
        <h1>내 게임 수정</h1>
        <p>수정 요청은 승인 후 반영됩니다.</p>
      </header>
      <form className="worldcup-create-form" onSubmit={handleSubmit}>
        {formError ? <p className="worldcup-create-error">{formError}</p> : null}
        {successMessage ? <p className="worldcup-create-success">{successMessage}</p> : null}
        <label className="worldcup-create-field">
          <span>게임 제목</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="게임 제목을 입력해 주세요"
          />
        </label>
        <label className="worldcup-create-field">
          <span>설명</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="게임 설명을 입력해 주세요"
          />
        </label>
        <label className="worldcup-create-field">
          <span>썸네일</span>
          <label className="worldcup-create-upload">
            {thumbnail ? (
              <img
                className="worldcup-create-upload-image"
                src={URL.createObjectURL(thumbnail)}
                alt="썸네일 미리보기"
              />
            ) : thumbnailUrl ? (
              <img
                className="worldcup-create-upload-image"
                src={thumbnailUrl}
                alt="썸네일 미리보기"
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
              onChange={(event) => {
                setThumbnail(event.target.files ? event.target.files[0] : null);
                setThumbnailUrl("");
              }}
            />
          </label>
          <small>이미지 URL로도 제출할 수 있습니다.</small>
          <input
            type="text"
            value={thumbnail ? "" : thumbnailUrl}
            onChange={(event) => {
              setThumbnailUrl(event.target.value);
              if (event.target.value) {
                setThumbnail(null);
              }
            }}
            placeholder="이미지 URL"
          />
        </label>
        <div className="worldcup-create-items">
          <div className="worldcup-create-items-header">
            <h2>아이템</h2>
            <button type="button" onClick={handleAddItem}>
              + 추가
            </button>
          </div>
          {items.map((item, index) => (
            <div key={`item-${index}`} className="worldcup-create-item">
              <label>
                <span>아이템 이름</span>
                <input
                  type="text"
                  value={item.name}
                  onChange={(event) =>
                    handleItemChange(index, { name: event.target.value })
                  }
                />
              </label>
              <label>
                <span>이미지 업로드</span>
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
                      alt="아이템 미리보기"
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
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <div className="worldcup-create-actions worldcup-create-actions-right">
          <button className="worldcup-create-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "요청 중..." : "수정 요청 보내기"}
          </button>
        </div>
      </form>
    </div>
  );
}
