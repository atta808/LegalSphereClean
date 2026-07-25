/**
 * @file FileIngestionService.js
 * @description Canonical attachment contract for every LegalSphere AI workflow.
 */

import { AIError } from "../core/models/AIError";

const MIME_TYPES_BY_EXTENSION = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export class FileIngestionService {
  static fromPickerAsset(asset) {
    return this.normalize(asset, "selected file");
  }

  static fromDocumentRecord(document) {
    return this.normalize(
      {
        uri: document?.uri,
        name: document?.name,
        mimeType: document?.mimeType,
        size: document?.fileSize,
      },
      "stored document",
    );
  }

  static normalize(attachment, label = "attachment") {
    if (!attachment || typeof attachment !== "object") {
      throw this._error("ATTACHMENT_MISSING", `A valid ${label} is required.`);
    }

    const name = typeof attachment.name === "string" ? attachment.name : "";
    const mimeType = attachment.mimeType || attachment.type || this._mimeTypeFromName(name);
    const size = attachment.size ?? attachment.fileSize ?? null;
    const normalized = { uri: attachment.uri, name, mimeType, size };

    this.validate(normalized, label);
    return normalized;
  }

  static validate(attachment, label = "attachment") {
    if (!attachment || typeof attachment !== "object") {
      throw this._error("ATTACHMENT_MISSING", `A valid ${label} is required.`);
    }
    if (typeof attachment.uri !== "string" || !attachment.uri.trim()) {
      throw this._error("ATTACHMENT_URI_MISSING", `The ${label} has no readable file URI.`);
    }
    if (typeof attachment.mimeType !== "string" || !attachment.mimeType.trim()) {
      throw this._error("ATTACHMENT_MIME_TYPE_MISSING", `The ${label} has no MIME type.`);
    }
    if (!this.isSupportedForOCR(attachment.mimeType)) {
      throw this._error(
        "ATTACHMENT_UNSUPPORTED",
        "Attach a PDF or supported image for AI document analysis.",
      );
    }
    return attachment;
  }

  static isPdf(attachment) {
    return attachment.mimeType === "application/pdf";
  }

  static isSupportedForOCR(mimeType) {
    return mimeType === "application/pdf" || mimeType?.startsWith("image/");
  }

  static _mimeTypeFromName(name) {
    const extension = name.split(".").pop()?.toLowerCase();
    return MIME_TYPES_BY_EXTENSION[extension] || "";
  }

  static _error(code, technicalMessage) {
    return new AIError({
      code,
      userMessage: "The selected file cannot be analyzed. Please choose a valid PDF or image.",
      technicalMessage,
      source: "FileIngestionService",
    });
  }
}
