/**
 * @file DocumentReader.js
 * @description Shared document-reading workflow for Lex AI and AI ChatRoom.
 */

import { OCRPipeline } from "./OCRPipeline";
import { LanguagePipeline } from "./language/LanguagePipeline";
import { AIError } from "../core/models/AIError";
import { countUrduChars } from "../../../utils/unicodeHelpers";

export class DocumentReader {
  static async read(attachment, options = {}) {
    const { language = "auto" } = options;
    const { text: rawText, metadata: ocrMetadata } = await OCRPipeline.execute(
      attachment,
      { language },
    );

    if (!rawText?.trim()) {
      throw this._noTextError("OCR returned no text.");
    }

    const { language: detectedLanguage, normalizedText } =
      LanguagePipeline.process(rawText);
    if (!normalizedText?.trim()) {
      throw this._noTextError("OCR text was empty after normalization.");
    }

    return {
      language: detectedLanguage,
      text: normalizedText,
      metadata: {
        ...ocrMetadata,
        detectedLanguage,
        normalizedLength: normalizedText.length,
        normalizedUrduCount: countUrduChars(normalizedText),
      },
    };
  }

  static _noTextError(technicalMessage) {
    return new AIError({
      code: "OCR_NO_TEXT",
      userMessage:
        "No readable text was detected. Please upload a clearer PDF or image.",
      technicalMessage,
      source: "DocumentReader",
    });
  }
}
