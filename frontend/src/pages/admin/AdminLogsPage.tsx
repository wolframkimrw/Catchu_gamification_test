import { useEffect, useState } from "react";
import "./admin-games.css";
import { ApiError } from "../../api/http";
import {
  fetchAdminChoiceLogs,
  fetchAdminPickLogs,
  fetchAdminResultLogs,
  type AdminChoiceLog,
  type AdminPickLog,
  type AdminResultLog,
} from "../../api/games";
import { AdminShell } from "../../components/AdminShell";

type LogTab = "choices" | "picks" | "results";

export function AdminLogsPage() {
  const [activeTab, setActiveTab] = useState<LogTab>("choices");
  const [choiceLogs, setChoiceLogs] = useState<AdminChoiceLog[]>([]);
  const [pickLogs, setPickLogs] = useState<AdminPickLog[]>([]);
  const [resultLogs, setResultLogs] = useState<AdminResultLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const loader =
      activeTab === "choices"
        ? fetchAdminChoiceLogs()
        : activeTab === "picks"
        ? fetchAdminPickLogs()
        : fetchAdminResultLogs();
    loader
      .then((data) => {
        if (activeTab === "choices") {
          setChoiceLogs(data as AdminChoiceLog[]);
        } else if (activeTab === "picks") {
          setPickLogs(data as AdminPickLog[]);
        } else {
          setResultLogs(data as AdminResultLog[]);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "로그를 불러오지 못했습니다.");
        } else {
          setError("로그를 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [activeTab]);

  return (
    <AdminShell active="logs" title="결과/로그" description="최근 200건 기준으로 표시됩니다.">
      {error ? <div className="admin-games-error">{error}</div> : null}
      <div className="admin-log-tabs">
        <button type="button" className={activeTab === "choices" ? "active" : ""} onClick={() => setActiveTab("choices")}>
          게임 시작 로그
        </button>
        <button type="button" className={activeTab === "picks" ? "active" : ""} onClick={() => setActiveTab("picks")}>
          월드컵 픽 로그
        </button>
        <button type="button" className={activeTab === "results" ? "active" : ""} onClick={() => setActiveTab("results")}>
          결과 로그
        </button>
      </div>

      {isLoading ? (
        <div className="admin-games-empty">불러오는 중...</div>
      ) : activeTab === "choices" ? (
        <div className="admin-log-list">
          {choiceLogs.map((log) => (
            <div key={log.id} className="admin-log-row">
              <div>{log.game.title}</div>
              <div>{log.user ? log.user.name : "익명"}</div>
              <div>{log.source || "-"}</div>
              <div>{log.ip_address || "-"}</div>
            </div>
          ))}
        </div>
      ) : activeTab === "picks" ? (
        <div className="admin-log-list">
          {pickLogs.map((log) => (
            <div key={log.id} className="admin-log-row">
              <div>{log.game.title}</div>
              <div>choice #{log.choice_id}</div>
              <div>{log.selected_item ? log.selected_item.name : "-"}</div>
              <div>step {log.step_index + 1}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-log-list">
          {resultLogs.map((log) => (
            <div key={log.id} className="admin-log-row">
              <div>{log.game.title}</div>
              <div>choice #{log.choice_id}</div>
              <div>{log.winner_item ? log.winner_item.name : "-"}</div>
              <div>{log.result_title}</div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
