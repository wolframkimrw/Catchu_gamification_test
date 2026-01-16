import { useEffect, useRef, useState } from "react";
import "../pages/admin/admin-games.css";
import { ApiError } from "../api/http";
import { fetchGameJsonFile, saveAdminJsonFile, savePsychoTemplate } from "../api/games";
import { validateImageFile, validateImageUrl } from "../utils/imageValidation";

type GameJsonEditorProps = {
  jsonPath: string;
  gameSlug: string;
  gameType: string;
  onCancel?: () => void;
};

type IdiomEntry = {
  key: string;
  text: string;
  reading: string;
  meaning: string;
  message: string;
};

type PsychoScoringForm = {
  mode: "WEIGHTED" | "TOTAL";
  min: string;
  max: string;
  minNegative: string;
  threshold: string;
  maxResults: string;
  patterns: string;
};

type PsychoCardForm = {
  id: string;
  label: string;
  summary: string;
  keywords: string;
  imageFile: File | null;
  imageUrl: string;
  previewUrl: string;
  minScore: string;
  maxScore: string;
};

type PsychoOptionForm = {
  id: string;
  text: string;
  score: string;
  nextQuestionId: string;
  imageFile: File | null;
  imageUrl: string;
  previewUrl: string;
  weights: Record<string, string>;
};

type PsychoQuestionForm = {
  id: string;
  text: string;
  helper: string;
  options: PsychoOptionForm[];
};

const makeId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });

const isDataUrl = (value: string) => value.startsWith("data:");

export function GameJsonEditor({ jsonPath, gameSlug, gameType, onCancel }: GameJsonEditorProps) {
  const isSajuJson = gameType === "FORTUNE_TEST";
  const isPsychoJson = gameType === "PSYCHO_TEST" || gameType === "PSYCHOLOGICAL";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingJson, setIsSavingJson] = useState(false);
  const [activeBucket, setActiveBucket] = useState<"high" | "mid" | "low">("high");
  const [idiomBuckets, setIdiomBuckets] = useState<{
    high: IdiomEntry[];
    mid: IdiomEntry[];
    low: IdiomEntry[];
  }>({ high: [], mid: [], low: [] });
  const [activeEntryIndex, setActiveEntryIndex] = useState<number | null>(null);
  const [isSajuDeleteMode, setIsSajuDeleteMode] = useState(false);
  const [selectedSajuIndexes, setSelectedSajuIndexes] = useState<number[]>([]);
  const [psychoSlug, setPsychoSlug] = useState("");
  const [psychoTitle, setPsychoTitle] = useState("");
  const [psychoDescription, setPsychoDescription] = useState("");
  const [psychoTags, setPsychoTags] = useState("");
  const [psychoThumbnailFile, setPsychoThumbnailFile] = useState<File | null>(null);
  const [psychoThumbnailUrl, setPsychoThumbnailUrl] = useState("");
  const [psychoThumbnailPreview, setPsychoThumbnailPreview] = useState("");
  const [psychoScoring, setPsychoScoring] = useState<PsychoScoringForm>({
    mode: "WEIGHTED",
    min: "",
    max: "",
    minNegative: "",
    threshold: "",
    maxResults: "",
    patterns: "",
  });
  const [psychoCards, setPsychoCards] = useState<PsychoCardForm[]>([]);
  const [psychoQuestions, setPsychoQuestions] = useState<PsychoQuestionForm[]>([]);
  const [psychoExtras, setPsychoExtras] = useState<Record<string, unknown>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
  const psychoCardsRef = useRef<PsychoCardForm[]>([]);
  const psychoQuestionsRef = useRef<PsychoQuestionForm[]>([]);
  const psychoThumbnailRef = useRef("");
  const lastLoadedContentRef = useRef<Record<string, unknown> | null>(null);

  const applyJsonContent = (content: Record<string, unknown> | null) => {
    if (isSajuJson) {
      const data = (content || {}) as Record<string, IdiomEntry[]>;
      setIdiomBuckets({
        high: Array.isArray(data.high) ? data.high : [],
        mid: Array.isArray(data.mid) ? data.mid : [],
        low: Array.isArray(data.low) ? data.low : [],
      });
      return;
    }
    if (isPsychoJson) {
      const data = content && typeof content === "object" ? content : {};
      const {
        slug,
        game_slug,
        title,
        description,
        thumbnail_url,
        tags,
        scoring,
        cards,
        questions,
        ...rest
      } = data as {
        slug?: string;
        game_slug?: string;
        title?: string;
        description?: string;
        thumbnail_url?: string;
        tags?: Array<{ label: string }>;
        scoring?: Partial<Record<string, unknown>>;
        cards?: Array<Record<string, unknown>>;
        questions?: Array<Record<string, unknown>>;
      };
      setPsychoExtras(rest);
      setPsychoSlug(slug || game_slug || gameSlug);
      setPsychoTitle(String(title || ""));
      setPsychoDescription(String(description || ""));
      setPsychoTags(
        Array.isArray(tags) ? tags.map((tag) => tag.label).filter(Boolean).join(", ") : ""
      );
      setPsychoThumbnailFile(null);
      setPsychoThumbnailUrl(String(thumbnail_url || ""));
      setPsychoThumbnailPreview(String(thumbnail_url || ""));
      const scoringRecord = (scoring || {}) as Record<string, unknown>;
      setPsychoScoring({
        mode:
          scoringRecord.mode === "TOTAL"
            ? "TOTAL"
            : scoringRecord.mode === "WEIGHTED"
              ? "WEIGHTED"
              : "WEIGHTED",
        min: scoringRecord.min !== undefined ? String(scoringRecord.min) : "",
        max: scoringRecord.max !== undefined ? String(scoringRecord.max) : "",
        minNegative:
          scoringRecord.minNegative !== undefined ? String(scoringRecord.minNegative) : "",
        threshold:
          scoringRecord.threshold !== undefined ? String(scoringRecord.threshold) : "",
        maxResults:
          scoringRecord.maxResults !== undefined ? String(scoringRecord.maxResults) : "",
        patterns: Array.isArray(scoringRecord.patterns)
          ? scoringRecord.patterns.map(String).join(", ")
          : "",
      });
      setPsychoCards(
        Array.isArray(cards)
          ? cards.map((card) => ({
            id: String(card.id || ""),
            label: String(card.label || ""),
            summary: String(card.summary || ""),
            keywords: Array.isArray(card.keywords)
              ? card.keywords.map(String).join(", ")
              : String(card.keywords || ""),
            imageFile: null,
            imageUrl: String(card.image_url || ""),
            previewUrl: "",
            minScore:
              card.min_score !== undefined && card.min_score !== null
                ? String(card.min_score)
                : "",
            maxScore:
              card.max_score !== undefined && card.max_score !== null
                ? String(card.max_score)
                : "",
          }))
          : []
      );
      setPsychoQuestions(
        Array.isArray(questions)
          ? questions.map((question) => ({
            id: String(question.id || ""),
            text: String(question.text || ""),
            helper: String(question.helper || ""),
            options: Array.isArray(question.options)
              ? question.options.map((option: Record<string, unknown>) => ({
                id: String(option.id || ""),
                text: String(option.text || ""),
                score:
                  option.score !== undefined && option.score !== null
                    ? String(option.score)
                    : "",
                nextQuestionId: String(option.nextQuestionId || ""),
                imageFile: null,
                imageUrl: String(option.image_url || ""),
                previewUrl: "",
                weights:
                  option.weights && typeof option.weights === "object"
                    ? Object.fromEntries(
                      Object.entries(option.weights as Record<string, unknown>).map(
                        ([key, value]) => [key, String(value)]
                      )
                    )
                    : {},
              }))
              : [],
          }))
          : []
      );
    }
  };

  const toggleCardExpanded = (cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const toggleQuestionExpanded = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const toggleOptionExpanded = (optionId: string) => {
    setExpandedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  };

  useEffect(() => {
    psychoCardsRef.current = psychoCards;
  }, [psychoCards]);

  useEffect(() => {
    psychoQuestionsRef.current = psychoQuestions;
  }, [psychoQuestions]);

  useEffect(() => {
    psychoThumbnailRef.current = psychoThumbnailPreview;
  }, [psychoThumbnailPreview]);

  useEffect(() => {
    return () => {
      if (psychoThumbnailRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(psychoThumbnailRef.current);
      }
      psychoCardsRef.current.forEach((card) => {
        if (card.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(card.previewUrl);
        }
      });
      psychoQuestionsRef.current.forEach((question) => {
        question.options.forEach((option) => {
          if (option.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(option.previewUrl);
          }
        });
      });
    };
  }, []);

  useEffect(() => {
    if (!jsonPath) {
      setIdiomBuckets({ high: [], mid: [], low: [] });
      setPsychoSlug("");
      setPsychoTitle("");
      setPsychoDescription("");
      setPsychoTags("");
      setPsychoThumbnailFile(null);
      setPsychoThumbnailUrl("");
      setPsychoThumbnailPreview("");
      setPsychoScoring({
        mode: "WEIGHTED",
        min: "",
        max: "",
        minNegative: "",
        threshold: "",
        maxResults: "",
        patterns: "",
      });
      setPsychoCards([]);
      setPsychoQuestions([]);
      setPsychoExtras({});
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchGameJsonFile(jsonPath)
      .then((content) => {
        lastLoadedContentRef.current = content as Record<string, unknown>;
        applyJsonContent(lastLoadedContentRef.current);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.meta.message || "JSON을 불러오지 못했습니다.");
        } else {
          setError("JSON을 불러오지 못했습니다.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [gameSlug, isPsychoJson, isSajuJson, jsonPath]);

  const handleCancelJson = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (lastLoadedContentRef.current) {
      setError(null);
      applyJsonContent(lastLoadedContentRef.current);
    }
  };

  const updateEntry = (index: number, updates: Partial<IdiomEntry>) => {
    setIdiomBuckets((prev) => {
      const next = [...prev[activeBucket]];
      next[index] = { ...next[index], ...updates };
      return { ...prev, [activeBucket]: next };
    });
  };

  const addEntry = () => {
    setIdiomBuckets((prev) => {
      const next = [
        ...prev[activeBucket],
        { key: "", text: "", reading: "", meaning: "", message: "" },
      ];
      setActiveEntryIndex(next.length - 1);
      return { ...prev, [activeBucket]: next };
    });
  };

  const clampTextarea = (element: HTMLTextAreaElement, maxLines: number) => {
    const computed = window.getComputedStyle(element);
    const lineHeight = parseFloat(computed.lineHeight || "20");
    element.style.height = "auto";
    const maxHeight = lineHeight * maxLines;
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
    element.style.height = `${nextHeight}px`;
  };

  const updatePsychoCard = (
    index: number,
    updater: (card: PsychoCardForm) => PsychoCardForm
  ) => {
    setPsychoCards((prev) => {
      const current = prev[index];
      if (!current) {
        return prev;
      }
      const next = updater(current);
      if (current.previewUrl && current.previewUrl !== next.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      const updated = prev.map((card, idx) => (idx === index ? next : card));
      if (current.id && next.id && current.id !== next.id) {
        setPsychoQuestions((questions) =>
          questions.map((question) => ({
            ...question,
            options: question.options.map((option) => {
              if (!(current.id in option.weights)) {
                return option;
              }
              const { [current.id]: value, ...rest } = option.weights;
              return {
                ...option,
                weights: {
                  ...rest,
                  [next.id]: value,
                },
              };
            }),
          }))
        );
      }
      return updated;
    });
  };

  const updatePsychoQuestion = (
    index: number,
    updater: (question: PsychoQuestionForm) => PsychoQuestionForm
  ) => {
    setPsychoQuestions((prev) =>
      prev.map((question, idx) => (idx === index ? updater(question) : question))
    );
  };

  const updatePsychoOption = (
    questionIndex: number,
    optionIndex: number,
    updater: (option: PsychoOptionForm) => PsychoOptionForm
  ) => {
    setPsychoQuestions((prev) =>
      prev.map((question, qIdx) => {
        if (qIdx !== questionIndex) {
          return question;
        }
        const nextOptions = question.options.map((option, oIdx) => {
          if (oIdx !== optionIndex) {
            return option;
          }
          const next = updater(option);
          if (option.previewUrl && option.previewUrl !== next.previewUrl) {
            URL.revokeObjectURL(option.previewUrl);
          }
          return next;
        });
        return { ...question, options: nextOptions };
      })
    );
  };

  const handlePsychoThumbnailSelect = async (file: File | null) => {
    if (!file) {
      setPsychoThumbnailFile(null);
      setPsychoThumbnailUrl("");
      setPsychoThumbnailPreview("");
      return;
    }
    const errorMessage = await validateImageFile(file);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    setError(null);
    if (psychoThumbnailPreview.startsWith("blob:")) {
      URL.revokeObjectURL(psychoThumbnailPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setPsychoThumbnailFile(file);
    setPsychoThumbnailUrl("");
    setPsychoThumbnailPreview(previewUrl);
  };

  const handlePsychoCardFileSelect = async (index: number, file: File | null) => {
    if (!file) {
      updatePsychoCard(index, (card) => ({
        ...card,
        imageFile: null,
        imageUrl: "",
        previewUrl: "",
      }));
      return;
    }
    const errorMessage = await validateImageFile(file);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    updatePsychoCard(index, (card) => ({
      ...card,
      imageFile: file,
      imageUrl: "",
      previewUrl,
    }));
  };

  const handlePsychoOptionFileSelect = async (
    questionIndex: number,
    optionIndex: number,
    file: File | null
  ) => {
    if (!file) {
      updatePsychoOption(questionIndex, optionIndex, (option) => ({
        ...option,
        imageFile: null,
        imageUrl: "",
        previewUrl: "",
      }));
      return;
    }
    const errorMessage = await validateImageFile(file);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    updatePsychoOption(questionIndex, optionIndex, (option) => ({
      ...option,
      imageFile: file,
      imageUrl: "",
      previewUrl,
    }));
  };

  const handleAddPsychoCard = () => {
    setPsychoCards((prev) => [
      ...prev,
      {
        id: makeId("card"),
        label: "",
        summary: "",
        keywords: "",
        imageFile: null,
        imageUrl: "",
        previewUrl: "",
        minScore: "",
        maxScore: "",
      },
    ]);
  };

  const handleRemovePsychoCard = (index: number) => {
    const removed = psychoCards[index];
    if (removed?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    const removedId = removed?.id;
    setPsychoCards((prev) => prev.filter((_, idx) => idx !== index));
    if (removedId) {
      setPsychoQuestions((prev) =>
        prev.map((question) => ({
          ...question,
          options: question.options.map((option) => {
            if (!(removedId in option.weights)) {
              return option;
            }
            const { [removedId]: _, ...rest } = option.weights;
            return { ...option, weights: rest };
          }),
        }))
      );
    }
  };

  const handleAddPsychoQuestion = () => {
    setPsychoQuestions((prev) => [
      ...prev,
      {
        id: makeId("q"),
        text: "",
        helper: "",
        options: [
          {
            id: makeId("opt"),
            text: "",
            score: "",
            nextQuestionId: "",
            imageFile: null,
            imageUrl: "",
            previewUrl: "",
            weights: {},
          },
        ],
      },
    ]);
  };

  const handleRemovePsychoQuestion = (index: number) => {
    const removed = psychoQuestions[index];
    removed?.options.forEach((option) => {
      if (option.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(option.previewUrl);
      }
    });
    setPsychoQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddPsychoOption = (questionIndex: number) => {
    updatePsychoQuestion(questionIndex, (question) => ({
      ...question,
      options: [
        ...question.options,
        {
          id: makeId("opt"),
          text: "",
          score: "",
          nextQuestionId: "",
          imageFile: null,
          imageUrl: "",
          previewUrl: "",
          weights: {},
        },
      ],
    }));
  };

  const handleRemovePsychoOption = (questionIndex: number, optionIndex: number) => {
    const removed = psychoQuestions[questionIndex]?.options[optionIndex];
    if (removed?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    updatePsychoQuestion(questionIndex, (question) => ({
      ...question,
      options: question.options.filter((_, idx) => idx !== optionIndex),
    }));
  };

  const handleSaveJson = async (): Promise<boolean> => {
    if (!jsonPath) {
      return false;
    }
    if (isSajuJson) {
      const totalCount =
        idiomBuckets.high.length + idiomBuckets.mid.length + idiomBuckets.low.length;
      if (totalCount > 0 && !window.confirm(`${totalCount}개 수정하시겠습니까?`)) {
        return false;
      }
      setError(null);
      const sanitize = (entries: IdiomEntry[]) =>
        entries
          .map((entry) => ({
            key: entry.key.trim(),
            text: entry.text.trim(),
            reading: entry.reading.trim(),
            meaning: entry.meaning.trim(),
            message: entry.message.trim(),
          }))
          .filter(
            (entry) =>
              entry.key ||
              entry.text ||
              entry.reading ||
              entry.meaning ||
              entry.message
          );
      const next = {
        high: sanitize(idiomBuckets.high),
        mid: sanitize(idiomBuckets.mid),
        low: sanitize(idiomBuckets.low),
      };
      try {
        await saveAdminJsonFile(jsonPath, next);
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.meta.message || "JSON 저장에 실패했습니다.");
        } else {
          setError("JSON 저장에 실패했습니다.");
        }
        return false;
      }
    }
    if (isPsychoJson) {
      if (!window.confirm("JSON을 저장하시겠습니까?")) {
        return false;
      }
      setError(null);
      setIsSavingJson(true);
      try {
        const urlChecks: string[] = [];
        if (!psychoThumbnailFile && psychoThumbnailUrl && !isDataUrl(psychoThumbnailUrl)) {
          urlChecks.push(psychoThumbnailUrl);
        }
        psychoCards.forEach((card) => {
          if (!card.imageFile && card.imageUrl && !isDataUrl(card.imageUrl)) {
            urlChecks.push(card.imageUrl);
          }
        });
        psychoQuestions.forEach((question) => {
          question.options.forEach((option) => {
            if (!option.imageFile && option.imageUrl && !isDataUrl(option.imageUrl)) {
              urlChecks.push(option.imageUrl);
            }
          });
        });
        for (const url of urlChecks) {
          const errorMessage = await validateImageUrl(url);
          if (errorMessage) {
            setError(errorMessage);
            return false;
          }
        }

        const resolveImageUrl = async (file: File | null, url: string) => {
          if (file) {
            return readFileAsDataUrl(file);
          }
          return url.trim();
        };

        const resolvedThumbnail = await resolveImageUrl(
          psychoThumbnailFile,
          psychoThumbnailUrl
        );
        const scoring = {
          mode: psychoScoring.mode,
          min: psychoScoring.min ? Number(psychoScoring.min) : undefined,
          max: psychoScoring.max ? Number(psychoScoring.max) : undefined,
          minNegative: psychoScoring.minNegative ? Number(psychoScoring.minNegative) : undefined,
          threshold: psychoScoring.threshold ? Number(psychoScoring.threshold) : undefined,
          maxResults: psychoScoring.maxResults ? Number(psychoScoring.maxResults) : undefined,
          patterns: psychoScoring.patterns
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        };

        const normalizedCards = await Promise.all(
          psychoCards.map(async (card) => ({
            id: card.id.trim() || makeId("card"),
            label: card.label.trim() || card.id.trim(),
            summary: card.summary.trim() || undefined,
            keywords: card.keywords
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            image_url: (await resolveImageUrl(card.imageFile, card.imageUrl)) || undefined,
            min_score: card.minScore ? Number(card.minScore) : undefined,
            max_score: card.maxScore ? Number(card.maxScore) : undefined,
          }))
        );

        const normalizedQuestions = await Promise.all(
          psychoQuestions.map(async (question) => ({
            id: question.id.trim() || makeId("q"),
            text: question.text.trim(),
            helper: question.helper.trim() || undefined,
            options: await Promise.all(
              question.options.map(async (option) => {
                const optionWeights =
                  psychoScoring.mode === "TOTAL"
                    ? undefined
                    : Object.fromEntries(
                      Object.entries(option.weights)
                        .map(([key, value]) => [key, Number(value)])
                        .filter(([, value]) => Number.isFinite(value) && value !== 0)
                    );
                return {
                  id: option.id.trim() || makeId("opt"),
                  text: option.text.trim(),
                  image_url: (await resolveImageUrl(option.imageFile, option.imageUrl)) || undefined,
                  score:
                    psychoScoring.mode === "TOTAL"
                      ? Number(option.score || 0)
                      : undefined,
                  weights: psychoScoring.mode === "TOTAL" ? undefined : optionWeights ?? {},
                  nextQuestionId: option.nextQuestionId.trim() || undefined,
                };
              })
            ),
          }))
        );

        const template = {
          ...psychoExtras,
          slug: psychoSlug || gameSlug || "major-arcana",
          game_slug: psychoSlug || gameSlug || "major-arcana",
          title: psychoTitle.trim(),
          description: psychoDescription.trim(),
          thumbnail_url: resolvedThumbnail || undefined,
          tags: psychoTags
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((label) => ({ label })),
          scoring,
          cards: normalizedCards,
          questions: normalizedQuestions,
        };

        await savePsychoTemplate({
          slug: psychoSlug || gameSlug || "major-arcana",
          content: template,
        });
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.meta.message || "JSON 저장에 실패했습니다.");
        } else {
          setError("JSON 저장에 실패했습니다.");
        }
        return false;
      } finally {
        setIsSavingJson(false);
      }
    }
    return false;
  };

  const currentBucket = idiomBuckets[activeBucket];

  if (isLoading) {
    return <div className="admin-games-empty">불러오는 중...</div>;
  }

  return (
    <>
      {error ? <div className="admin-games-error">{error}</div> : null}
      {isSajuJson ? (
        <section className="admin-json-editor">
          <div className="admin-json-tabs">
            {(["high", "mid", "low"] as const).map((bucket) => (
              <button
                key={bucket}
                type="button"
                className={activeBucket === bucket ? "active" : ""}
                onClick={() => setActiveBucket(bucket)}
              >
                {bucket.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="admin-json-actions">
            <button type="button" onClick={addEntry}>
              문단 추가
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                setIsSajuDeleteMode(true);
                setSelectedSajuIndexes([]);
              }}
              disabled={isSajuDeleteMode}
            >
              삭제
            </button>
          </div>
          {currentBucket.length === 0 ? (
            <div className="admin-json-empty">표시할 문단이 없습니다.</div>
          ) : (
            <div className="admin-json-list">
              {currentBucket.map((entry, index) => (
                <div
                  key={`${entry.key}-${index}`}
                  className={`admin-json-item ${selectedSajuIndexes.includes(index) ? "admin-card-selected admin-card-selected-delete" : ""
                    }`}
                  onClick={
                    isSajuDeleteMode
                      ? () =>
                        setSelectedSajuIndexes((prev) =>
                          prev.includes(index)
                            ? prev.filter((id) => id !== index)
                            : [...prev, index]
                        )
                      : undefined
                  }
                >
                  {isSajuDeleteMode ? (
                    <input
                      type="checkbox"
                      className="admin-item-checkbox is-delete"
                      checked={selectedSajuIndexes.includes(index)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setSelectedSajuIndexes((prev) =>
                          event.target.checked
                            ? [...prev, index]
                            : prev.filter((id) => id !== index)
                        )
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    className="admin-json-item-button"
                    onClick={() => !isSajuDeleteMode && setActiveEntryIndex(index)}
                  >
                    <div className="admin-json-idiom">
                      <strong>{entry.text || "사자성어"}</strong>
                      <span>{entry.reading ? `(${entry.reading})` : ""}</span>
                    </div>
                    <div className="admin-json-key">{entry.key}</div>
                  </button>
                </div>
              ))}
            </div>
          )}
          {isSajuDeleteMode ? (
            <div className="admin-floating-actions">
              <button
                type="button"
                onClick={() => {
                  if (selectedSajuIndexes.length === 0) {
                    setIsSajuDeleteMode(false);
                    return;
                  }
                  if (!window.confirm(`${selectedSajuIndexes.length}개 삭제하시겠습니까?`)) {
                    return;
                  }
                  setIdiomBuckets((prev) => {
                    const next = prev[activeBucket].filter(
                      (_, idx) => !selectedSajuIndexes.includes(idx)
                    );
                    return { ...prev, [activeBucket]: next };
                  });
                  setSelectedSajuIndexes([]);
                  setIsSajuDeleteMode(false);
                }}
              >
                {selectedSajuIndexes.length}개 삭제
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setSelectedSajuIndexes([]);
                  setIsSajuDeleteMode(false);
                }}
              >
                취소
              </button>
            </div>
          ) : null}
          {activeEntryIndex !== null && !isSajuDeleteMode ? (
            <div className="admin-json-overlay" role="dialog" aria-modal="true">
              <div className="admin-json-overlay-backdrop" onClick={() => setActiveEntryIndex(null)} />
              <div className="admin-json-overlay-card">
                <div className="admin-json-overlay-header">
                  <button type="button" className="ghost" onClick={() => setActiveEntryIndex(null)}>
                    닫기
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={async () => {
                      const saved = await handleSaveJson();
                      if (saved) {
                        setActiveEntryIndex(null);
                      }
                    }}
                  >
                    완료
                  </button>
                </div>
                <div className="admin-json-edit">
                  <div className="admin-json-edit-title">
                    <input
                      type="text"
                      placeholder="사자성어"
                      value={currentBucket[activeEntryIndex].text}
                      onChange={(event) => updateEntry(activeEntryIndex, { text: event.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="읽기"
                      value={currentBucket[activeEntryIndex].reading}
                      onChange={(event) => updateEntry(activeEntryIndex, { reading: event.target.value })}
                    />
                  </div>
                  <textarea
                    className="admin-json-edit-meaning"
                    rows={1}
                    placeholder="의미"
                    value={currentBucket[activeEntryIndex].meaning}
                    onChange={(event) => {
                      updateEntry(activeEntryIndex, { meaning: event.target.value });
                      clampTextarea(event.currentTarget, 3);
                    }}
                    onFocus={(event) => clampTextarea(event.currentTarget, 3)}
                  />
                  <textarea
                    className="admin-json-edit-message"
                    rows={10}
                    placeholder="메시지"
                    value={currentBucket[activeEntryIndex].message}
                    onChange={(event) => updateEntry(activeEntryIndex, { message: event.target.value })}
                  />
                  <input
                    type="text"
                    className="admin-json-edit-key"
                    placeholder="한자 key"
                    value={currentBucket[activeEntryIndex].key}
                    onChange={(event) => updateEntry(activeEntryIndex, { key: event.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : isPsychoJson ? (
        <section className="admin-json-editor admin-psycho-editor">
          <div className="admin-psycho-section">
            <div className="admin-psycho-section-header">
              <h4>JSON 편집</h4>
            </div>
            <div className="admin-psycho-grid">
              <label>
                제목
                <input
                  type="text"
                  value={psychoTitle}
                  onChange={(event) => setPsychoTitle(event.target.value)}
                />
              </label>
              <label>
                설명
                <textarea
                  rows={3}
                  value={psychoDescription}
                  onChange={(event) => setPsychoDescription(event.target.value)}
                />
              </label>
              <label>
                태그 (쉼표로 구분)
                <input
                  type="text"
                  value={psychoTags}
                  onChange={(event) => setPsychoTags(event.target.value)}
                />
              </label>
            </div>
            <div className="admin-psycho-media-row">
              <label className="admin-psycho-upload">
                {psychoThumbnailPreview ? (
                  <img src={psychoThumbnailPreview} alt="thumbnail" />
                ) : (
                  <span>썸네일 업로드</span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(event) =>
                    void handlePsychoThumbnailSelect(event.target.files?.[0] || null)
                  }
                />
              </label>
              <label className="admin-psycho-url">
                썸네일 URL
                <input
                  type="text"
                  value={psychoThumbnailFile ? "" : psychoThumbnailUrl}
                  onChange={(event) => {
                    const next = event.target.value;
                    setPsychoThumbnailUrl(next);
                    if (psychoThumbnailPreview.startsWith("blob:")) {
                      URL.revokeObjectURL(psychoThumbnailPreview);
                    }
                    setPsychoThumbnailFile(null);
                    setPsychoThumbnailPreview(next);
                  }}
                />
              </label>
            </div>
            <div className="admin-psycho-grid admin-psycho-scoring">
              <label>
                점수 모드
                <select
                  value={psychoScoring.mode}
                  onChange={(event) =>
                    setPsychoScoring((prev) => ({
                      ...prev,
                      mode: event.target.value === "TOTAL" ? "TOTAL" : "WEIGHTED",
                    }))
                  }
                >
                  <option value="WEIGHTED">가중치</option>
                  <option value="TOTAL">총점</option>
                </select>
              </label>
              <label>
                최소 점수
                <input
                  type="number"
                  value={psychoScoring.min}
                  onChange={(event) =>
                    setPsychoScoring((prev) => ({ ...prev, min: event.target.value }))
                  }
                />
              </label>
              <label>
                최대 점수
                <input
                  type="number"
                  value={psychoScoring.max}
                  onChange={(event) =>
                    setPsychoScoring((prev) => ({ ...prev, max: event.target.value }))
                  }
                />
              </label>
              <label>
                최소 음수
                <input
                  type="number"
                  value={psychoScoring.minNegative}
                  onChange={(event) =>
                    setPsychoScoring((prev) => ({
                      ...prev,
                      minNegative: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                임계값
                <input
                  type="number"
                  value={psychoScoring.threshold}
                  onChange={(event) =>
                    setPsychoScoring((prev) => ({
                      ...prev,
                      threshold: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                최대 결과 수
                <input
                  type="number"
                  value={psychoScoring.maxResults}
                  onChange={(event) =>
                    setPsychoScoring((prev) => ({
                      ...prev,
                      maxResults: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="admin-psycho-full">
                패턴 (쉼표로 구분)
                <input
                  type="text"
                  value={psychoScoring.patterns}
                  onChange={(event) =>
                    setPsychoScoring((prev) => ({
                      ...prev,
                      patterns: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="admin-psycho-section">
            <div className="admin-psycho-section-header">
              <h4>결과 카드</h4>
              <button type="button" onClick={handleAddPsychoCard}>
                + 추가
              </button>
            </div>
            {psychoCards.length === 0 ? (
              <div className="admin-json-empty">결과 카드가 없습니다.</div>
            ) : (
              <div className="admin-psycho-list">
                {psychoCards.map((card, index) => {
                  const cardId = `card-${index}`;
                  const isExpanded = expandedCards.has(cardId);
                  return (
                    <div
                      key={`card-${index}`}
                      className={`admin-psycho-card ${isExpanded ? "expanded" : ""}`}
                    >
                      <div
                        className="admin-psycho-card-header"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleCardExpanded(cardId)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleCardExpanded(cardId);
                          }
                        }}
                      >
                        <span className="admin-psycho-chevron">▾</span>
                        <strong>결과 {index + 1}: {card.label}</strong>
                        <button
                          type="button"
                          className="admin-psycho-remove"
                          onClick={() => {
                            handleRemovePsychoCard(index);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                      {isExpanded && (
                        <>
                          <div className="admin-psycho-grid">
                            <label>
                              ID
                              <input
                                type="text"
                                value={card.id}
                                onChange={(event) =>
                                  updatePsychoCard(index, (prev) => ({
                                    ...prev,
                                    id: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label>
                              이름
                              <input
                                type="text"
                                value={card.label}
                                onChange={(event) =>
                                  updatePsychoCard(index, (prev) => ({
                                    ...prev,
                                    label: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="admin-psycho-full">
                              설명
                              <textarea
                                rows={3}
                                value={card.summary}
                                onChange={(event) =>
                                  updatePsychoCard(index, (prev) => ({
                                    ...prev,
                                    summary: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="admin-psycho-full">
                              키워드 (쉼표로 구분)
                              <input
                                type="text"
                                value={card.keywords}
                                onChange={(event) =>
                                  updatePsychoCard(index, (prev) => ({
                                    ...prev,
                                    keywords: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            {psychoScoring.mode === "TOTAL" ? (
                              <>
                                <label>
                                  최소 점수
                                  <input
                                    type="number"
                                    value={card.minScore}
                                    onChange={(event) =>
                                      updatePsychoCard(index, (prev) => ({
                                        ...prev,
                                        minScore: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <label>
                                  최대 점수
                                  <input
                                    type="number"
                                    value={card.maxScore}
                                    onChange={(event) =>
                                      updatePsychoCard(index, (prev) => ({
                                        ...prev,
                                        maxScore: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                              </>
                            ) : null}
                          </div>
                          <div className="admin-psycho-media-row">
                            <label className="admin-psycho-upload">
                              {card.previewUrl || card.imageUrl ? (
                                <img src={card.previewUrl || card.imageUrl} alt={card.label || "card"} />
                              ) : (
                                <span>이미지 업로드</span>
                              )}
                              <input
                                type="file"
                                accept="image/jpeg,image/png"
                                onChange={(event) =>
                                  void handlePsychoCardFileSelect(index, event.target.files?.[0] || null)
                                }
                              />
                            </label>
                            <label className="admin-psycho-url">
                              이미지 URL
                              <input
                                type="text"
                                value={card.imageFile ? "" : card.imageUrl}
                                onChange={(event) =>
                                  updatePsychoCard(index, (prev) => ({
                                    ...prev,
                                    imageUrl: event.target.value,
                                    imageFile: null,
                                    previewUrl: "",
                                  }))
                                }
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-psycho-section">
            <div className="admin-psycho-section-header">
              <h4>질문</h4>
              <button type="button" onClick={handleAddPsychoQuestion}>
                + 추가
              </button>
            </div>
            {psychoQuestions.length === 0 ? (
              <div className="admin-json-empty">질문이 없습니다.</div>
            ) : (
              <div className="admin-psycho-list">
                {psychoQuestions.map((question, qIndex) => {
                  const questionId = `question-${qIndex}`;
                  const isExpanded = expandedQuestions.has(questionId);
                  return (
                    <div
                      key={`question-${qIndex}`}
                      className={`admin-psycho-question ${isExpanded ? "expanded" : ""}`}
                    >
                      <div
                        className="admin-psycho-card-header"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleQuestionExpanded(questionId)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleQuestionExpanded(questionId);
                          }
                        }}
                      >
                        <span className="admin-psycho-chevron">▾</span>
                        <strong>질문 {qIndex + 1}: {question.text}</strong>
                        <button
                          type="button"
                          className="admin-psycho-remove"
                          onClick={() => {
                            handleRemovePsychoQuestion(qIndex);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                      {isExpanded && (
                        <>
                          <div className="admin-psycho-grid">
                            <label>
                              ID
                              <input
                                type="text"
                                value={question.id}
                                onChange={(event) =>
                                  updatePsychoQuestion(qIndex, (prev) => ({
                                    ...prev,
                                    id: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="admin-psycho-full">
                              질문
                              <textarea
                                rows={2}
                                value={question.text}
                                onChange={(event) =>
                                  updatePsychoQuestion(qIndex, (prev) => ({
                                    ...prev,
                                    text: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="admin-psycho-full">
                              보조 설명
                              <input
                                type="text"
                                value={question.helper}
                                onChange={(event) =>
                                  updatePsychoQuestion(qIndex, (prev) => ({
                                    ...prev,
                                    helper: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                          <div className="admin-psycho-options">
                              {question.options.map((option, oIndex) => {
                                const optionId = `option-${qIndex}-${oIndex}`;
                                const isOExpanded = expandedOptions.has(optionId);
                                return (
                                  <div
                                    key={`option-${qIndex}-${oIndex}`}
                                    className={`admin-psycho-option ${isOExpanded ? "expanded" : ""}`}
                                  >
                                  <div
                                    className="admin-psycho-card-header"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleOptionExpanded(optionId)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        toggleOptionExpanded(optionId);
                                      }
                                    }}
                                  >
                                    <span className="admin-psycho-chevron">▾</span>
                                    <strong>선택지 {oIndex + 1}: {option.text}</strong>
                                    <button
                                      type="button"
                                      className="admin-psycho-remove"
                                      onClick={() => {
                                        handleRemovePsychoOption(qIndex, oIndex);
                                      }}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                  {isOExpanded && (
                                    <>
                                      <div className="admin-psycho-grid">
                                        <label>
                                          ID
                                          <input
                                            type="text"
                                            value={option.id}
                                            onChange={(event) =>
                                              updatePsychoOption(qIndex, oIndex, (prev) => ({
                                                ...prev,
                                                id: event.target.value,
                                              }))
                                            }
                                          />
                                        </label>
                                        <label className="admin-psycho-full">
                                          텍스트
                                          <input
                                            type="text"
                                            value={option.text}
                                            onChange={(event) =>
                                              updatePsychoOption(qIndex, oIndex, (prev) => ({
                                                ...prev,
                                                text: event.target.value,
                                              }))
                                            }
                                          />
                                        </label>
                                        <label>
                                          다음 질문 ID
                                          <input
                                            type="text"
                                            value={option.nextQuestionId}
                                            onChange={(event) =>
                                              updatePsychoOption(qIndex, oIndex, (prev) => ({
                                                ...prev,
                                                nextQuestionId: event.target.value,
                                              }))
                                            }
                                          />
                                        </label>
                                        {psychoScoring.mode === "TOTAL" ? (
                                          <label>
                                            점수
                                            <input
                                              type="number"
                                              value={option.score}
                                              onChange={(event) =>
                                                updatePsychoOption(qIndex, oIndex, (prev) => ({
                                                  ...prev,
                                                  score: event.target.value,
                                                }))
                                              }
                                            />
                                          </label>
                                        ) : null}
                                      </div>
                                      <div className="admin-psycho-media-row">
                                        <label className="admin-psycho-upload">
                                          {option.previewUrl || option.imageUrl ? (
                                            <img
                                              src={option.previewUrl || option.imageUrl}
                                              alt={option.text || "option"}
                                            />
                                          ) : (
                                            <span>이미지 업로드</span>
                                          )}
                                          <input
                                            type="file"
                                            accept="image/jpeg,image/png"
                                            onChange={(event) =>
                                              void handlePsychoOptionFileSelect(
                                                qIndex,
                                                oIndex,
                                                event.target.files?.[0] || null
                                              )
                                            }
                                          />
                                        </label>
                                        <label className="admin-psycho-url">
                                          이미지 URL
                                          <input
                                            type="text"
                                            value={option.imageFile ? "" : option.imageUrl}
                                            onChange={(event) =>
                                              updatePsychoOption(qIndex, oIndex, (prev) => ({
                                                ...prev,
                                                imageUrl: event.target.value,
                                                imageFile: null,
                                                previewUrl: "",
                                              }))
                                            }
                                          />
                                        </label>
                                      </div>
                                      {psychoScoring.mode === "WEIGHTED" ? (
                                        <div className="admin-psycho-weights">
                                          {psychoCards.length === 0 ? (
                                            <div className="admin-json-empty">
                                              카드가 없어 가중치를 설정할 수 없습니다.
                                            </div>
                                          ) : (
                                            psychoCards.map((card) => (
                                              <label key={`weight-${option.id}-${card.id}`}>
                                                {card.label || card.id || "카드"}
                                                <input
                                                  type="number"
                                                  value={option.weights[card.id] ?? ""}
                                                  onChange={(event) =>
                                                    updatePsychoOption(qIndex, oIndex, (prev) => {
                                                      const value = event.target.value;
                                                      const nextWeights = { ...prev.weights };
                                                      if (value === "") {
                                                        delete nextWeights[card.id];
                                                      } else {
                                                        nextWeights[card.id] = value;
                                                      }
                                                      return { ...prev, weights: nextWeights };
                                                    })
                                                  }
                                                />
                                              </label>
                                            ))
                                          )}
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              className="admin-psycho-add"
                              onClick={() => handleAddPsychoOption(qIndex)}
                            >
                              + 선택지 추가
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="admin-floating-actions">
            <button type="button" onClick={handleSaveJson} disabled={isSavingJson}>
              {isSavingJson ? "저장 중..." : "저장"}
            </button>
            <button type="button" className="ghost" onClick={handleCancelJson}>
              취소
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
