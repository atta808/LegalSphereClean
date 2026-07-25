/**
 * @file TextNormalizer.js
 * @description Normalizes text formatting, including Unicode normalization (NFC).
 * Preserves Arabic/Urdu script.
 * Includes dev logging to detect Urdu character loss.
 */

import { countUrduChars } from "../../../../utils/unicodeHelpers";

export class TextNormalizer {
  /**
   * Normalizes text by:
   * - Applying Unicode NFC normalization (composed form)
   * - Normalizing whitespace and line endings
   * - Preserving all non-Latin characters
   *
   * @param {string} text - The text to normalize.
   * @returns {string} The normalized text.
   */
  static normalize(text) {
    if (!text || typeof text !== "string") return "";

    const originalUrduCount = countUrduChars(text);

    // NFC normalization (composed form) – safe for Arabic/Urdu
    let normalized = text.normalize("NFC");

    // Normalize line endings: \r\n -> \n, \r -> \n
    normalized = normalized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Remove zero-width spaces (U+200B, U+200C, U+200D) but keep ZWJ/U+200D if needed? We keep them.
    // Do not remove U+200D (ZWNJ) as it's used in Urdu. We'll only remove U+200B (zero-width space) optionally.
    // But we keep all.

    if (__DEV__) {
      const newUrduCount = countUrduChars(normalized);
      if (newUrduCount < originalUrduCount * 0.9 && originalUrduCount > 0) {
        console.warn(
          `TextNormalizer: Urdu characters dropped from ${originalUrduCount} to ${newUrduCount} (significant drop)`,
        );
      }
    }

    return normalized;
  }
}
