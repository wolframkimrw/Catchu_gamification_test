import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./psycho-create.css";
import "./worldcup-create.css";
import { ApiError } from "../../api/http";
import { savePsychoTemplate } from "../../api/games";

type CardForm = {
  id: string;
  label: string;
  summary: string;
  keywords: string;
  imageFile: File | null;
  imageUrl: string;
  previewUrl: string;
};

type ParagraphQuestionForm = {
  id: string;
  text: string;
  score: string;
  cardId: string;
  imageFile: File | null;
  imageUrl: string;
  previewUrl: string;
};

type ParagraphForm = {
  id: string;
  text: string;
  questions: ParagraphQuestionForm[];
};

const makeId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });

const resolveImageUrl = async (file: File | null, fallbackUrl: string) => {
  if (file) {
    return readFileAsDataUrl(file);
  }
  return fallbackUrl.trim();
};

const DEFAULT_SCORING = {
  min: 1,
  max: 3,
  minNegative: -1,
  threshold: 2,
  maxResults: 1,
  patterns: ["+2", "+3", "+2 +1", "+3 -1", "+1 -1"],
};

export function PsychoCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [cards, setCards] = useState<CardForm[]>([
    {
      id: "card-1",
      label: "",
      summary: "",
      keywords: "",
      imageFile: null,
      imageUrl: "",
      previewUrl: "",
    },
  ]);
  const [paragraphs, setParagraphs] = useState<ParagraphForm[]>([
    {
      id: "q1",
      text: "",
      questions: [
        {
          id: "q1-a",
          text: "",
          score: "1",
          cardId: "card-1",
          imageFile: null,
          imageUrl: "",
          previewUrl: "",
        },
        {
          id: "q1-b",
          text: "",
          score: "1",
          cardId: "card-1",
          imageFile: null,
          imageUrl: "",
          previewUrl: "",
        },
      ],
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fallbackSlug] = useState(() => makeId("psycho"));
  const cardsRef = useRef(cards);
  const paragraphsRef = useRef(paragraphs);
  const thumbnailPreviewRef = useRef(thumbnailPreviewUrl);

  const resolvedSlug = useMemo(
    () => toSlug(title) || fallbackSlug,
    [fallbackSlug, title]
  );

  const handleCardChange = (index: number, next: Partial<CardForm>) => {
    setCards((prev) =>
      prev.map((card, idx) => {
        if (idx !== index) {
          return card;
        }
        const updated = { ...card, ...next };
        if (card.previewUrl && card.previewUrl !== updated.previewUrl) {
          URL.revokeObjectURL(card.previewUrl);
        }
        return updated;
      })
    );
  };

  const handleAddCard = () => {
    setCards((prev) => [
      ...prev,
      {
        id: makeId("card"),
        label: "",
        summary: "",
        keywords: "",
        imageFile: null,
        imageUrl: "",
        previewUrl: "",
      },
    ]);
  };

  const handleRemoveCard = (index: number) => {
    const removedId = cards[index]?.id;
    setCards((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
    if (removedId) {
      setParagraphs((prev) =>
        prev.map((paragraph) => ({
          ...paragraph,
          questions: paragraph.questions.map((question) =>
            question.cardId === removedId ? { ...question, cardId: "" } : question
          ),
        }))
      );
    }
  };

  const handleParagraphChange = (index: number, next: Partial<ParagraphForm>) => {
    setParagraphs((prev) =>
      prev.map((paragraph, idx) =>
        idx === index ? { ...paragraph, ...next } : paragraph
      )
    );
  };

  const handleQuestionChange = (
    paragraphIndex: number,
    questionIndex: number,
    next: Partial<ParagraphQuestionForm>
  ) => {
    setParagraphs((prev) =>
      prev.map((paragraph, pIdx) => {
        if (pIdx !== paragraphIndex) {
          return paragraph;
        }
        const nextQuestions = paragraph.questions.map((question, qIdx) => {
          if (qIdx !== questionIndex) {
            return question;
          }
          const updated = { ...question, ...next };
          if (question.previewUrl && question.previewUrl !== updated.previewUrl) {
            URL.revokeObjectURL(question.previewUrl);
          }
          return updated;
        });
        return { ...paragraph, questions: nextQuestions };
      })
    );
  };

  const handleAddParagraph = () => {
    setParagraphs((prev) => [
      ...prev,
      {
        id: makeId("q"),
        text: "",
        questions: [
          {
            id: makeId("opt"),
            text: "",
            score: "1",
            cardId: cards[0]?.id ?? "",
            imageFile: null,
            imageUrl: "",
            previewUrl: "",
          },
        ],
      },
    ]);
  };

  const handleRemoveParagraph = (index: number) => {
    setParagraphs((prev) => {
      const target = prev[index];
      target?.questions.forEach((question) => {
        if (question.previewUrl) {
          URL.revokeObjectURL(question.previewUrl);
        }
      });
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleAddQuestion = (paragraphIndex: number) => {
    setParagraphs((prev) =>
      prev.map((paragraph, idx) => {
        if (idx !== paragraphIndex) {
          return paragraph;
        }
        return {
          ...paragraph,
          questions: [
            ...paragraph.questions,
            {
              id: makeId("opt"),
              text: "",
              score: "1",
              cardId: cards[0]?.id ?? "",
              imageFile: null,
              imageUrl: "",
              previewUrl: "",
            },
          ],
        };
      })
    );
  };

  const handleRemoveQuestion = (paragraphIndex: number, questionIndex: number) => {
    setParagraphs((prev) =>
      prev.map((paragraph, pIdx) => {
        if (pIdx !== paragraphIndex) {
          return paragraph;
        }
        const target = paragraph.questions[questionIndex];
        if (target?.previewUrl) {
          URL.revokeObjectURL(target.previewUrl);
        }
        return {
          ...paragraph,
          questions: paragraph.questions.filter((_, qIdx) => qIdx !== questionIndex),
        };
      })
    );
  };

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    paragraphsRef.current = paragraphs;
  }, [paragraphs]);

  useEffect(() => {
    thumbnailPreviewRef.current = thumbnailPreviewUrl;
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    return () => {
      cardsRef.current.forEach((card) => {
        if (card.previewUrl) {
          URL.revokeObjectURL(card.previewUrl);
        }
      });
      paragraphsRef.current.forEach((paragraph) => {
        paragraph.questions.forEach((question) => {
          if (question.previewUrl) {
            URL.revokeObjectURL(question.previewUrl);
          }
        });
      });
      if (thumbnailPreviewRef.current) {
        URL.revokeObjectURL(thumbnailPreviewRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!resolvedSlug) {
      setError("제목으로 slug를 생성할 수 없습니다.");
      return;
    }
    if (cards.length === 0) {
      setError("결과 카드를 최소 1개 이상 추가해 주세요.");
      return;
    }
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (cards.some((card) => !card.label.trim())) {
      setError("결과 카드 이름을 입력해 주세요.");
      return;
    }
    if (paragraphs.length === 0) {
      setError("문단을 최소 1개 이상 추가해 주세요.");
      return;
    }
    if (paragraphs.some((paragraph) => !paragraph.text.trim())) {
      setError("문단 내용을 입력해 주세요.");
      return;
    }
    if (
      paragraphs.some((paragraph) =>
        paragraph.questions.some((question) => !question.text.trim())
      )
    ) {
      setError("질문 내용을 입력해 주세요.");
      return;
    }
    if (
      paragraphs.some((paragraph) =>
        paragraph.questions.some((question) => !question.cardId.trim())
      )
    ) {
      setError("문단 결과를 선택해 주세요.");
      return;
    }

    const normalizedCards = await Promise.all(
      cards.map(async (card) => {
        const imageUrl = await resolveImageUrl(card.imageFile, card.imageUrl);
        return {
          id: card.id.trim() || makeId("card"),
          label: card.label.trim() || card.id.trim(),
          summary: card.summary.trim() || undefined,
          keywords: card.keywords
            .split(",")
            .map((word) => word.trim())
            .filter(Boolean),
          image_url: imageUrl || undefined,
        };
      })
    );

    const normalizedQuestions = await Promise.all(
      paragraphs.map(async (paragraph) => ({
        id: paragraph.id.trim() || makeId("q"),
        text: paragraph.text.trim(),
        options: await Promise.all(
          paragraph.questions.map(async (question) => {
            const imageUrl = await resolveImageUrl(
              question.imageFile,
              question.imageUrl
            );
            return {
              id: question.id.trim() || makeId("opt"),
              text: question.text.trim(),
              image_url: imageUrl || undefined,
              weights: question.cardId
                ? { [question.cardId]: Number(question.score || 0) }
                : {},
            };
          })
        ),
      }))
    );

    const resolvedThumbnail = await resolveImageUrl(thumbnailFile, thumbnailUrl);

    const template = {
      slug: resolvedSlug,
      game_slug: resolvedSlug,
      title: title.trim(),
      description: description.trim(),
      thumbnail_url: resolvedThumbnail || undefined,
      tags: tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((label) => ({ label })),
      scoring: DEFAULT_SCORING,
      cards: normalizedCards,
      questions: normalizedQuestions,
    };

    setIsSubmitting(true);
    try {
      await savePsychoTemplate({ slug: resolvedSlug, content: template });
      navigate(`/psycho/${resolvedSlug}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.meta.message || "심리 테스트 저장에 실패했습니다.");
      } else {
        setError("심리 테스트 저장에 실패했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="worldcup-create-page psycho-create-page">
      <div className="worldcup-create-header">
        <h1>심리 테스트 만들기</h1>
        <p>공용 심리테스트 JSON 형식으로 저장됩니다. (major-arcana와 동일)</p>
      </div>
      <form className="worldcup-create-form" onSubmit={handleSubmit}>
        {error ? <div className="worldcup-create-error">{error}</div> : null}
        <div className="worldcup-create-field psycho-field-plain">
          <label>제목</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <small>게임 목록에 표시되는 이름이며, 자동으로 slug가 생성됩니다.</small>
        </div>
        <div className="worldcup-create-field psycho-field-plain">
          <label>설명</label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <small>시작 화면에 보여지는 소개 문장입니다.</small>
        </div>
        <div className="worldcup-create-field psycho-field-plain">
          <label>태그 (쉼표로 구분)</label>
          <input
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <small>카드/리스트에 노출할 핵심 키워드입니다.</small>
        </div>
        <div className="worldcup-create-field">
          <label>썸네일 (선택)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              if (thumbnailPreviewUrl) {
                URL.revokeObjectURL(thumbnailPreviewUrl);
              }
              setThumbnailFile(nextFile);
              setThumbnailPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
              if (nextFile) {
                setThumbnailUrl("");
              }
            }}
          />
          <small>시작 화면의 대표 이미지입니다.</small>
        </div>
        {thumbnailPreviewUrl ? (
          <div className="worldcup-create-preview">
            <span>썸네일 미리보기</span>
            <img src={thumbnailPreviewUrl} alt="Thumbnail preview" />
          </div>
        ) : null}

        <div className="worldcup-create-items">
          <div className="psycho-section-header">
            <div className="psycho-section-title">결과 주제</div>
            <p className="psycho-section-desc">
              결과가 어떻게 결정되는지 안내하는 영역입니다.
            </p>
          </div>
          <div className="psycho-section-sep" />
          <div className="psycho-section-row">
            <div className="psycho-section-title">결과</div>
            <button type="button" onClick={handleAddCard}>
              카드 추가
            </button>
          </div>
          <p className="psycho-help-text">
            테스트 결과로 보여줄 카드입니다. 문단 점수 합산 결과가 이 카드로 연결됩니다.
          </p>
          {cards.map((card, index) => (
            <div key={card.id} className="psycho-card-item">
              <label>
                카드 이름
                <input
                  type="text"
                  value={card.label}
                  onChange={(event) =>
                    handleCardChange(index, { label: event.target.value })
                  }
                />
                <small>결과 제목으로 표시됩니다.</small>
              </label>
              <label>
                카드 요약
                <textarea
                  rows={3}
                  value={card.summary}
                  onChange={(event) =>
                    handleCardChange(index, { summary: event.target.value })
                  }
                />
                <small>결과 화면에 출력되는 설명입니다.</small>
              </label>
              <label>
                키워드 (쉼표로 구분)
                <input
                  type="text"
                  value={card.keywords}
                  onChange={(event) =>
                    handleCardChange(index, { keywords: event.target.value })
                  }
                />
                <small>결과 카드에 표시되는 키워드 목록입니다.</small>
              </label>
              <div className="psycho-media-field">
                <span>카드 이미지 (선택)</span>
                <label
                  className="worldcup-create-upload"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0] || null;
                    const previewUrl = file ? URL.createObjectURL(file) : "";
                    handleCardChange(index, {
                      imageFile: file,
                      imageUrl: "",
                      previewUrl,
                    });
                  }}
                >
                  {card.previewUrl ? (
                    <img
                      className="worldcup-create-upload-image"
                      src={card.previewUrl}
                      alt={card.label || "card"}
                    />
                  ) : (
                    <>
                      <span className="worldcup-create-upload-plus">+</span>
                      <span className="worldcup-create-upload-text">
                        클릭하거나 드래그해서 업로드
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      const previewUrl = file ? URL.createObjectURL(file) : "";
                      handleCardChange(index, {
                        imageFile: file,
                        imageUrl: "",
                        previewUrl,
                      });
                    }}
                  />
                </label>
                <small>결과 카드에 표시되는 이미지입니다.</small>
              </div>
              <button
                type="button"
                className="danger"
                onClick={() => handleRemoveCard(index)}
                disabled={cards.length <= 1}
              >
                카드 삭제
              </button>
            </div>
          ))}
        </div>

        <div className="worldcup-create-items">
          <div className="psycho-section-header">
            <div className="psycho-section-title">질문 주제</div>
            <p className="psycho-section-desc">
              질문과 문단을 어떻게 구성하는지 안내하는 영역입니다.
            </p>
          </div>
          <div className="psycho-section-sep" />
          <div className="psycho-section-row">
            <div className="psycho-section-title">질문 / 문단</div>
            <button type="button" onClick={handleAddParagraph}>
              질문 추가
            </button>
          </div>
          <p className="psycho-help-text">
            질문은 화면에 보이는 질문 문장이고, 문단은 선택지(답변)입니다.
          </p>
          {paragraphs.map((paragraph, pIndex) => (
            <div key={paragraph.id} className="psycho-question-item">
              <div className="psycho-question-header">
                <span className="psycho-item-badge">질문 {pIndex + 1}</span>
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleRemoveParagraph(pIndex)}
                  disabled={paragraphs.length <= 1}
                >
                  질문 삭제
                </button>
              </div>
              <label>
                질문 내용
                <textarea
                  rows={2}
                  value={paragraph.text}
                  onChange={(event) =>
                    handleParagraphChange(pIndex, { text: event.target.value })
                  }
                />
                <small>사용자에게 보여줄 질문 문장입니다.</small>
              </label>
              <div className="psycho-divider" />
              <div className="psycho-paragraph-questions">
                <div className="psycho-paragraph-header">
                  <h3>문단</h3>
                  <button type="button" onClick={() => handleAddQuestion(pIndex)}>
                    문단 추가
                  </button>
                </div>
                {paragraph.questions.map((question, qIndex) => (
                  <div key={question.id} className="psycho-paragraph-item">
                    <div className="psycho-paragraph-title">
                      <span className="psycho-item-badge">문단 {qIndex + 1}</span>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleRemoveQuestion(pIndex, qIndex)}
                        disabled={paragraph.questions.length <= 1}
                      >
                        문단 삭제
                      </button>
                    </div>
                    <label>
                      문단 내용
                      <input
                        type="text"
                        value={question.text}
                        onChange={(event) =>
                          handleQuestionChange(pIndex, qIndex, {
                            text: event.target.value,
                          })
                        }
                      />
                      <small>선택지로 표시될 문장입니다.</small>
                    </label>
                    <div className="psycho-inline-row">
                      <label>
                        결과
                        <select
                          value={question.cardId}
                          onChange={(event) =>
                            handleQuestionChange(pIndex, qIndex, {
                              cardId: event.target.value,
                            })
                          }
                        >
                          <option value="">결과 선택</option>
                          {cards.map((card) => (
                            <option key={card.id} value={card.id}>
                              {card.label || card.id}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        점수
                        <input
                          type="number"
                          value={question.score}
                          onChange={(event) =>
                            handleQuestionChange(pIndex, qIndex, {
                              score: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <small className="psycho-inline-help">
                      선택된 문단은 해당 결과에 점수로 반영됩니다.
                    </small>
                    <div className="psycho-media-field">
                      <span>문단 이미지 (선택)</span>
                      <label
                        className="worldcup-create-upload"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const file = event.dataTransfer.files?.[0] || null;
                          const previewUrl = file ? URL.createObjectURL(file) : "";
                          handleQuestionChange(pIndex, qIndex, {
                            imageFile: file,
                            imageUrl: "",
                            previewUrl,
                          });
                        }}
                      >
                        {question.previewUrl ? (
                          <img
                            className="worldcup-create-upload-image"
                            src={question.previewUrl}
                            alt={question.text || "question"}
                          />
                        ) : (
                          <>
                            <span className="worldcup-create-upload-plus">+</span>
                            <span className="worldcup-create-upload-text">
                              클릭하거나 드래그해서 업로드
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            const previewUrl = file ? URL.createObjectURL(file) : "";
                            handleQuestionChange(pIndex, qIndex, {
                              imageFile: file,
                              imageUrl: "",
                              previewUrl,
                            });
                          }}
                        />
                      </label>
                      <small>선택지 옆에 표시되는 이미지입니다.</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="worldcup-create-actions worldcup-create-actions-right">
          <button
            type="submit"
            className="worldcup-create-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "저장 중..." : "심리 테스트 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
