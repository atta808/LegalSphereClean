/**
 * @file OCRPipeline.js
 * @description The unified OCR Pipeline.
 * Handles routing between Google Vision (Images) and OCR.Space (PDFs) with automatic fallbacks.
 * Never duplicates OCR logic; this is the single source of truth for text extraction.
 * Supports language propagation and returns metadata.
 */

import { ProviderRegistry } from "../core/ProviderRegistry";
import { AIEvents } from "../core/AIEvents";
import { AIError } from "../core/models/AIError";
import { countUrduChars } from "../../../utils/unicodeHelpers";
import * as FileSystem from "expo-file-system/legacy";
import { FileIngestionService } from "./FileIngestionService";

/**
 * Unified OCR Pipeline
 */
export class OCRPipeline {
  /**
   * Executes the OCR process with automatic fallback strategy based on file type.
   * Returns extracted text and lightweight metadata.
   *
   * @param {Object} fileParams - The file details (uri, name, type, base64 for images).
   * @param {Object} [options={}] - Options like language.
   * @param {string} [options.language='eng,urd'] - Language hint for OCR (comma-separated for OCR.Space, array for Google Vision).
   * @returns {Promise<{text: string, metadata: Object}>} Extracted text and metadata.
   * @throws {AIError} If both primary and fallback OCR methods fail.
   */
  static async execute(fileParams, options = {}) {
    const { language = "auto" } = options;

    FileIngestionService.validate(fileParams);

    AIEvents.emitOCRStarted();

    const isPdf = FileIngestionService.isPdf(fileParams);

    let result;
    if (isPdf) {
      result = await this._executePdfWorkflow(fileParams, language);
    } else {
      result = await this._executeImageWorkflow(fileParams, language);
    }

    if (__DEV__) {
      console.log(
        `OCRPipeline: Completed with provider ${result.metadata.provider}, text length ${result.metadata.textLength}, Urdu count ${result.metadata.urduCount}`,
      );
    }

    AIEvents.emitOCRCompleted();
    return result;
  }

  /**
   * PDF Workflow: Primary = OCR.Space, Fallback = Google Vision.
   */
  static async _executePdfWorkflow(fileParams, language) {
    const primary = ProviderRegistry.getPdfOCRProvider();
    try {
      if (__DEV__)
        console.log(
          `OCRPipeline: Starting PDF workflow with language ${language}`,
        );
      // OCR.Space expects language as string (comma-separated)
      const result = await primary.executeOCR(fileParams, {
        language: language,
      });
      ProviderRegistry.reportSuccess(primary);
      if (result.text) return result;
      throw new Error("Primary PDF OCR provider returned empty result.");
    } catch (error) {
      ProviderRegistry.reportFailure(primary);
      if (__DEV__)
        console.warn(
          "OCRPipeline: Primary PDF OCR failed, falling back.",
          error.message,
        );
      throw new AIError({
        code: "OCR_ALL_FAILED",
        userMessage: "Failed to extract text from the PDF.",
        technicalMessage: `OCR.Space failed to read the PDF: ${error.message}`,
        source: "OCRPipeline",
      });
    }
  }

  /**
   * Image Workflow: Primary = Google Vision, Fallback = OCR.Space.
   */
  static async _executeImageWorkflow(fileParams, language) {
    const primary = ProviderRegistry.getImageOCRProvider();
    const fallback = ProviderRegistry.getPdfOCRProvider();

    try {
      if (__DEV__)
        console.log(
          `OCRPipeline: Starting Image workflow with language ${language}`,
        );
      const result = await this._executeGoogleVision(
        fileParams,
        language,
        primary,
      );
      ProviderRegistry.reportSuccess(primary);
      if (result.text) return result;
      throw new Error("Primary Image OCR provider returned empty result.");
    } catch (error) {
      ProviderRegistry.reportFailure(primary);
      if (__DEV__)
        console.warn(
          "OCRPipeline: Primary Image OCR failed, falling back.",
          error.message,
        );
      try {
        // OCR.Space expects language as string (comma-separated)
        const result = await fallback.executeOCR(fileParams, {
          language: language,
        });
        ProviderRegistry.reportSuccess(fallback);
        if (result.text) return result;
        throw new Error("Fallback image OCR provider returned empty result.");
      } catch (fallbackError) {
        ProviderRegistry.reportFailure(fallback);
        throw new AIError({
          code: "OCR_ALL_FAILED",
          userMessage: "Failed to extract text from the image.",
          technicalMessage: `Primary and fallback failed. Fallback error: ${fallbackError.message}`,
          source: "OCRPipeline",
        });
      }
    }
  }

  static async _executeGoogleVision(fileParams, language, provider) {
    let base64;
    try {
      base64 = await FileSystem.readAsStringAsync(fileParams.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!base64) throw new Error("Image file could not be encoded for OCR.");
      return await provider.executeOCR(base64, {
        languageHints: language.split(",").map((item) => item.trim()),
      });
    } finally {
      base64 = undefined;
    }
  }
}
