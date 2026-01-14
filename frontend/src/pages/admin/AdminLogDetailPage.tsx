import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import {
  fetchAdminChoiceLogs,
  fetchAdminGameDetail,
  fetchAdminPickLogs,
  fetchAdminResultLogs,
  type AdminChoiceLog,
  type AdminPickLog,
  type AdminResultLog,
  type AdminGameDetail,
} from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

type LogTab = "choices" | "picks";

export function AdminLogDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const parsedGameId = Number(gameId);
  const isValidGameId = Number.isFinite(parsedGameId);

  const [activeTab, setActiveTab] = useState<LogTab>("choices");
  const [game, setGame] = useState<AdminGameDetail | null>(null);
  const [choiceLogs, setChoiceLogs] = useState<AdminChoiceLog[]>([]);
  const [pickLogs, setPickLogs] = useState<AdminPickLog[]>([]);
  const [resultLogs, setResultLogs] = useState<AdminResultLog[]>([]);
  const [visibleCounts, setVisibleCounts] = useState({
    choices: 3,
    picks: 3,
  });
  const [modalChoiceId, setModalChoiceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isValidGameId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchAdminGameDetail(parsedGameId),
      fetchAdminChoiceLogs(),
      fetchAdminPickLogs(),
      fetchAdminResultLogs(),
    ])
      .then(([gameDetail, choices, picks, results]) => {
        setGame(gameDetail);
        setChoiceLogs(choices.filter((log) => log.game.id === parsedGameId));
        setPickLogs(picks.filter((log) => log.game.id === parsedGameId));
        setResultLogs(results.filter((log) => log.game.id === parsedGameId));
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "로그를 불러오지 못했습니다.");
        } else {
          setError("로그를 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [isValidGameId, parsedGameId]);

  useEffect(() => {
    if (game && game.type !== "WORLD_CUP" && activeTab !== "choices") {
      setActiveTab("choices");
    }
  }, [activeTab, game]);

  const isWorldCup = game?.type === "WORLD_CUP";
  const totalStarts = choiceLogs.length;
  const totalResults = resultLogs.length;
  const totalDrops = Math.max(0, totalStarts - totalResults);
  const winnerRanking = useMemo(() => {
    const counts = new Map<
      number | string,
      { id?: number; label: string; count: number; imageUrl: string }
    >();
    const itemImageMap = new Map<number, string>(
      game?.items.map((item) => [item.id, item.file_name]) ?? []
    );
    resultLogs.forEach((log) => {
      const winnerId = log.winner_item?.id;
      const key = winnerId ?? log.winner_item?.name ?? "미지정";
      const label = log.winner_item?.name || "미지정";
      const imageUrl = winnerId ? itemImageMap.get(winnerId) || "" : "";
      const entry = counts.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(key, { id: winnerId, label, count: 1, imageUrl });
      }
    });
    return Array.from(counts.values())
      .map((entry) => ({
        ...entry,
        rate: totalResults ? entry.count / totalResults : 0,
      }))
      .sort((a, b) => {
        if (b.rate !== a.rate) return b.rate - a.rate;
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      });
  }, [game?.items, resultLogs, totalResults]);

  const itemImageMap = useMemo(
    () => new Map(game?.items.map((item) => [item.id, item.file_name]) ?? []),
    [game?.items]
  );

  const pickSessions = useMemo(() => {
    const choiceById = new Map(choiceLogs.map((log) => [log.id, log]));
    const grouped = new Map<number, { choiceId: number; startedAt: string; picks: AdminPickLog[] }>();
    pickLogs.forEach((log) => {
      const existing = grouped.get(log.choice_id);
      if (existing) {
        existing.picks.push(log);
        return;
      }
      const choiceLog = choiceById.get(log.choice_id);
      grouped.set(log.choice_id, {
        choiceId: log.choice_id,
        startedAt: choiceLog?.started_at || log.created_at,
        picks: [log],
      });
    });
    return Array.from(grouped.values()).sort((a, b) => {
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }, [choiceLogs, pickLogs]);

  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : "-";

  const handleShowMore = (tab: LogTab, total: number) => {
    setVisibleCounts((prev) => ({ ...prev, [tab]: total }));
  };

  const activeModalSession = useMemo(() => {
    if (modalChoiceId === null) {
      return null;
    }
    return pickSessions.find((session) => session.choiceId === modalChoiceId) || null;
  }, [modalChoiceId, pickSessions]);

  const getTypeLabel = (value: string) => {
    const map: Record<string, string> = {
      WORLD_CUP: "월드컵",
      FORTUNE_TEST: "운세",
      PSYCHOLOGICAL: "심리테스트",
      PSYCHO_TEST: "심리테스트",
      QUIZ: "퀴즈",
    };
    return map[value] || value;
  };

  const getStatusLabel = (value: string) => {
    const map: Record<string, string> = {
      ACTIVE: "활성",
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

  if (!isValidGameId) {
    return (
      <AdminShell
        active="logs"
        title="결과/로그"
        showTabs={false}
        headerTop={
          <Link className="admin-back-button" to="/admin/logs">
            <span className="admin-back-icon" aria-hidden="true" />
            뒤로가기
          </Link>
        }
      >
        <div className="admin-games-error">게임 ID가 올바르지 않습니다.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      active="logs"
      title=""
      description={game ? `로그 · ${game.title}` : "로그"}
      headerTop={
        <Link className="admin-back-button" to="/admin/logs">
          <span className="admin-back-icon" aria-hidden="true" />
          뒤로가기
        </Link>
      }
    >
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : !game ? (
        <div className="admin-games-empty">게임 정보를 찾을 수 없습니다.</div>
      ) : (
        <>
          <div className="admin-game-info-card">
            <div className="admin-game-info-view">
              <div>
                <h2>{game.title}</h2>
                <p>아이템: {game.items.length}개</p>
              </div>
              <div className="admin-games-tags">
                <span className="admin-badge badge-type">{getTypeLabel(game.type)}</span>
                <span
                  className={`admin-badge badge-status ${
                    game.status === "ACTIVE" ? "is-active" : "is-inactive"
                  }`}
                >
                  {getStatusLabel(game.status)}
                </span>
                <span
                  className={`admin-badge badge-visibility ${
                    game.visibility === "PUBLIC" ? "is-public" : "is-private"
                  }`}
                >
                  {getVisibilityLabel(game.visibility)}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-log-summary">
            <div>
              <strong>{totalStarts}</strong>
              <span>시작 수</span>
            </div>
            <div>
              <strong>{totalResults}</strong>
              <span>결과 도달</span>
            </div>
            <div>
              <strong>{totalDrops}</strong>
              <span>이탈 수</span>
            </div>
          </div>

          {isWorldCup ? (
            <>
              <section className="admin-item-section">
                <div className="admin-item-header">
                  <h3>우승 항목 랭킹</h3>
                </div>
              </section>
              {winnerRanking.length === 0 ? (
                <div className="admin-games-empty">우승 데이터가 없습니다.</div>
              ) : (
                <div className="admin-rank-list">
                  {winnerRanking.map((entry, index) => (
                    <div key={`${entry.label}-${index}`} className="admin-rank-row">
                      <div className="admin-rank-order">{index + 1}</div>
                      <div className="admin-rank-media">
                        {entry.imageUrl ? (
                          <img src={entry.imageUrl} alt={entry.label} />
                        ) : (
                          <div className="admin-rank-fallback">NO</div>
                        )}
                      </div>
                      <div className="admin-rank-name">{entry.label}</div>
                      <div className="admin-rank-rate">
                        {totalResults ? `${Math.round(entry.rate * 100)}%` : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}

          <section className="admin-item-section">
            <div className="admin-item-header">
              <h3>로그</h3>
            </div>
            <div className="admin-log-tabs">
              <button
                type="button"
                className={activeTab === "choices" ? "active" : ""}
                onClick={() => setActiveTab("choices")}
              >
                게임 시작 로그
              </button>
              {isWorldCup ? (
                <button
                  type="button"
                  className={activeTab === "picks" ? "active" : ""}
                  onClick={() => setActiveTab("picks")}
                >
                  월드컵 픽 로그
                </button>
              ) : null}
            </div>
          </section>

          {activeTab === "choices" || !isWorldCup ? (
            totalStarts === 0 ? (
              <div className="admin-games-empty">게임 시작 로그가 없습니다.</div>
            ) : (
              <div className="admin-log-list">
                {choiceLogs.slice(0, visibleCounts.choices).map((log) => (
                  <div key={log.id} className="admin-log-card admin-log-card-compact">
                    <div className="admin-log-lines">
                      <div className="admin-log-line">
                        <span className="admin-log-label">시작날짜</span>
                        <span className="admin-log-value">{formatDateTime(log.started_at)}</span>
                      </div>
                      <div className="admin-log-line">
                        <span className="admin-log-label">이름</span>
                        <span className="admin-log-value">{log.user ? log.user.name : "익명"}</span>
                      </div>
                      <div className="admin-log-line">
                        <span className="admin-log-label">IP</span>
                        <span className="admin-log-value">{log.ip_address || "-"}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {choiceLogs.length > visibleCounts.choices ? (
                  <button
                    type="button"
                    className="admin-log-more"
                    onClick={() => handleShowMore("choices", choiceLogs.length)}
                  >
                    더보기
                  </button>
                ) : null}
              </div>
            )
          ) : pickSessions.length === 0 ? (
            <div className="admin-games-empty">월드컵 픽 로그가 없습니다.</div>
          ) : (
            <div className="admin-log-list">
              {pickSessions.slice(0, visibleCounts.picks).map((session) => (
                <button
                  key={session.choiceId}
                  type="button"
                  className="admin-log-card admin-log-card-button"
                  onClick={() => setModalChoiceId(session.choiceId)}
                >
                  <div className="admin-log-lines">
                    <div className="admin-log-line">
                      <span className="admin-log-label">시작날짜</span>
                      <span className="admin-log-value">{formatDateTime(session.startedAt)}</span>
                    </div>
                    <div className="admin-log-line">
                      <span className="admin-log-label">게임 판</span>
                      <span className="admin-log-value">{session.picks.length}판</span>
                    </div>
                  </div>
                </button>
              ))}
              {pickSessions.length > visibleCounts.picks ? (
                <button
                  type="button"
                  className="admin-log-more"
                  onClick={() => handleShowMore("picks", pickSessions.length)}
                >
                  더보기
                </button>
              ) : null}
            </div>
          )}
          {activeTab === "picks" && activeModalSession ? (
            <div className="admin-modal-backdrop" onClick={() => setModalChoiceId(null)}>
              <div
                className="admin-modal"
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="admin-modal-header">
                  <div>
                    <div className="admin-modal-title">게임 {activeModalSession.picks.length}판</div>
                    <div className="admin-modal-sub">
                      {formatDateTime(activeModalSession.startedAt)}
                    </div>
                  </div>
                  <button type="button" className="admin-modal-close" onClick={() => setModalChoiceId(null)}>
                    닫기
                  </button>
                </div>
                <div className="admin-modal-body">
                  {activeModalSession.picks
                    .slice()
                    .sort((a, b) => a.step_index - b.step_index)
                    .map((pick) => (
                      <div key={pick.id}>
                        <div className="admin-modal-step">판 {pick.step_index + 1}</div>
                        <div className="admin-pick-row admin-pick-row-large">
                          <span
                            className={`admin-pick-item ${
                              pick.selected_item?.id === pick.left_item?.id ? "is-winner" : ""
                            }`}
                          >
                            <span className="admin-pick-thumb admin-pick-thumb-large">
                              {pick.left_item?.id && itemImageMap.get(pick.left_item.id) ? (
                                <img
                                  src={itemImageMap.get(pick.left_item.id)}
                                  alt={pick.left_item.name || "left"}
                                />
                              ) : (
                                <span className="admin-pick-fallback">NO</span>
                              )}
                            </span>
                            <span className="admin-pick-name">{pick.left_item?.name || "-"}</span>
                          </span>
                          <span className="admin-pick-vs">vs</span>
                          <span
                            className={`admin-pick-item ${
                              pick.selected_item?.id === pick.right_item?.id ? "is-winner" : ""
                            }`}
                          >
                            <span className="admin-pick-thumb admin-pick-thumb-large">
                              {pick.right_item?.id && itemImageMap.get(pick.right_item.id) ? (
                                <img
                                  src={itemImageMap.get(pick.right_item.id)}
                                  alt={pick.right_item.name || "right"}
                                />
                              ) : (
                                <span className="admin-pick-fallback">NO</span>
                              )}
                            </span>
                            <span className="admin-pick-name">{pick.right_item?.name || "-"}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
