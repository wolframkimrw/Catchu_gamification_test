const loadImageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    image.src = src;
  });

const allowedImageTypes = new Set(["image/jpeg", "image/png"]);
const allowedImageExtensions = new Set(["jpg", "jpeg", "png"]);

const getFileExtension = (name: string) => {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
};

export const validateImageUrl = async (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "이미지 URL이 필요합니다.";
  }
  try {
    await loadImageSize(trimmed);
  } catch {
    return "이미지 URL을 불러올 수 없습니다.";
  }
  return null;
};

export const validateImageFile = async (file: File) => {
  const extension = getFileExtension(file.name);
  if (file.type && !allowedImageTypes.has(file.type)) {
    return "png, jpg, jpeg 파일만 업로드할 수 있습니다.";
  }
  if (!file.type && extension && !allowedImageExtensions.has(extension)) {
    return "png, jpg, jpeg 파일만 업로드할 수 있습니다.";
  }
  if (!file.type && !extension) {
    return "png, jpg, jpeg 파일만 업로드할 수 있습니다.";
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    await loadImageSize(objectUrl);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
