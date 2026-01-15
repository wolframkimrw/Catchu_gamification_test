const ALLOWED_EXTENSIONS = [".jpg", ".png"];
const MIN_DIMENSION = 200;
const MAX_DIMENSION = 4000;

const hasAllowedExtension = (value: string) => {
  const lower = value.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const loadImageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    image.src = src;
  });

export const validateImageUrl = async (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "이미지 URL이 필요합니다.";
  }
  const isHttp = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const isMedia = trimmed.startsWith("/media/");
  if (!isHttp && !isMedia) {
    return "이미지 URL만 가능합니다.";
  }
  if (!hasAllowedExtension(trimmed)) {
    return "이미지는 jpg 또는 png만 가능합니다.";
  }
  try {
    const { width, height } = await loadImageSize(trimmed);
    if (Math.min(width, height) < MIN_DIMENSION) {
      return "이미지 해상도는 200px 이상, 4000px 이하만 가능합니다.";
    }
    if (Math.max(width, height) > MAX_DIMENSION) {
      return "이미지 해상도는 200px 이상, 4000px 이하만 가능합니다.";
    }
  } catch {
    return "이미지 URL을 불러올 수 없습니다.";
  }
  return null;
};

export const validateImageFile = async (file: File) => {
  if (!hasAllowedExtension(file.name)) {
    return "이미지는 jpg 또는 png만 가능합니다.";
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const { width, height } = await loadImageSize(objectUrl);
    if (Math.min(width, height) < MIN_DIMENSION || Math.max(width, height) > MAX_DIMENSION) {
      return "이미지 해상도는 200px 이상, 4000px 이하만 가능합니다.";
    }
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
