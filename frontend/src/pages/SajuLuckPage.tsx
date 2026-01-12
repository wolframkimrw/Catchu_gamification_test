import { useMemo, useState } from "react";
import "../pages/saju.css";
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
        <section className="saju-start">
          <header className="saju-hero">
            <div>
              <p className="badge badge-hot">FORTUNE TEST</p>
              <h1>오늘의 사주 운세</h1>
              <p>당신의 오늘을 가볍게 체크해 보세요.</p>
            </div>
            <div className="saju-hero-mark">🔮</div>
          </header>
          <button
            className="btn btn-primary saju-start-btn"
            type="button"
            onClick={() => setStarted(true)}
          >
            운세 시작
          </button>
        </section>
      ) : (
        <>
          <header className="saju-hero">
            <div>
              <p className="badge badge-hot">FORTUNE TEST</p>
              <h1>오늘의 사주 운세</h1>
              <p>당신의 오늘을 가볍게 체크해 보세요.</p>
            </div>
            <div className="saju-hero-mark">🔮</div>
          </header>

          <div className="saju-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`saju-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.key !== "today" ? <span className="badge badge-new">준비중</span> : null}
              </button>
            ))}
          </div>

          {activeTab !== "today" ? (
            <div className="saju-card saju-empty">아직 준비 중인 콘텐츠입니다.</div>
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
                <section className="saju-card">
                  <div className="saju-result-header">
                    <div>
                      <p className="badge badge-hot">TODAY SCORE</p>
                      <h2>{result.score}점 · {result.grade.toUpperCase()}</h2>
                      <p className="saju-result-message">{result.message}</p>
                    </div>
                    <div className="saju-score-circle">{result.score}</div>
                  </div>

                  <div className="saju-grid">
                    <div className="saju-panel">
                      <h3>사자성어</h3>
                      {result.idiom ? (
                        <>
                          <p className="saju-idiom-text">{result.idiom.text}</p>
                          <p className="saju-idiom-meaning">{result.idiom.meaning}</p>
                          {result.idiom.message ? (
                            <p className="saju-idiom-message">{result.idiom.message}</p>
                          ) : null}
                        </>
                      ) : (
                        <p>오늘의 사자성어가 없습니다.</p>
                      )}
                    </div>
                    <div className="saju-panel">
                      <h3>오늘 정보</h3>
                      <ul>
                        <li>날짜: {result.meta.todayDate}</li>
                        <li>요일: {result.meta.todayWeekday}</li>
                        <li>요일 오행: {result.meta.weekdayElement}</li>
                      </ul>
                    </div>
                    <div className="saju-panel">
                      <h3>내 정보</h3>
                      <ul>
                        <li>성별: {gender === "male" ? "남" : "여"}</li>
                        <li>생년월일: {birthDate}</li>
                        <li>달력: {calendarType === "SOLAR" ? "양력" : "음력"}</li>
                        <li>천간: {result.meta.birthStem}</li>
                      </ul>
                    </div>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
