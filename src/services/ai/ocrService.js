// services/ocrService.js
import axios from "axios";
import * as FileSystem from "expo-file-system";

// ============================================================================
// GOOGLE CLOUD VISION API CONFIGURATION
//
// To configure Google Cloud Vision for LegalSphere:
// 1. Go to Google Cloud Console (console.cloud.google.com).
// 2. Create a new project or select an existing one.
// 3. Navigate to "APIs & Services" > "Library".
// 4. Search for "Cloud Vision API" and enable it.
// 5. Navigate to "APIs & Services" > "Credentials".
// 6. Click "Create Credentials" > "API key".
// 7. (Highly Recommended) Edit the API Key and add restrictions so it can only
//    be used by your Android/iOS app's bundle ID.
// 8. Add the API key to your environment variables as EXPO_PUBLIC_GOOGLE_VISION_API_KEY.
// ============================================================================
const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || "";
const OCR_API_KEY = "K85664157688957"; // Fallback OCR.Space API Key for PDFs

/**
 * High-performance OCR pipeline utilizing structural multi-page extraction.
 * Google Cloud Vision handles Image OCR for mixed English/Urdu extraction.
 * OCR.Space handles PDF OCR to avoid base64 memory overhead and synchronous GCV limits.
 * @param {string} fileUri - The localized file path URI.
 * @param {string} mimeType - The target document MIME type.
 * @param {string} fileName - File descriptor.
 * @param {string} language - Engine routing parameter ('eng' | 'urd').
 */
export const extractTextWithOCR = async (
  fileUri,
  mimeType = "image/jpeg",
  fileName = "image.jpg",
  language = "eng",
) => {
  try {
    // ---------------------------------------------------------
    // BRANCH 1: PDFs -> Preserve OCR.Space functionality
    // ---------------------------------------------------------
    if (mimeType === "application/pdf") {
      if (__DEV__) console.log(`📡 Dispatched OCR request instance (OCR.Space) [Language: ${language}] for PDF: ${fileName}`);

      const formData = new FormData();
      formData.append("apikey", OCR_API_KEY);
      // Fallback language strictly to 'eng' for OCR.Space since it doesn't support 'urd'
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("isCreateSearchablePdf", "false");
      formData.append("detectOrientation", "true");

      formData.append("file", {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      });

      const response = await axios.post(
        "https://api.ocr.space/parse/image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.ParsedResults) {
        return response.data.ParsedResults.map(
          (result) => result.ParsedText
        ).join("\n");
      }
      return "";
    }

    // ---------------------------------------------------------
    // BRANCH 2: Images -> Use Google Cloud Vision API
    // ---------------------------------------------------------
    if (__DEV__) console.log(`📡 Initializing Google Cloud Vision OCR for Image: ${fileName}`);

    // Google Cloud Vision requires a base64 encoded image string
    const base64Image = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // We pass language hints to assist the Vision API.
    const languageHints = language === "urd" ? ["ur", "en"] : ["en", "ur"];

    const requestPayload = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: {
            languageHints: languageHints,
          },
        },
      ],
    };

    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      requestPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responses = response.data.responses;
    if (responses && responses.length > 0 && responses[0].fullTextAnnotation) {
      return responses[0].fullTextAnnotation.text;
    }

    return "";
  } catch (error) {
    if (__DEV__) console.log("❌ OCR Service Engine Exception");
    return "";
  }
};
