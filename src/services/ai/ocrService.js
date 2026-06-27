// services/ai/ocrService.js
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy"; // ✅ FIXED
import Constants from "expo-constants";

// ============================================================================
// GOOGLE CLOUD VISION API CONFIGURATION
// ============================================================================
const GOOGLE_VISION_API_KEY = "AIzaSyCVyCTcgKUY6rgjUVeypkJXx7iOyAak_OQ";
const OCR_API_KEY = "K85664157688957";

// ============================================================================
// SUPPORTED MIME TYPES
// ============================================================================
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/tif",
  "image/heic",
  "image/heif",
];

/**
 * High-performance OCR pipeline with retry logic and auto-detection.
 * - Images → Google Cloud Vision API
 * - PDFs → OCR.Space API
 * - Unknown types → auto-detect by extension
 */
export const extractTextWithOCR = async (
  fileUri,
  mimeType = "image/jpeg",
  fileName = "image.jpg",
  language = "eng",
  options = {},
) => {
  const { returnRaw = false, maxResults = 10, maxRetries = 3 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (__DEV__) {
        console.log(`📡 OCR Attempt ${attempt}/${maxRetries} for: ${fileName}`);
      }

      // ---------------------------------------------------------
      // BRANCH 1: PDFs → OCR.Space
      // ---------------------------------------------------------
      if (mimeType === "application/pdf") {
        if (__DEV__) {
          console.log(`📄 Processing PDF with OCR.Space for: ${fileName}`);
        }

        const formData = new FormData();
        formData.append("apikey", OCR_API_KEY);
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "false");
        formData.append("isCreateSearchablePdf", "false");
        formData.append("detectOrientation", "true");
        formData.append("scale", "true");
        formData.append("OCREngine", "2");

        formData.append("file", {
          uri: fileUri,
          type: "application/pdf",
          name: fileName || "document.pdf",
        });

        const response = await axios.post(
          "https://api.ocr.space/parse/image",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 60000,
          },
        );

        if (response.data?.ParsedResults) {
          const text = response.data.ParsedResults.map(
            (result) => result.ParsedText || "",
          )
            .join("\n")
            .trim();

          if (text || attempt === maxRetries) {
            return returnRaw ? response.data : text;
          }
        }

        if (attempt === maxRetries) return returnRaw ? response.data : "";
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      // ---------------------------------------------------------
      // BRANCH 2: Images → Google Cloud Vision
      // ---------------------------------------------------------
      if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
        if (__DEV__) {
          console.log(
            `🖼️ Processing Image with Google Cloud Vision [Language: ${language}] for: ${fileName}`,
          );
        }

        // ✅ FIXED: Use FileSystem.readAsStringAsync with Base64 encoding
        const base64Image = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (!base64Image || base64Image.length < 100) {
          throw new Error("Image file is empty or too small");
        }

        const languageHints = language === "urd" ? ["ur", "en"] : ["en", "ur"];

        const requestPayload = {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults }],
              imageContext: { languageHints },
            },
          ],
        };

        const response = await axios.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
          requestPayload,
          {
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
          },
        );

        const responses = response.data?.responses || [];

        if (responses.length > 0 && responses[0].fullTextAnnotation) {
          const text = responses[0].fullTextAnnotation.text || "";

          if (responses[0].error) {
            throw new Error(responses[0].error.message || "Vision API error");
          }

          if (text || attempt === maxRetries) {
            return returnRaw ? response.data : text;
          }
        }

        if (attempt === maxRetries) return returnRaw ? response.data : "";

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)),
        );
        continue;
      }

      // ---------------------------------------------------------
      // BRANCH 3: Auto-detect by file extension
      // ---------------------------------------------------------
      const extension = fileName?.split(".").pop()?.toLowerCase() || "";
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
        "bmp",
        "tiff",
        "tif",
        "heic",
        "heif",
      ];
      const pdfExtensions = ["pdf"];

      if (imageExtensions.includes(extension)) {
        if (__DEV__)
          console.log(`🖼️ Detected image by extension: ${extension}`);
        const imageMime = `image/${extension === "jpg" ? "jpeg" : extension}`;
        return await extractTextWithOCR(
          fileUri,
          imageMime,
          fileName,
          language,
          options,
        );
      }

      if (pdfExtensions.includes(extension)) {
        if (__DEV__) console.log(`📄 Detected PDF by extension`);
        return await extractTextWithOCR(
          fileUri,
          "application/pdf",
          fileName,
          language,
          options,
        );
      }

      if (__DEV__) {
        console.log(
          `⚠️ Unsupported file type: ${mimeType} (extension: ${extension})`,
        );
      }
      return "";
    } catch (error) {
      if (__DEV__) {
        console.log(
          `❌ OCR attempt ${attempt} failed:`,
          error?.message || error,
        );
      }

      if (attempt === maxRetries) {
        if (__DEV__) console.log("❌ All OCR attempts failed");
        return "";
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)),
      );
    }
  }

  return "";
};

/**
 * Convenience wrapper for extractTextWithOCR.
 */
export const extractDocumentText = async (
  document,
  language = "eng",
  options = {},
) => {
  if (!document?.uri) {
    if (__DEV__) console.log("❌ No document URI provided");
    return "";
  }

  try {
    return await extractTextWithOCR(
      document.uri,
      document.mimeType || document.type || "image/jpeg",
      document.name || document.fileName || "document",
      language,
      options,
    );
  } catch (error) {
    if (__DEV__) console.log("❌ extractDocumentText error:", error);
    return "";
  }
};

// Helper utilities
export const isSupportedImage = (mimeType, fileName) => {
  if (mimeType && SUPPORTED_IMAGE_TYPES.includes(mimeType)) return true;
  const extension = fileName?.split(".").pop()?.toLowerCase() || "";
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "bmp",
    "tiff",
    "tif",
    "heic",
    "heif",
  ];
  return imageExtensions.includes(extension);
};

export const isSupportedPDF = (mimeType, fileName) => {
  if (mimeType === "application/pdf") return true;
  const extension = fileName?.split(".").pop()?.toLowerCase() || "";
  return extension === "pdf";
};

export const getOCREngine = (mimeType, fileName) => {
  if (isSupportedImage(mimeType, fileName)) return "google-vision";
  if (isSupportedPDF(mimeType, fileName)) return "ocr-space";
  return null;
};

export default {
  extractTextWithOCR,
  extractDocumentText,
  isSupportedImage,
  isSupportedPDF,
  getOCREngine,
  SUPPORTED_IMAGE_TYPES,
  GOOGLE_VISION_API_KEY,
  OCR_API_KEY,
};
