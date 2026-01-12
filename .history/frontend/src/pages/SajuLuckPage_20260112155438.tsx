import { useMemo, useState } from "react";
import "../pages/saju.css";
import { GameStartScreen } from "../components/GameStartScreen";
import sajuHero from "../assets/saju-hero.svg";
import {
  calculateLuckFromBirthDate,
  type CalendarType,
  type GenderType,
} from "../utils/sajuLuck";

const TABS = [
  { key: "today", label: "오늘운세" },
  { key: "newyear", label: "신년운세" },
  { key: "zodiac", label: "별자리운세" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type LuckResult = ReturnType<typeof calculateLuckFromBirthDate>;

export function SajuLuckPage() {
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [gender, setGender] = useState<GenderType | "">("");
  const [calendarType, setCalendarType] = useState<CalendarType>("SOLAR");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<LuckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(gender) && Boolean(birthDate),
    [gender, birthDate]
  );

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
    });
    setResult(next);
  };

  return (
    <div className="saju-page">
      {!started ? (
        <GameStartScreen
          title="오늘의 사주 운세"
          description="당신의 오늘을 가볍게 체크해 보세요."
          tags={[
            {
              label: "FORTUNE_TEST",
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
          onStart={() => setStarted(true)}
        />
      ) : (
        <>
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

          {result ? (
            <section className="saju-card saju-result">
              <div className="saju-group">
                {result.idiom ? (
                  <>
                    <p className="saju-group-label">&nbsp;</p>
                    <p className="saju-group-value saju-emphasis">오늘의 운세는...</p>
                    <p className="saju-group-label">&nbsp;</p>
                    <p className="saju-group-value saju-emphasis">
                      {result.idiom.text} ({result.idiom.reading})
                    </p>
                    <p className="saju-group-label">&nbsp;</p>
                    <p className="saju-group-value">{result.idiom.meaning}</p>
                    <p className="saju-group-label">&nbsp;</p>
                    <p className="saju-group-value">{result.idiom.message}</p>
                  </>
                ) : (
                  <p className="saju-group-value saju-emphasis">오늘의 운세는...</p>
                )}
              </div>
              <p className="saju-divider">*</p>
              <p className="saju-divider">*</p>
              <div className="saju-group">
                <p className="saju-group-label">공통 운세</p>
                <p className="saju-group-value saju-common-value">{result.message}</p>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
