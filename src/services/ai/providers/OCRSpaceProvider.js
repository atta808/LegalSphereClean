/**
 * @file OCRSpaceProvider.js
 * @description Provides the interface for communicating with the OCR.Space API.
 * Responsible for handling PDF and Image OCR using OCR.Space.
 * Supports dynamic language selection for multilingual extraction.
 */

import { AIConfig } from "../../../config/AIConfig";
import { countUrduChars } from "../../../utils/unicodeHelpers";

/**
 * OCR.Space API Provider
 */
export class OCRSpaceProvider {
  static METADATA = {
    name: "OCRSpace",
    version: "1.0",
    capabilities: ["OCR"],
  };

  /**
   * Executes an OCR request against the OCR.Space API with retry and timeout support.
   * Uses FormData to support file URIs without loading into memory (important for RN/Expo).
   * Now supports dynamic language selection.
   *
   * @param {Object} fileParams - File parameters.
   * @param {string} fileParams.uri - The local file URI.
   * @param {string} fileParams.name - The file name.
   * @param {string} fileParams.type - The MIME type of the file.
   * @param {Object} [options={}] - Options like retries, timeout, and language.
   * @param {string} [options.language='eng,urd'] - Language code(s) for OCR (comma-separated).
   * @param {number} [options.retries=1] - Number of retries on failure.
   * @param {number} [options.timeout=45000] - Timeout in milliseconds.
   * @returns {Promise<{text: string, metadata: Object}>} Extracted text and metadata.
   * @throws {Error} If the API request fails.
   */
  static async executeOCR(fileParams, options = {}) {
    const {
      retries = 1,
      timeout = 45000, // OCR can take longer for PDFs
      language = "auto", // default to English + Urdu
    } = options;

    let attempt = 0;
    let lastError = null;
    const startTime = Date.now();

    while (attempt <= retries) {
      try {
        const formData = new FormData();

        // Append file
        formData.append("file", {
          uri: fileParams.uri,
          name: fileParams.name || "document.pdf",
          type: fileParams.mimeType || "application/pdf",
        });

        // Append settings – dynamic language
        formData.append("apikey", AIConfig.getOCRSpaceKey());
        formData.append("language", language);
        formData.append("isOverlayRequired", "false");
        formData.append("detectOrientation", "true");
        formData.append("scale", "true");
        formData.append("OCREngine", "2"); // Engine 2 is better for PDFs and receipts

        const url = "https://api.ocr.space/parse/image";

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: "POST",
          body: formData,
          headers: {
            // React Native's fetch will automatically set Content-Type to multipart/form-data with the correct boundary
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(
            `OCR.Space API error (${response.status}): ${errorData}`,
          );
        }

        const data = await response.json();

        // OCR.Space Free plan may return a warning (e.g. page limit reached)
        // but still provide ParsedResults for the pages it processed.
        // Use ParsedResults whenever they exist.

        if (!data.ParsedResults || data.ParsedResults.length === 0) {
          const errorMsg = data.ErrorMessage
            ? Array.isArray(data.ErrorMessage)
              ? data.ErrorMessage.join(", ")
              : String(data.ErrorMessage)
            : "Unknown processing error";

          throw new Error(`OCR.Space processing error: ${errorMsg}`);
        }

       if (__DEV__ && data.IsErroredOnProcessing) {
  console.warn(
    "OCR.Space Warning:",
    Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join(", ")
      : (data.ErrorMessage || "Unknown warning"),
  );
}

        // Combine text from all pages
        const combinedText = data.ParsedResults.map(
          (result) => result.ParsedText,
        )
          .join("\n\n")
          .trim();

        const metadata = this._buildMetadata(
          "OCRSpace",
          combinedText,
          language,
          startTime,
        );

        if (__DEV__) {
          console.log(
            `OCRSpaceProvider: Extracted ${combinedText.length} chars, Urdu count: ${metadata.urduCount}`,
          );
        }

        return { text: combinedText, metadata };
      } catch (error) {
        lastError = error;
        attempt++;
        if (attempt <= retries) {
          if (__DEV__)
            console.warn(
              `OCRSpaceProvider retry ${attempt}/${retries} after error:`,
              error.message,
            );
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    if (__DEV__) {
      console.error(
        "OCRSpaceProvider Error (all retries failed):",
        lastError.message,
      );
    }
    throw new Error(
      `Failed to execute OCR.Space request: ${lastError.message}`,
    );
  }

  /**
   * Builds lightweight OCR metadata.
   * @param {string} providerName
   * @param {string} extractedText
   * @param {string} language
   * @param {number} startTime
   * @returns {Object}
   */
  static _buildMetadata(providerName, extractedText, language, startTime) {
    const processingTimeMs = Date.now() - startTime;
    const urduCount = countUrduChars(extractedText);
    return {
      provider: providerName,
      timestamp: new Date().toISOString(),
      language: language,
      processingTimeMs: processingTimeMs,
      textLength: extractedText.length,
      urduCount: urduCount,
    };
  }
}
