export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photograph could not be read."));
    };

    image.src = url;
  });

const canvasToBlob = (canvas) =>
  new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });

/**
 * Downscale to 1600 px and re-encode as JPEG before it leaves the browser.
 * This keeps uploads fast on mobile and stays under the API's 5 MB limit.
 */
export const compressImage = async (file) => {
  if (!file) {
    throw new Error("Choose a photograph first.");
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP photograph.");
  }

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("This photograph could not be read.");
  }

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(sourceWidth, sourceHeight)
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not resize the photograph.");
  }

  // JPEG has no alpha channel; fill with paper white instead of black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas);

  if (!blob) {
    throw new Error("This photograph could not be compressed.");
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      "This photograph is still over 5 MB after compression. Choose a smaller file."
    );
  }

  const baseName = (file.name || "frame").replace(/\.[^.]+$/, "");

  return new File([blob], `${baseName || "frame"}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};
