import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./saju.css";
import { GameStartScreen } from "../../components/GameStartScreen";
import { TagIconFortune, TagIconCreator } from "../../components/GameStartIcons";
import sajuHero from "../../assets/saju-hero.svg";
import { fetchGameJsonFile, fetchGamesList, fetchGameDetail } from "../../api/games";
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
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [gender, setGender] = useState<GenderType | "">("");
  const [calendarType, setCalendarType] = useState<CalendarType>("SOLAR");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<LuckResult | null>(null);
  const [resultStep, setResultStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [idiomsData, setIdiomsData] = useState<IdiomsData | null>(null);
  const [fortuneJsonPath, setFortuneJsonPath] = useState("fortune/idioms.json");
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
          setFortuneJsonPath(`fortune/${sajuGame.slug}.json`);
          // 게임 상세 정보 조회
          return fetchGameDetail(sajuGame.id);
        }
      })
      .then((gameDetail) => {
        if (gameDetail) {
          setGameData(gameDetail.game);
        }
      })
      .catch(() => {
        // 게임 목록 실패는 UI 진행을 막지 않음
      });
  }, []);

  useEffect(() => {
    fetchGameJsonFile(fortuneJsonPath)
      .then((data) => {
        setIdiomsData(data as IdiomsData);
      })
      .catch(() => {
        // json 로드 실패는 기본값 사용
      });
  }, [fortuneJsonPath]);

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
          title={gameData?.title || "오늘의 사주 운세"}
          tags={[
            {
              label: "운세",
              icon: TagIconFortune,
            },
            ...(gameData?.created_by
              ? [
                  {
                    label: gameData.created_by.name,
                    icon: TagIconCreator,
                  },
                ]
              : []),
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
                        <p className="saju-group-value">
                          {splitMessageByDiamond(result.idiom.message).beforeDiamond}
                        </p>
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
                    {result.idiom ? (
                      <p className="saju-group-value">
                        🔹{splitMessageByDiamond(result.idiom.message).afterDiamond}
                      </p>
                    ) : null}
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
                      onClick={() => setResultStep(4)}
                    >
                      다음
                    </button>
                  </div>
                </section>
              ) : resultStep === 4 ? (
                <section className="saju-card saju-result">
                  <div className="saju-group">
                    <p className="saju-group-value saju-common-value">{result.message}</p>
                  </div>
                  <div className="saju-nav-buttons">
                    <button
                      className="btn"
                      type="button"
                      onClick={() => setResultStep(3)}
                    >
                      이전
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => navigate("/")}
                    >
                      홈으로
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
