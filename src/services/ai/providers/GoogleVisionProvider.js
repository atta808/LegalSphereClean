/**
 * @file GoogleVisionProvider.js
 * @description Provides the interface for communicating with the Google Cloud Vision API.
 * Responsible only for making requests to Google Vision for image OCR.
 * Supports multilingual detection with language hints.
 */

import { AIConfig } from "../../../config/AIConfig";
import { countUrduChars } from "../../../utils/unicodeHelpers";

/**
 * Google Cloud Vision API Provider
 */
export class GoogleVisionProvider {
  static METADATA = {
    name: "GoogleVision",
    version: "1.0",
    capabilities: ["OCR", "Vision"],
  };

  /**
   * Executes an OCR request against the Google Vision API for an image with retry and timeout.
   * Now supports language hints to improve Urdu / mixed-language extraction.
   *
   * @param {string} base64Image - The base64 encoded image string.
   * @param {Object} [options={}] - Options like retries, timeout, and languageHints.
   * @param {Array<string>} [options.languageHints=['ur','en']] - Language hints for Google Vision.
   * @param {number} [options.retries=1] - Number of retries on failure.
   * @param {number} [options.timeout=25000] - Timeout in milliseconds.
   * @returns {Promise<{text: string, metadata: Object}>} Extracted text and metadata.
   * @throws {Error} If the API request fails.
   */
  static async executeOCR(base64Image, options = {}) {
    const {
      retries = 1,
      timeout = 25000,
      languageHints = ["ur", "en"], // prioritise Urdu
    } = options;

    let attempt = 0;
    let lastError = null;
    const startTime = Date.now();

    while (attempt <= retries) {
      try {
        // Google Vision API requires just the base64 data, strip prefix if present
        const cleanBase64 = base64Image.replace(
          /^data:image\/[a-z]+;base64,/,
          "",
        );

        const requestBody = {
          requests: [
            {
              image: {
                content: cleanBase64,
              },
              features: [
                {
                  type: "DOCUMENT_TEXT_DETECTION",
                },
              ],
              // Added: language hints to support Urdu and mixed-language documents
              imageContext: {
                languageHints: languageHints,
              },
            },
          ],
        };

        const url = `https://vision.googleapis.com/v1/images:annotate?key=${AIConfig.getGoogleVisionKey()}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(
            `Google Vision API error (${response.status}): ${errorData}`,
          );
        }

        const data = await response.json();

        if (
          data.responses &&
          data.responses.length > 0 &&
          data.responses[0].error
        ) {
          throw new Error(
            `Google Vision API internal error: ${data.responses[0].error.message}`,
          );
        }

        if (
          !data.responses ||
          !data.responses.length ||
          !data.responses[0].fullTextAnnotation
        ) {
          // No text found – return empty with metadata
          const metadata = this._buildMetadata(
            "GoogleVision",
            "",
            languageHints,
            startTime,
          );
          if (__DEV__) {
            console.log(`GoogleVisionProvider: No text found.`);
          }
          return { text: "", metadata };
        }

        const fullText = data.responses[0].fullTextAnnotation.text || "";
        const metadata = this._buildMetadata(
          "GoogleVision",
          fullText,
          languageHints,
          startTime,
        );

        if (__DEV__) {
          console.log(
            `GoogleVisionProvider: Extracted ${fullText.length} chars, Urdu count: ${metadata.urduCount}`,
          );
        }

        return { text: fullText, metadata };
      } catch (error) {
        lastError = error;
        attempt++;
        if (attempt <= retries) {
          if (__DEV__)
            console.warn(
              `GoogleVisionProvider retry ${attempt}/${retries} after error:`,
              error.message,
            );
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (__DEV__) {
      console.error(
        "GoogleVisionProvider Error (all retries failed):",
        lastError.message,
      );
    }
    throw new Error(
      `Failed to execute Google Vision OCR request: ${lastError.message}`,
    );
  }

  /**
   * Builds lightweight OCR metadata.
   * @param {string} providerName
   * @param {string} extractedText
   * @param {Array<string>} languageHints
   * @param {number} startTime
   * @returns {Object}
   */
  static _buildMetadata(providerName, extractedText, languageHints, startTime) {
    const processingTimeMs = Date.now() - startTime;
    const urduCount = countUrduChars(extractedText);
    return {
      provider: providerName,
      timestamp: new Date().toISOString(),
      language: languageHints.join(","),
      processingTimeMs: processingTimeMs,
      textLength: extractedText.length,
      urduCount: urduCount,
      // Confidence is not available from Google Vision in the response, we could add if needed
    };
  }
}
