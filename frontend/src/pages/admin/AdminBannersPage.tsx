import { useEffect, useMemo, useState } from "react";
import "./admin-games.css";
import "./admin-banners.css";
import { ApiError } from "../../api/http";
import {
  createAdminBanner,
  deleteAdminBanner,
  fetchAdminBanners,
  fetchAdminGames,
  updateAdminBanner,
  type AdminBanner,
  type AdminGame,
  type BannerLinkType,
} from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

type BannerFormState = {
  name: string;
  position: string;
  link_type: BannerLinkType;
  game_id: string;
  link_url: string;
  image_url: string;
  image_file: File | null;
  is_active: boolean;
  priority: string;
  start_at: string;
  end_at: string;
};

const emptyForm: BannerFormState = {
  name: "",
  position: "TOP_GLOBAL",
  link_type: "GAME",
  game_id: "",
  link_url: "",
  image_url: "",
  image_file: null,
  is_active: true,
  priority: "0",
  start_at: "",
  end_at: "",
};

const toLocalInput = (value: string | null) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toApiDatetime = (value: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
};

export function AdminBannersPage() {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [editing, setEditing] = useState<AdminBanner | null>(null);
  const [form, setForm] = useState<BannerFormState>(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([fetchAdminGames(), fetchAdminBanners()])
      .then(([gameList, bannerList]) => {
        setGames(gameList);
        setBanners(bannerList);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "배너 데이터를 불러오지 못했습니다.");
        } else {
          setError("배너 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const activeGames = useMemo(
    () =>
      games.filter(
        (game) => game.status === "ACTIVE" && game.visibility === "PUBLIC"
      ),
    [games]
  );

  const handleEdit = (banner: AdminBanner) => {
    setEditing(banner);
    setForm({
      name: banner.name,
      position: banner.position,
      link_type: banner.link_type,
      game_id: banner.game ? String(banner.game.id) : "",
      link_url: banner.link_url || "",
      image_url: "",
      image_file: null,
      is_active: banner.is_active,
      priority: String(banner.priority ?? 0),
      start_at: toLocalInput(banner.start_at),
      end_at: toLocalInput(banner.end_at),
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(false);
  };

  const handleCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("position", form.position);
      payload.append("link_type", form.link_type);
      payload.append("is_active", String(form.is_active));
      payload.append("priority", form.priority || "0");
      if (form.start_at) {
        payload.append("start_at", toApiDatetime(form.start_at));
      }
      if (form.end_at) {
        payload.append("end_at", toApiDatetime(form.end_at));
      }
      if (form.link_type === "GAME") {
        payload.append("game_id", form.game_id);
      } else {
        payload.append("link_url", form.link_url.trim());
      }
      if (form.image_file) {
        payload.append("image", form.image_file);
      } else if (form.image_url.trim()) {
        payload.append("image_url", form.image_url.trim());
      }

      if (editing) {
        await updateAdminBanner(editing.id, payload);
      } else {
        await createAdminBanner(payload);
      }
      resetForm();
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "배너 저장에 실패했습니다.");
      } else {
        setError("배너 저장에 실패했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (bannerId: number) => {
    setIsSaving(true);
    setError(null);
    try {
      await deleteAdminBanner(bannerId);
      if (editing?.id === bannerId) {
        resetForm();
      }
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "배너 삭제에 실패했습니다.");
      } else {
        setError("배너 삭제에 실패했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell
      active="banners"
      title="배너 관리"
      description="메인 배너 이미지와 링크 대상을 설정합니다."
      headerTop={
        <div className="admin-banner-header-top">
          <button type="button" className="admin-banner-add" onClick={handleCreate}>
            배너 추가
          </button>
        </div>
      }
    >
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isModalOpen ? (
        <div className="admin-banner-modal" role="dialog" aria-modal="true">
          <div className="admin-banner-modal-backdrop" onClick={resetForm} />
          <div className="admin-banner-modal-content">
            <div className="admin-banner-modal-header">
              <h2>{editing ? "배너 수정" : "배너 추가"}</h2>
              <button
                type="button"
                className="admin-banner-modal-close"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>
            <div className="admin-banner-form">
              <div className="admin-banner-form-row">
                <label>
                  배너 이름
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label>
                  위치
                  <select
                    value={form.position}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, position: event.target.value }))
                    }
                  >
                    <option value="TOP_GLOBAL">TOP_GLOBAL</option>
                    <option value="GAME_TOP">GAME_TOP</option>
                  </select>
                </label>
              </div>
              <div className="admin-banner-form-row">
                <label>
                  링크 타입
                  <select
                    value={form.link_type}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        link_type: event.target.value as BannerLinkType,
                      }))
                    }
                  >
                    <option value="GAME">게임 이동</option>
                    <option value="URL">링크 URL</option>
                  </select>
                </label>
                {form.link_type === "GAME" ? (
                  <label>
                    게임 선택
                    <select
                      value={form.game_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          game_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">게임 선택</option>
                      {activeGames.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    링크 URL
                    <input
                      type="text"
                      value={form.link_url}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          link_url: event.target.value,
                        }))
                      }
                      placeholder="/psycho/major-arcana 또는 https://"
                    />
                  </label>
                )}
              </div>
              <div className="admin-banner-form-row">
                <label>
                  이미지 업로드
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        image_file: event.target.files?.[0] ?? null,
                      }))
                    }
                  />
                </label>
                <label>
                  이미지 URL
                  <input
                    type="text"
                    value={form.image_url}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        image_url: event.target.value,
                      }))
                    }
                    placeholder="https:// 또는 /media/..."
                  />
                </label>
              </div>
              <div className="admin-banner-form-row">
                <label>
                  활성화
                  <select
                    value={form.is_active ? "true" : "false"}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        is_active: event.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">활성</option>
                    <option value="false">비활성</option>
                  </select>
                </label>
                <label>
                  우선순위
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        priority: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="admin-banner-form-row">
                <label>
                  시작 시간
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        start_at: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  종료 시간
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        end_at: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="admin-banner-form-actions">
                <button type="button" disabled={isSaving} onClick={handleSubmit}>
                  {editing ? "배너 수정" : "배너 추가"}
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={isSaving}
                  onClick={resetForm}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : (
        <div className="admin-games-list">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="admin-games-card admin-banner-card"
              role="button"
              tabIndex={0}
              onClick={() => handleEdit(banner)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleEdit(banner);
                }
              }}
            >
              <div className="admin-games-info">
                <div className="admin-games-thumb">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.name} />
                  ) : (
                    <div className="admin-games-thumb-placeholder">NO</div>
                  )}
                </div>
                <div className="admin-item-fields">
                  <div className="admin-games-title">{banner.name}</div>
                  <div className="admin-games-meta">
                    <span>{banner.position}</span>
                    <span>
                      {banner.link_type === "GAME"
                        ? `GAME: ${banner.game?.title ?? "-"}`
                        : banner.link_url}
                    </span>
                  </div>
                  <div className="admin-badge-row">
                    <span className="admin-badge badge-status">
                      {banner.is_active ? "활성" : "비활성"}
                    </span>
                    <span className="admin-badge badge-id">
                      우선순위 {banner.priority}
                    </span>
                  </div>
                </div>
              </div>
              <div className="admin-games-actions">
                <button
                  type="button"
                  className="danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(banner.id);
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {banners.length === 0 ? (
            <div className="admin-games-empty">등록된 배너가 없습니다.</div>
          ) : null}
        </div>
      )}
    </AdminShell>
  );
}
