/**
 * @file TextCleaner.js
 * @description Cleans raw OCR text by removing control characters, extra spaces, and other artifacts.
 * Unicode-safe: preserves Arabic/Urdu script.
 * Now includes dev logging to warn if Urdu characters are lost.
 */

import { countUrduChars } from "../../../../utils/unicodeHelpers";

export class TextCleaner {
  /**
   * Cleans the input text by:
   * - Removing control characters (except newlines and tabs)
   * - Collapsing multiple spaces, newlines, tabs
   * - Stripping leading/trailing whitespace
   *
   * @param {string} text - The raw text to clean.
   * @returns {string} The cleaned text.
   */
  static clean(text) {
    if (!text || typeof text !== "string") return "";

    const originalUrduCount = countUrduChars(text);

    // Remove control characters except newline (0x0A) and tab (0x09)
    let cleaned = text.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "");

    // Replace multiple spaces, tabs, and newlines with single space
    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n"); // collapse multiple newlines to max 2

    // Trim leading/trailing whitespace
    cleaned = cleaned.trim();

    if (__DEV__) {
      const newUrduCount = countUrduChars(cleaned);
      if (newUrduCount < originalUrduCount * 0.9 && originalUrduCount > 0) {
        console.warn(
          `TextCleaner: Urdu characters dropped from ${originalUrduCount} to ${newUrduCount} (significant drop)`,
        );
      }
    }

    return cleaned;
  }
}
