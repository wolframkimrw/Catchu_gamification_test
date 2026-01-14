import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import "./worldcup.css";
import { fetchGameResult } from "../../api/gamesSession";
import type { GameResultDetail } from "../../api/gamesSession";
import placeholderImage from "../../assets/worldcup-placeholder.svg";
import { getStoredGameSessionId } from "../../utils/gameSession";

type ResultPayload = {
  gameId: number;
  gameTitle: string;
  round: number;
  totalItems: number;
  champion: {
    id: number;
    name: string;
    file_name: string;
    sort_order: number;
  };
  ranking: {
    id: number;
    name: string;
    file_name: string;
    sort_order: number;
    wins: number;
  }[];
};

type LocationState = ResultPayload | null;

const getMediaUrl = (fileName: string) => {
  if (!fileName) return null;
  if (fileName.startsWith("http://") || fileName.startsWith("https://") || fileName.startsWith("/")) {
    return fileName;
  }
  return null;
};

const isVideo = (url: string | null) => {
  if (!url) return false;
  return /\.(mp4|mov|webm|ogg)$/i.test(url);
};

const normalizeRanking = (rankingValue: unknown): ResultPayload["ranking"] => {
  if (!Array.isArray(rankingValue)) return [];
  return rankingValue
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const id = Number(record.id);
      if (!Number.isFinite(id)) return null;
      return {
        id,
        name: typeof record.name === "string" ? record.name : "",
        file_name: typeof record.file_name === "string" ? record.file_name : "",
        sort_order: Number(record.sort_order ?? 0),
        wins: Number(record.wins ?? 0),
      };
    })
    .filter((entry): entry is ResultPayload["ranking"][number] => !!entry);
};

const mapResultFromApi = (data: GameResultDetail): ResultPayload | null => {
  const payload = data.result_payload ?? {};
  const payloadRecord = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const championFromPayload = payloadRecord.champion as Record<string, unknown> | undefined;
  const payloadChampionId = championFromPayload ? Number(championFromPayload.id) : NaN;
  const winner = data.winner_item;

  const champion = winner
    ? {
        id: winner.id,
        name: winner.name || "",
        file_name: winner.file_name || "",
        sort_order: Number(championFromPayload?.sort_order ?? 0),
      }
    : Number.isFinite(payloadChampionId)
    ? {
        id: payloadChampionId,
        name: typeof championFromPayload?.name === "string" ? championFromPayload.name : "",
        file_name: typeof championFromPayload?.file_name === "string" ? championFromPayload.file_name : "",
        sort_order: Number(championFromPayload?.sort_order ?? 0),
      }
    : null;

  if (!champion) {
    return null;
  }

  const ranking = normalizeRanking(payloadRecord.ranking);
  const totalItemsValue = Number(payloadRecord.total_items ?? payloadRecord.totalItems ?? ranking.length || 0);
  const roundValue = Number(payloadRecord.round ?? 0);

  return {
    gameId: data.game.id,
    gameTitle: data.game.title,
    round: Number.isFinite(roundValue) ? roundValue : 0,
    totalItems: Number.isFinite(totalItemsValue) ? totalItemsValue : ranking.length || 0,
    champion,
    ranking: ranking.length ? ranking : [ { ...champion, wins: 1 } ],
  };
};

export function WorldcupResultPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const parsedGameId = useMemo(() => {
    const idNumber = Number(gameId);
    return Number.isFinite(idNumber) ? idNumber : null;
  }, [gameId]);
  const [result, setResult] = useState<ResultPayload | null>(() => {
    const state = location.state as LocationState;
    return state || null;
  });

  useEffect(() => {
    if (!parsedGameId || result) {
      return;
    }
    const stored = sessionStorage.getItem(`worldcup-result-${parsedGameId}`);
    if (!stored) {
      const sessionId = getStoredGameSessionId(parsedGameId);
      if (!sessionId) {
        return;
      }
      fetchGameResult(sessionId)
        .then((data) => {
          if (!data.result) {
            return;
          }
          const mapped = mapResultFromApi(data.result);
          if (mapped) {
            setResult(mapped);
          }
        })
        .catch(() => {
          // 결과 조회 실패는 빈 상태로 둠
        });
      return;
    }
    try {
      const parsed = JSON.parse(stored) as ResultPayload;
      setResult(parsed);
    } catch {
      const sessionId = getStoredGameSessionId(parsedGameId);
      if (!sessionId) {
        return;
      }
      fetchGameResult(sessionId)
        .then((data) => {
          if (!data.result) {
            return;
          }
          const mapped = mapResultFromApi(data.result);
          if (mapped) {
            setResult(mapped);
          }
        })
        .catch(() => {
          // 결과 조회 실패는 빈 상태로 둠
        });
    }
  }, [parsedGameId, result]);

  if (parsedGameId === null) {
    return <div className="worldcup-result-page">잘못된 게임 ID 입니다.</div>;
  }

  if (!result) {
    return (
      <div className="worldcup-result-page">
        <div className="worldcup-dashboard">
          <div className="worldcup-dashboard-empty">
            <h2 className="result-title">결과를 찾을 수 없습니다.</h2>
            <p className="result-sub">게임을 다시 시작해 주세요.</p>
            <div className="game-actions">
              <Link to={`/worldcup/${parsedGameId}/play`} className="btn btn-primary">
                다시 플레이
              </Link>
              <Link to="/" className="btn btn-ghost">
                리스트로
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mediaUrl = getMediaUrl(result.champion.file_name);
  const video = isVideo(mediaUrl);

  return (
    <div className="worldcup-result-page">
      <div className="worldcup-dashboard">
        <header className="worldcup-dashboard-header">
          <div>
            <span className="badge badge-hot">WORLD CUP</span>
            <h2 className="worldcup-dashboard-title">{result.gameTitle}</h2>
          </div>
          <div className="worldcup-dashboard-actions">
            <Link to={`/worldcup/${parsedGameId}/play`} className="btn btn-primary">
              다시 플레이
            </Link>
            <Link to="/" className="btn btn-ghost">
              리스트로
            </Link>
          </div>
        </header>
        <div className="worldcup-dashboard-grid">
          <section className="worldcup-dashboard-rank">
            <h3>승리 랭킹</h3>
            <div className="worldcup-rank-table">
              {result.ranking.map((entry, index) => {
                const entryMedia = getMediaUrl(entry.file_name);
                const entryVideo = isVideo(entryMedia);
                return (
                  <div key={entry.id} className="worldcup-rank-row">
                    <div className="worldcup-rank-order">{index + 1}</div>
                    <div className="worldcup-rank-media">
                      {entryMedia ? (
                        entryVideo ? (
                          <video src={entryMedia} muted playsInline />
                        ) : (
                          <img src={entryMedia} alt={entry.name || entry.file_name} />
                        )
                      ) : (
                        <div className="worldcup-rank-fallback">
                          <img src={placeholderImage} alt="NO IMAGE" />
                        </div>
                      )}
                    </div>
                    <div className="worldcup-rank-name">{entry.name || entry.file_name}</div>
                    <div className="worldcup-rank-score">{entry.wins}승</div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="worldcup-dashboard-hero">
            <div className="result-badges">
              <span className="badge badge-hot">WINNER</span>
              <span className="badge badge-new">FINAL</span>
            </div>
            <div className="result-media">
              {mediaUrl ? (
                video ? (
                  <video src={mediaUrl} controls playsInline muted loop />
                ) : (
                  <img src={mediaUrl} alt={result.champion.name || result.champion.file_name} />
                )
              ) : (
                <div className="arena-media-fallback">
                  <img src={placeholderImage} alt="NO IMAGE" />
                </div>
              )}
            </div>
            <h3 className="result-title">{result.champion.name || result.champion.file_name}</h3>
            <p className="result-sub">이번 월드컵의 우승자입니다.</p>
          </section>
          <section className="worldcup-dashboard-stats">
            <div className="worldcup-stat-card">
              <span>총 강수</span>
              <strong>{result.totalItems}강</strong>
            </div>
            <div className="worldcup-stat-card">
              <span>완료 라운드</span>
              <strong>{result.round}라운드</strong>
            </div>
            <div className="worldcup-stat-card">
              <span>게임 ID</span>
              <strong>#{result.gameId}</strong>
            </div>
          </section>
          <section className="worldcup-dashboard-summary">
            <h4>결과 요약</h4>
            <p>
              오늘의 월드컵에서 최종 우승자는
              <strong> {result.champion.name || result.champion.file_name}</strong>
              입니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
