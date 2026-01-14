import { useEffect, useMemo, useRef, useState } from "react";
import "./psycho-test.css";
import { GameStartScreen } from "../../components/GameStartScreen";
import { fetchGamesList } from "../../api/games";
import { createGameResult } from "../../api/gamesSession";
import { useGameSessionStart } from "../../hooks/useGameSessionStart";

type PsychoOption = {
  id: string;
  text: string;
  nextQuestionId?: string;
  resultId?: string;
};

type PsychoQuestion = {
  id: string;
  text: string;
  helper?: string;
  options: PsychoOption[];
};

type PsychoResult = {
  id: string;
  title: string;
  summary: string;
  details: string[];
};

type PsychoTemplate = {
  slug: string;
  title: string;
  description: string;
  tags: { label: string }[];
  questions: PsychoQuestion[];
  results: PsychoResult[];
};

const psychoTemplate: PsychoTemplate = {
  slug: "psycho-template",
  title: "심리테스트",
  description: "선택에 따라 결과가 달라지는 심리테스트 템플릿입니다.",
  tags: [{ label: "심리" }, { label: "선택형" }, { label: "3분" }],
  questions: [
    {
      id: "q1",
      text: "새로운 팀 프로젝트가 시작됐다. 나는?",
      helper: "가장 먼저 드는 생각을 골라보세요.",
      options: [
        { id: "q1-a", text: "구조부터 잡는다", nextQuestionId: "q2" },
        { id: "q1-b", text: "아이디어를 모은다", nextQuestionId: "q3" },
      ],
    },
    {
      id: "q2",
      text: "일정이 촉박할 때 나는?",
      options: [
        { id: "q2-a", text: "우선순위를 줄인다", resultId: "r1" },
        { id: "q2-b", text: "팀을 재정렬한다", resultId: "r2" },
      ],
    },
    {
      id: "q3",
      text: "새로운 기능을 제안할 때 나는?",
      options: [
        { id: "q3-a", text: "간단한 프로토타입", resultId: "r3" },
        { id: "q3-b", text: "스토리로 설명", resultId: "r4" },
      ],
    },
  ],
  results: [
    {
      id: "r1",
      title: "정리형 리더",
      summary: "핵심을 빠르게 정리하는 전략가입니다.",
      details: ["핵심을 먼저 정리", "불확실성을 줄이는 방식 선호", "명확한 체크리스트"],
    },
    {
      id: "r2",
      title: "조율형 리더",
      summary: "팀의 리듬을 맞추는 조율자입니다.",
      details: ["역할 분배에 능숙", "협업 분위기 중시", "커뮤니케이션 강점"],
    },
    {
      id: "r3",
      title: "실험형 크리에이터",
      summary: "작게 실험하고 크게 확장하는 타입입니다.",
      details: ["빠른 프로토타입", "피드백 주도", "실험을 즐김"],
    },
    {
      id: "r4",
      title: "스토리텔러",
      summary: "맥락과 의미를 엮어 전달하는 타입입니다.",
      details: ["설명과 설득에 강함", "큰 그림을 강조", "브랜드/콘셉트 지향"],
    },
  ],
};

const findResult = (template: PsychoTemplate, id: string | undefined) =>
  template.results.find((item) => item.id === id) || null;

export function PsychoTestPage() {
  const [started, setStarted] = useState(false);
  const [currentId, setCurrentId] = useState(psychoTemplate.questions[0]?.id ?? "");
  const [answers, setAnswers] = useState<{ questionId: string; optionId: string }[]>([]);
  const [result, setResult] = useState<PsychoResult | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const lastResultSessionRef = useRef<number | null>(null);
  const { sessionId, startSession } = useGameSessionStart(gameId, "psycho_start");

  useEffect(() => {
    fetchGamesList()
      .then((games) => {
        const match = games.find((game) => game.slug === psychoTemplate.slug);
        if (match) {
          setGameId(match.id);
        }
      })
      .catch(() => {
        // 목록 실패는 진행을 막지 않음
      });
  }, []);

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
      result_title: result.title,
      result_code: "PSYCHO_TEST",
      result_payload: { resultId: result.id, answers },
    }).catch(() => {
      // 결과 로그 실패는 진행을 막지 않음
    });
  }, [answers, gameId, result, sessionId]);

  const question = useMemo(
    () => psychoTemplate.questions.find((item) => item.id === currentId) || null,
    [currentId]
  );

  const totalQuestions = psychoTemplate.questions.length;
  const currentIndex = useMemo(() => {
    const index = psychoTemplate.questions.findIndex((item) => item.id === currentId);
    return index === -1 ? 0 : index + 1;
  }, [currentId]);

  const handleStart = () => {
    setStarted(true);
    setResult(null);
    setAnswers([]);
    setCurrentId(psychoTemplate.questions[0]?.id ?? "");
    void startSession();
  };

  const handleOptionSelect = (option: PsychoOption) => {
    if (!question) {
      return;
    }
    setAnswers((prev) => [...prev, { questionId: question.id, optionId: option.id }]);
    if (option.nextQuestionId) {
      setCurrentId(option.nextQuestionId);
      return;
    }
    if (option.resultId) {
      setResult(findResult(psychoTemplate, option.resultId));
    }
  };

  const handleRestart = () => {
    setResult(null);
    setAnswers([]);
    setCurrentId(psychoTemplate.questions[0]?.id ?? "");
  };

  return (
    <div className="psycho-page">
      {!started ? (
        <GameStartScreen
          title={psychoTemplate.title}
          description={psychoTemplate.description}
          tags={psychoTemplate.tags.map((tag) => ({ label: tag.label }))}
          buttonLabel="테스트 시작"
          onStart={handleStart}
        />
      ) : result ? (
        <section className="psycho-card psycho-result">
          <div className="psycho-result-header">
            <span className="psycho-badge">RESULT</span>
            <h2>{result.title}</h2>
            <p>{result.summary}</p>
          </div>
          <ul className="psycho-result-list">
            {result.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
          <div className="psycho-actions">
            <button type="button" className="btn btn-primary" onClick={handleRestart}>
              다시 하기
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStarted(false)}>
              나가기
            </button>
          </div>
        </section>
      ) : (
        <section className="psycho-card">
          <div className="psycho-progress">
            <span>
              {currentIndex} / {totalQuestions}
            </span>
          </div>
          <h2 className="psycho-question">{question?.text}</h2>
          {question?.helper ? <p className="psycho-helper">{question.helper}</p> : null}
          <div className="psycho-options">
            {question?.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="psycho-option"
                onClick={() => handleOptionSelect(option)}
              >
                {option.text}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
