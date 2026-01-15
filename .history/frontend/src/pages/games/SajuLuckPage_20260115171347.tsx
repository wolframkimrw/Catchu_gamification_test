import { useEffect, useMemo, useRef, useState } from "react";
import "./saju.css";
import { GameStartScreen } from "../../components/GameStartScreen";
import sajuHero from "../../assets/saju-hero.svg";
import { fetchGameJsonFile, fetchGamesList } from "../../api/games";
import { createGameResult } from "../../api/gamesSession";
import { useGameSessionStart } from "../../hooks/useGameSessionStart";
import {
  calculateLuckFromBirthDate,
  type CalendarType,
  type GenderType,
  type IdiomsData,
} from "../../utils/sajuLuck";

type LuckResult = ReturnType<typeof calculateLuckFromBirthDate>;

export function SajuLuckPage() {
  const [started, setStarted] = useState(false);
  const [gender, setGender] = useState<GenderType | "">("");
  const [calendarType, setCalendarType] = useState<CalendarType>("SOLAR");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<LuckResult | null>(null);
  const [resultStep, setResultStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const [idiomsData, setIdiomsData] = useState<IdiomsData | null>(null);
  const lastResultSessionRef = useRef<number | null>(null);
  const { sessionId, startSession } = useGameSessionStart(gameId, "saju_start");

  const splitMessageByDiamond = (message: string) => {
    const parts = message.split("🔹");
    return {
      beforeDiamond: parts[0] || "",
      afterDiamond: parts.slice(1).join("🔹"),
    };
  };

  const canSubmit = useMemo(
    () => Boolean(gender) && Boolean(birthDate),
    [gender, birthDate]
  );

  useEffect(() => {
    fetchGamesList()
      .then((games) => {
        const sajuGame = games.find((game) => game.slug === "saju-luck");
        if (sajuGame) {
          setGameId(sajuGame.id);
        }
      })
      .catch(() => {
        // 게임 목록 실패는 UI 진행을 막지 않음
      });
  }, []);

  useEffect(() => {
    fetchGameJsonFile("fortune/idioms.json")
      .then((data) => {
        setIdiomsData(data as IdiomsData);
      })
      .catch(() => {
        // json 로드 실패는 기본값 사용
      });
  }, []);

  const handleSubmit = () => {
    if (!canSubmit) {
      setError("모든 항목을 입력해 주세요.");
      return;
    }
    setError(null);
    const next = calculateLuckFromBirthDate({
      birthDate,
      gender: gender as GenderType,
      calendarType,
      idiomsData: idiomsData ?? undefined,
    });
    setResult(next);
    setResultStep(2);
  };

  useEffect(() => {
    if (!result || !gameId || !sessionId) {
      return;
    }
    if (lastResultSessionRef.current === sessionId) {
      return;
    }
    lastResultSessionRef.current = sessionId;
    void createGameResult({
      choice_id: sessionId,
      game_id: gameId,
      winner_item_id: null,
      result_title: "오늘의 사주 운세",
      result_code: "SAJU_LUCK",
      result_payload: result,
    }).catch(() => {
      // 결과 로그 실패는 진행을 막지 않음
    });
  }, [gameId, result, sessionId]);

  return (
    <>
      {!started ? (
        <GameStartScreen
          title="오늘의 사주 운세"
          description="당신의 오늘을 가볍게 체크해 보세요."
          tags={[
            {
              label: "운세",
              icon: (
                <svg viewBox="0 0 24 24" role="img">
                  <path
                    d="M4.5 7.5h15c1.1 0 2 .9 2 2v6.5a2 2 0 0 1-2 2h-1.4a2 2 0 0 1-1.72-.97L15.5 15H8.5l-.88 1.53a2 2 0 0 1-1.72.97H4.5a2 2 0 0 1-2-2V9.5c0-1.1.9-2 2-2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.5 11h-2m1-1v2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="16.5" cy="10.5" r="0.9" fill="currentColor" />
                  <circle cx="18.6" cy="12.2" r="0.9" fill="currentColor" />
                </svg>
              ),
            },
            {
              label: "예상 시간 2분",
              icon: (
                <svg viewBox="0 0 24 24" role="img">
                  <path
                    d="M9 3h6m-3 0v3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="12"
                    cy="13"
                    r="7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12 13l3-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ),
            },
          ]}
          media={<img src={sajuHero} alt="오늘의 사주 운세" />}
          buttonLabel="운세 시작"
          onStart={() => {
            setStarted(true);
            void startSession();
          }}
        />
      ) : (
        <div className="saju-page saju-game-started">
          {!result ? (
            <section className="saju-card">
              <h2>나의 정보 입력</h2>
              <div className="saju-form">
                <div className="saju-field">
                  <label>성별</label>
                  <div className="saju-toggle">
                    <button
                      type="button"
                      className={gender === "male" ? "active" : ""}
                      onClick={() => setGender("male")}
                    >
                      남
                    </button>
                    <button
                      type="button"
                      className={gender === "female" ? "active" : ""}
                      onClick={() => setGender("female")}
                    >
                      여
                    </button>
                  </div>
                </div>

                <div className="saju-field">
                  <label>달력 선택</label>
                  <div className="saju-toggle">
                    <button
                      type="button"
                      className={calendarType === "SOLAR" ? "active" : ""}
                      onClick={() => setCalendarType("SOLAR")}
                    >
                      양력
                    </button>
                    <button
                      type="button"
                      className={calendarType === "LUNAR" ? "active" : ""}
                      onClick={() => setCalendarType("LUNAR")}
                    >
                      음력
                    </button>
                  </div>
                  <p className="saju-hint">음력 선택은 MVP에서는 계산에 반영되지 않습니다.</p>
                </div>

                <div className="saju-field">
                  <label htmlFor="birthDate">생년월일</label>
                  <input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                  />
                </div>
              </div>

              {error ? <p className="saju-error">{error}</p> : null}

              <button
                className="btn btn-primary saju-submit"
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                운세 보기
              </button>
            </section>
          ) : (
            <>
              {resultStep === 2 ? (
                <section className="saju-card saju-result">
                  <div className="saju-group">
                    <p className="saju-group-label">&nbsp;</p>
                    <p className="saju-group-value saju-emphasis">오늘의 운세는...</p>
                    <p className="saju-group-label">&nbsp;</p>
                    {result.idiom ? (
                      <>
                        <p className="saju-group-value saju-emphasis saju-idiom-value">
                          {result.idiom.text} ({result.idiom.reading})
                        </p>
                        <p className="saju-group-value">{result.idiom.meaning}</p>
                        <p className="saju-group-label">&nbsp;</p>
                        <p className="saju-group-value">{result.idiom.message}</p>
                      </>
                    ) : null}
                  </div>
                  <div className="saju-nav-buttons">
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setResult(null);
                        setResultStep(0);
                      }}
                    >
                      뒤로
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => setResultStep(3)}
                    >
                      다음
                    </button>
                  </div>
                </section>
              ) : resultStep === 3 ? (
                <section className="saju-card saju-result">
                  <div className="saju-group">
                    <p className="saju-group-value saju-common-value">{result.message}</p>
                  </div>
                  <div className="saju-nav-buttons">
                    <button
                      className="btn"
                      type="button"
                      onClick={() => setResultStep(2)}
                    >
                      이전
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => {
                        setResult(null);
                        setResultStep(0);
                      }}
                    >
                      마침
                    </button>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      )}
    </>
  );
}
