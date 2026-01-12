import idioms from "./idioms.json";

export const HEAVENLY_STEMS = [
  "갑",
  "을",
  "병",
  "정",
  "무",
  "기",
  "경",
  "신",
  "임",
  "계",
] as const;

type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];

type IdiomBucketKey = keyof typeof idioms;

export type CalendarType = "SOLAR" | "LUNAR";
export type GenderType = "male" | "female";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const ELEMENTS = ["목", "화", "토", "금", "수"] as const;

type ElementType = (typeof ELEMENTS)[number];

export function getWeekdayElement(weekday: number): ElementType {
  const mapping: ElementType[] = ["수", "목", "화", "토", "금", "수", "토"];
  return mapping[weekday % 7];
}

function getStemElement(stem: HeavenlyStem): ElementType {
  const elementMap: Record<HeavenlyStem, ElementType> = {
    갑: "목",
    을: "목",
    병: "화",
    정: "화",
    무: "토",
    기: "토",
    경: "금",
    신: "금",
    임: "수",
    계: "수",
  };
  return elementMap[stem];
}

export function getRelationScore(
  stem: HeavenlyStem,
  weekdayElement: ElementType,
  gender: GenderType
): number {
  const base = 52;
  const stemElement = getStemElement(stem);
  const elementBonus = stemElement === weekdayElement ? 16 : 4;
  const genderBonus = gender === "female" ? 3 : 0;
  return base + elementBonus + genderBonus;
}

export function getWeekdayBonus(weekday: number): number {
  const isWeekend = weekday === 0 || weekday === 6;
  return isWeekend ? 6 : 0;
}

export function getGradeFromScore(score: number): IdiomBucketKey {
  if (score >= 85) return "very_high";
  if (score >= 70) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export function getMessageFromScore(score: number): string {
  if (score >= 85) return "오늘은 운이 크게 열립니다. 공격적으로 움직여도 좋아요.";
  if (score >= 70) return "안정적인 길운이 이어집니다. 중요한 일에 집중하세요.";
  if (score >= 50) return "무난한 흐름입니다. 작은 기회를 놓치지 마세요.";
  return "잠시 페이스를 조절하면 더 좋은 흐름이 옵니다.";
}

function pickIdiomFromBucket(bucket: IdiomBucketKey, seed?: number) {
  const list = idioms[bucket] || [];
  if (list.length === 0) return null;
  if (seed === undefined) {
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  }
  const index = Math.abs(seed) % list.length;
  return list[index];
}

export function pickRandomIdiom(bucket: IdiomBucketKey = "mid") {
  return pickIdiomFromBucket(bucket);
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function pickDeterministicIdiom(bucket: IdiomBucketKey, seed: string) {
  const hashed = hashString(seed);
  return pickIdiomFromBucket(bucket, hashed);
}

export function getHeavenlyStemFromBirthDate(birthDate: Date): HeavenlyStem {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  const index = (year + month + day) % HEAVENLY_STEMS.length;
  return HEAVENLY_STEMS[index];
}

export function calculateLuck(params: {
  birthDate: Date;
  gender: GenderType;
  calendarType: CalendarType;
  todayDate?: Date;
}) {
  const today = params.todayDate ?? new Date();
  const weekday = today.getDay();
  const todayDate = today.toISOString().slice(0, 10);
  const weekdayLabel = WEEKDAY_LABELS[weekday] || "";
  const weekdayElement = getWeekdayElement(weekday);
  const birthStem = getHeavenlyStemFromBirthDate(params.birthDate);

  const relationScore = getRelationScore(birthStem, weekdayElement, params.gender);
  const bonus = getWeekdayBonus(weekday);
  const score = Math.max(0, Math.min(100, relationScore + bonus));
  const grade = getGradeFromScore(score);
  const message = getMessageFromScore(score);
  const seed = `${todayDate}-${params.birthDate.toISOString()}-${params.gender}-${params.calendarType}`;
  const idiom = pickDeterministicIdiom(grade, seed);

  return {
    score,
    grade,
    message,
    idiom,
    meta: {
      todayDate,
      todayWeekday: weekdayLabel,
      weekdayElement,
      birthStem,
      gender: params.gender,
      calendarType: params.calendarType,
    },
  };
}

export function calculateLuckFromBirthDate(params: {
  birthDate: string;
  gender: GenderType;
  calendarType: CalendarType;
}) {
  const birth = new Date(params.birthDate);
  if (Number.isNaN(birth.getTime())) {
    throw new Error("생년월일을 확인해 주세요.");
  }

  return calculateLuck({
    birthDate: birth,
    gender: params.gender,
    calendarType: params.calendarType,
  });
}
