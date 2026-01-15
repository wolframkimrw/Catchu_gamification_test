import idioms from "./fortune/idioms.json";

export type IdiomsData = typeof idioms;

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
type ElementType = "목" | "화" | "토" | "금" | "수";

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
  if (score >= 85) return "high";
  if (score >= 70) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export function getMessageFromScore(score: number): string {
  if (score >= 85)
    return `오늘의 운세는 한마디로 말하면 “흐름이 이미 만들어진 날”입니다.
억지로 애쓰지 않아도, 상황이 당신을 좋은 방향으로 데려다 주는 기운이 강하게 깔려 있습니다. 평소라면 막혔을 문제, 시간이 걸렸을 일, 괜히 신경 쓰였을 관계까지도 오늘은 비교적 수월하게 풀릴 가능성이 큽니다.

중요한 건 운이 좋아서 모든 걸 바꿔야 하는 날이 아니라,
이미 쌓아온 것들이 자연스럽게 작동하기 시작하는 날이라는 점입니다.
오늘은 새 판을 벌이기보다는, 그동안 준비해 둔 것·미뤄 두었던 것·마음속에만 있던 계획을 조심스럽게 꺼내기에 아주 좋은 날입니다.

오늘은 애쓰지 않아도 길이 이어지는 날입니다. 흐름을 믿어도 좋습니다.`;
  if (score >= 70)
    return `오늘은 전반적으로 이미 괜찮은 흐름 위에 ‘한 겹의 운’이 더 얹히는 날입니다.
대박이 터지는 날이라기보다는, 지금의 방향이 틀리지 않았다는 확신을 주는 하루에 가깝습니다. 무리해서 판을 뒤집기보다는, 현재 하고 있는 일을 조금 더 다듬고 밀어주는 쪽이 훨씬 좋은 결과로 이어집니다.

오늘의 핵심은 욕심을 줄일수록 운이 또렷해진다는 점입니다.
이미 충분히 괜찮은 날이니, 조급해하지 않아도 됩니다.

오늘은 이미 잘 가고 있는 길 위에 있습니다.
한 걸음만 더 차분히 내디뎌도 충분합니다.`;
  if (score >= 50)
    return `
오늘은 운이 나쁘다고 하긴 어렵지만, 그렇다고 모든 것이 술술 풀리는 날도 아닙니다.
상황 자체보다 ‘어떻게 대응하느냐’가 결과를 크게 바꾸는 하루입니다.
무리하게 밀어붙이기보다는, 한 번 더 생각하고 점검하는 태도가 필요합니다.

오늘의 운세의 핵심은 균형입니다.
조급해도 손해, 지나치게 움츠러들어도 손해입니다.
오늘은 “지금 내 위치를 정확히 아는 것”이 가장 큰 운을 부르는 행동입니다.

오늘은 결과보다 방향이 중요한 날입니다.
서두르지 않아도 괜찮고, 멈춰서 점검해도 충분합니다.`;
  return `
조심이 필요한 날 · 회복을 준비하는 단계

오늘은 운이 약하다고 해서 모든 것이 나쁜 날은 아닙니다.
다만 평소보다 마음과 상황이 쉽게 흔들릴 수 있는 하루입니다.
이럴 때 중요한 것은 무언가를 더 해내는 것이 아니라, 불필요한 소모를 줄이는 것입니다.

오늘의 핵심은 버티기와 정리입니다.
오늘 하루를 무사히 지나가는 것만으로도 충분히 의미가 있습니다.

오늘은 애쓰지 않아도 괜찮은 날입니다.
잠시 멈추고, 자신을 지켜도 충분합니다.`;
}

function pickIdiomFromBucket(
  bucket: IdiomBucketKey,
  seed: number | undefined,
  idiomsData: IdiomsData
) {
  const list = idiomsData[bucket] || [];
  if (list.length === 0) return null;
  if (seed === undefined) {
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  }
  const index = Math.abs(seed) % list.length;
  return list[index];
}

export function pickRandomIdiom(bucket: IdiomBucketKey = "mid", idiomsData: IdiomsData = idioms) {
  return pickIdiomFromBucket(bucket, undefined, idiomsData);
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function pickDeterministicIdiom(
  bucket: IdiomBucketKey,
  seed: string,
  idiomsData: IdiomsData = idioms
) {
  const hashed = hashString(seed);
  return pickIdiomFromBucket(bucket, hashed, idiomsData);
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
  idiomsData?: IdiomsData;
}) {
  const idiomsData = params.idiomsData ?? idioms;
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
  const idiom = pickDeterministicIdiom(grade, seed, idiomsData);

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
  idiomsData?: IdiomsData;
}) {
  const birth = new Date(params.birthDate);
  if (Number.isNaN(birth.getTime())) {
    throw new Error("생년월일을 확인해 주세요.");
  }

  return calculateLuck({
    birthDate: birth,
    gender: params.gender,
    calendarType: params.calendarType,
    idiomsData: params.idiomsData,
  });
}
