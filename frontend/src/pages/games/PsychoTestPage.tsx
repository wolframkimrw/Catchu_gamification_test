import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./worldcup.css";
import "./psycho-test.css";
import "./major-arcana.css";
import { GameStartScreen } from "../../components/GameStartScreen";
import { MajorArcanaResultActions } from "../../components/MajorArcanaResultActions";
import { fetchGamesList } from "../../api/games";
import { createGameResult } from "../../api/gamesSession";
import { useGameSessionStart } from "../../hooks/useGameSessionStart";

type PsychoOption = {
  id: string;
  text: string;
  image_url?: string;
  weights?: Record<string, number>;
  score?: number;
  nextQuestionId?: string;
};

type PsychoQuestion = {
  id: string;
  text: string;
  helper?: string;
  options: PsychoOption[];
};

type PsychoCard = {
  id: string;
  label: string;
  summary?: string;
  keywords?: string[];
  image_url?: string;
  min_score?: number;
  max_score?: number;
};

type PsychoScoringRules = {
  mode?: "TOTAL" | "WEIGHTED";
  min?: number;
  max?: number;
  minNegative?: number;
  threshold?: number;
  maxResults?: number;
  patterns?: string[];
};

type PsychoTemplate = {
  slug: string;
  game_slug?: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  tags: { label: string }[];
  scoring: PsychoScoringRules;
  cards: PsychoCard[];
  questions: PsychoQuestion[];
};

type PsychoAnswer = {
  questionId: string;
  optionId: string;
};

type PsychoOutcome = {
  main: PsychoCard;
  secondary: PsychoCard[];
  scores: Record<string, number>;
  points: Record<string, number>;
  totalScore?: number;
};

const DEFAULT_SLUG = "major-arcana";
const templates = import.meta.glob<{ default: PsychoTemplate }>(
  "../../utils/psycho/*.json",
  { eager: true }
);

const getNextQuestionId = (template: PsychoTemplate, currentId: string) => {
  const index = template.questions.findIndex((item) => item.id === currentId);
  if (index === -1) {
    return "";
  }
  return template.questions[index + 1]?.id ?? "";
};

type PsychoScoreResult = {
  scores: Record<string, number>;
  points: Record<string, number>;
  totalScore?: number;
};

const computeScores = (
  template: PsychoTemplate,
  answers: PsychoAnswer[]
): PsychoScoreResult => {
  if (template.scoring?.mode === "TOTAL") {
    const optionMap = new Map<string, PsychoOption>();
    template.questions.forEach((question) => {
      question.options.forEach((option) => {
        optionMap.set(`${question.id}:${option.id}`, option);
      });
    });
    const totalScore = answers.reduce((acc, answer) => {
      const option = optionMap.get(`${answer.questionId}:${answer.optionId}`);
      if (!option) {
        return acc;
      }
      return acc + Number(option.score || 0);
    }, 0);
    const emptyScores: Record<string, number> = {};
    return { scores: emptyScores, points: emptyScores, totalScore };
  }

  const points = Object.fromEntries(template.cards.map((card) => [card.id, 0])) as Record<
    string,
    number
  >;
  const optionMap = new Map<string, PsychoOption>();
  template.questions.forEach((question) => {
    question.options.forEach((option) => {
      optionMap.set(`${question.id}:${option.id}`, option);
    });
  });
  answers.forEach((answer) => {
    const option = optionMap.get(`${answer.questionId}:${answer.optionId}`);
    if (!option) {
      return;
    }
    Object.entries(option.weights ?? {}).forEach(([cardId, value]) => {
      if (typeof points[cardId] === "number") {
        if (value < 0) {
          points[cardId] = Math.max(0, points[cardId] + value);
        } else {
          points[cardId] += value;
        }
      }
    });
  });
  const scores = Object.fromEntries(
    Object.entries(points).map(([cardId, total]) => {
      if (total <= 0) {
        return [cardId, 0];
      }
      let product = 1;
      for (let idx = 0; idx < total; idx += 1) {
        product *= idx * 2 + 1;
      }
      return [cardId, product];
    })
  ) as Record<string, number>;
  return { scores, points };
};

const resolveOutcome = (template: PsychoTemplate, answers: PsychoAnswer[]): PsychoOutcome => {
  const { scores, points, totalScore } = computeScores(template, answers);
  if (template.scoring?.mode === "TOTAL") {
    const resolvedScore = Number(totalScore || 0);
    const sorted = [...template.cards].sort((a, b) => {
      const aMin = a.min_score ?? 0;
      const bMin = b.min_score ?? 0;
      return aMin - bMin;
    });
    const matched = sorted.filter((card) => {
      const minScore = card.min_score ?? 0;
      const maxScore = card.max_score ?? Number.POSITIVE_INFINITY;
      return resolvedScore >= minScore && resolvedScore <= maxScore;
    });
    const picked =
      matched.length > 0
        ? matched[matched.length - 1]
        : sorted.find((card) => resolvedScore >= (card.min_score ?? 0)) || sorted[0];
    return {
      main: picked,
      secondary: [],
      scores,
      points,
      totalScore: resolvedScore,
    };
  }

  const maxPoints = Math.max(...Object.values(points), 0);
  const threshold = template.scoring.threshold ?? 0;
  const eligible = template.cards.filter(
    (card) => (points[card.id] ?? 0) >= threshold
  );
  const pool =
    eligible.length > 0
      ? eligible.filter((card) => (points[card.id] ?? 0) === maxPoints)
      : template.cards.filter((card) => (points[card.id] ?? 0) === maxPoints);
  const picked =
    pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : template.cards[0];
  return {
    main: picked,
    secondary: [],
    scores,
    points,
  };
};

export function PsychoTestPage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [template, setTemplate] = useState<PsychoTemplate | null>(null);
  const [currentId, setCurrentId] = useState("");
  const [answers, setAnswers] = useState<PsychoAnswer[]>([]);
  const [result, setResult] = useState<PsychoOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const lastResultSessionRef = useRef<number | null>(null);
  const { sessionId, startSession } = useGameSessionStart(gameId, "psycho_start");

  useEffect(() => {
    const resolvedSlug = slug || DEFAULT_SLUG;
    const entry = Object.entries(templates).find(([key]) =>
      key.endsWith(`/${resolvedSlug}.json`)
    );
    if (!entry) {
      setError("테스트 데이터를 불러오지 못했습니다.");
      return;
    }
    const data = entry[1].default;
    setTemplate(data);
    const firstId = data.questions?.[0]?.id ?? "";
    setCurrentId(firstId);
  }, [slug]);

  useEffect(() => {
    if (!template) {
      return;
    }
    fetchGamesList()
      .then((games) => {
        const match = games.find((game) => game.slug === (template.game_slug || template.slug));
        if (match) {
          setGameId(match.id);
        }
      })
      .catch(() => {
        // 목록 실패는 진행을 막지 않음
      });
  }, [template]);

  useEffect(() => {
    if (!result || !gameId || !sessionId || !template) {
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
      result_title: result.main.label,
      result_code: "PSYCHO_TEST",
      result_payload: {
        template: template.slug,
        main: result.main.id,
        secondary: result.secondary.map((card) => card.id),
        scores: result.scores,
        points: result.points,
        answers,
        rules: template.scoring,
        totalScore: result.totalScore,
      },
    }).catch(() => {
      // 결과 로그 실패는 진행을 막지 않음
    });
  }, [answers, gameId, result, sessionId, template]);

  const question = useMemo(
    () => template?.questions.find((item) => item.id === currentId) || null,
    [currentId, template]
  );

  const totalQuestions = template?.questions.length ?? 0;
  const currentIndex = useMemo(() => {
    if (!template) {
      return 0;
    }
    const index = template.questions.findIndex((item) => item.id === currentId);
    return index === -1 ? 0 : index + 1;
  }, [currentId, template]);

  const handleStart = () => {
    if (!template) {
      return;
    }
    setStarted(true);
    setResult(null);
    setAnswers([]);
    setCurrentId(template.questions[0]?.id ?? "");
    void startSession();
  };

  const handleOptionSelect = (option: PsychoOption) => {
    if (!question || !template) {
      return;
    }
    setAnswers((prev) => [...prev, { questionId: question.id, optionId: option.id }]);
    const nextId = option.nextQuestionId || getNextQuestionId(template, question.id);
    if (nextId) {
      setCurrentId(nextId);
      return;
    }
    setResult(resolveOutcome(template, [...answers, { questionId: question.id, optionId: option.id }]));
  };

  const handleRestart = () => {
    if (!template) {
      return;
    }
    setResult(null);
    setAnswers([]);
    setCurrentId(template.questions[0]?.id ?? "");
  };

  return (
    <>
      {!started ? (
        <GameStartScreen
          title={template?.title || "심리테스트"}
          description={template?.description || "테스트 데이터를 불러오는 중입니다."}
          badge="TEST"
          tags={(template?.tags || []).map((tag) => ({ label: tag.label }))}
          media={
            template?.thumbnail_url ? (
              <img
                className="game-start-thumb"
                src={template.thumbnail_url}
                alt={template.title}
              />
            ) : (
              <div className="game-start-art">🔮</div>
            )
          }
          buttonLabel="테스트 시작"
          onStart={handleStart}
        />
      ) : (
        <div className="major-arcana-page">
          {error ? (
            <div className="psycho-card psycho-result">
              <p>{error}</p>
            </div>
          ) : result ? (
            <div
              className={`arcana-page arcana-${result.main.id}`}
              style={
                result.main.image_url
                  ? ({ "--arcana-card-image": `url("${result.main.image_url}")` } as CSSProperties)
                  : undefined
              }
            >
              <div className="arcana-page-header">
                <span className="arcana-page-badge">RESULT</span>
                <div className="arcana-card-visual">
                  <div className="arcana-card-frame">
                  </div>
                </div>
                <h2>{result.main.label}</h2>
                <ul className="arcana-page-list">
                  {result.main.keywords?.map((keyword) => (
                    <li key={keyword}>{keyword}</li>
                  ))}
                </ul>
                {result.main.summary ? (
                  <p className="arcana-page-summary">{result.main.summary}</p>
                ) : null}
              </div>
              <MajorArcanaResultActions
                onRetry={handleRestart}
                onExit={() => setStarted(false)}
                onHome={() => navigate("/")}
              />
            </div>
          ) : (
            <div className="psycho-card">
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
                    className={`psycho-option ${option.image_url ? "has-media" : ""}`}
                    onClick={() => handleOptionSelect(option)}
                  >
                    {option.image_url ? (
                      <img
                        className="psycho-option-media"
                        src={option.image_url}
                        alt={option.text}
                      />
                    ) : null}
                    <span className="psycho-option-text">{option.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
