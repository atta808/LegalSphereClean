/**
 * @file DocumentAnalyzer.js
 * @description Document Vault OCR, analysis, and structured-result workflow.
 */

import { OCRPipeline } from "./OCRPipeline";
import { LanguagePipeline } from "./language/LanguagePipeline";
import { PromptManager } from "../core/PromptManager";
import { ProviderRegistry } from "../core/ProviderRegistry";
import { AIError } from "../core/models/AIError";
import { countUrduChars } from "../../../utils/unicodeHelpers";

export class DocumentAnalyzer {
  static async analyze(attachment, documentContext = {}, options = {}) {
    const { language = "auto" } = options;
    try {
      const { text: rawText, metadata: ocrMetadata } =
        await OCRPipeline.execute(attachment, { language });
      if (!rawText?.trim()) throw this._noTextError("OCR returned no text.");

      const { normalizedText } = LanguagePipeline.process(rawText);
      if (!normalizedText?.trim()) {
        throw this._noTextError("OCR text was empty after normalization.");
      }

      const prompt = PromptManager.buildDocumentVault(
        normalizedText,
        documentContext,
      );
      const llm = ProviderRegistry.getLLMProvider();
      const rawResponse = await llm.execute(prompt, { temperature: 0.1 });
      const parsed = this._parseJsonResponse(rawResponse);

      return {
        ...parsed,
        metadata: {
          ...ocrMetadata,
          promptLength: prompt.length,
          responseLength: rawResponse.length,
          responseUrduCount: countUrduChars(rawResponse),
        },
      };
    } catch (error) {
      if (error instanceof AIError || error.code?.startsWith("OCR_"))
        throw error;
      throw new AIError({
        code: "DOCUMENT_ANALYZER_ERROR",
        userMessage: "Document analysis failed. Please try again.",
        technicalMessage: error.message,
        source: "DocumentAnalyzer",
      });
    }
  }

  static _noTextError(technicalMessage) {
    return new AIError({
      code: "OCR_NO_TEXT",
      userMessage:
        "No readable text was detected. Please upload a clearer PDF or image.",
      technicalMessage,
      source: "DocumentAnalyzer",
    });
  }

  static _parseJsonResponse(response) {
    try {
      let cleaned = response
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const startIndex = cleaned.indexOf("{");
      const endIndex = cleaned.lastIndexOf("}");
      if (startIndex === -1 || endIndex <= startIndex) {
        throw new Error("No JSON object found in response");
      }
      cleaned = cleaned.substring(startIndex, endIndex + 1);
      return JSON.parse(cleaned);
    } catch (error) {
      throw new AIError({
        code: "JSON_PARSE_FAILED",
        userMessage:
          "The document analysis could not be structured. Please try again.",
        technicalMessage: error.message,
        source: "DocumentAnalyzer",
      });
    }
  }
}
