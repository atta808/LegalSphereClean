// services/ocrService.js
import axios from "axios";

const OCR_API_KEY = "REDACTED";

/**
 * High-performance OCR pipeline utilizing structural multi-page extraction.
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
    const formData = new FormData();

    formData.append("apikey", OCR_API_KEY);
    formData.append("language", language);
    formData.append("isOverlayRequired", "false");
    formData.append("isCreateSearchablePdf", "false");
    formData.append("detectOrientation", "true"); // Automatically handles tilted or upside-down mobile captures

    formData.append("file", {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    });

    console.log(`📡 Dispatched OCR request instance [Language: ${language}]`);

    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (response.data?.ParsedResults) {
      // Flawlessly aggregates text fragments across multi-page segments
      return response.data.ParsedResults.map(
        (result) => result.ParsedText,
      ).join("\n");
    }

    return "";
  } catch (error) {
    if (__DEV__) {
      console.log("❌ OCR Service Engine Exception:", error);
    }
    return "";
  }
};
