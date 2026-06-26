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

/**
 * High-performance OCR pipeline utilizing Google Cloud Vision for
 * excellent mixed English and Urdu text extraction.
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
    console.log(`📡 Initializing Google Cloud Vision OCR for: ${fileName}`);

    // Google Cloud Vision requires a base64 encoded image string
    const base64Image = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // We pass language hints to assist the Vision API.
    // GCV has automatic language detection, but hints improve accuracy for mixed docs.
    const languageHints = language === "urd" ? ["ur", "en"] : ["en", "ur"];

    let requestPayload;
    let endpointUrl;

    if (mimeType === "application/pdf") {
      endpointUrl = `https://vision.googleapis.com/v1/files:annotate?key=${GOOGLE_VISION_API_KEY}`;
      requestPayload = {
        requests: [
          {
            inputConfig: {
              content: base64Image,
              mimeType: "application/pdf",
            },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            imageContext: {
              languageHints: languageHints,
            },
            // Process up to first 5 pages inline
            pages: [1, 2, 3, 4, 5],
          },
        ],
      };
    } else {
      endpointUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
      requestPayload = {
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
    }

    const response = await axios.post(
      endpointUrl,
      requestPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responses = response.data.responses;
    if (responses && responses.length > 0) {
      if (mimeType === "application/pdf") {
        // Files annotate returns a list of file responses with nested page responses
        const fileResponses = responses[0].responses;
        if (fileResponses) {
          return fileResponses
            .map((pageRes) => pageRes.fullTextAnnotation?.text || "")
            .join("\n");
        }
      } else {
        if (responses[0].fullTextAnnotation) {
          return responses[0].fullTextAnnotation.text;
        }
      }
    }

    return "";
  } catch (error) {
    console.log("❌ OCR Service Engine Exception:", error?.response?.data || error.message);
    return "";
  }
};
