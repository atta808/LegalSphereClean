// services/ai/documentReaders.js
import { extractTextWithOCR } from "./ocrService";
import mammoth from "mammoth";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Deep extraction wrapper across multiple professional file signatures.
 * @param {Object} document - The file document transaction object.
 * @param {string} targetedLanguage - Default routing flag ('eng' or 'urd')
 */
export const extractDocumentText = async (
  document,
  targetedLanguage = "eng",
) => {
  try {
    if (!document) return "";

    const extension = document.name?.split(".").pop()?.toLowerCase() || "";
    console.log(
      `📄 Initializing extraction pipeline for: ${document.name} (Ext: ${extension})`,
    );

    switch (extension) {
      case "txt":
      case "md":
      case "rtf":
        return await extractTextFile(document);

      case "docx":
        return await extractDocx(document);

      case "pdf":
        return await extractPdf(document, targetedLanguage);

      case "jpg":
      case "jpeg":
      case "png":
      case "webp":
        return await extractImageText(document, targetedLanguage);

      default:
        console.log("⚠ Non-supported legal file format signature:", extension);
        return "";
    }
  } catch (error) {
    console.log("❌ Pipeline Core Execution Exception:", error);
    return "";
  }
};

const extractTextFile = async (document) => {
  try {
    return await FileSystem.readAsStringAsync(document.uri);
  } catch (error) {
    console.log("❌ Plain text extraction failure:", error);
    return "";
  }
};

const extractDocx = async (document) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(document.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = Uint8Array.from(atob(base64), (c) =>
      c.charCodeAt(0),
    ).buffer;
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  } catch (error) {
    console.log("❌ DOCX layout compilation failure:", error);
    return "";
  }
};

const extractPdf = async (document, language) => {
  try {
    return await extractTextWithOCR(
      document.uri,
      "application/pdf",
      "document.pdf",
      language,
    );
  } catch (error) {
    console.log("❌ PDF rendering engine exception:", error);
    return "";
  }
};

const extractImageText = async (document, language) => {
  try {
    const extension = document.name?.split(".").pop()?.toLowerCase() || "jpeg";
    const mimeType = `image/${extension === "jpg" ? "jpeg" : extension}`;
    return await extractTextWithOCR(
      document.uri,
      mimeType,
      `image.${extension}`,
      language,
    );
  } catch (error) {
    console.log("❌ Image vector scanning exception:", error);
    return "";
  }
};

export const getDocumentType = (fileName = "") => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  switch (extension) {
    case "pdf":
      return "PDF";
    case "docx":
      return "DOCX";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return "IMAGE";
    default:
      return "TXT";
  }
};
