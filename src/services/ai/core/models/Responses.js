/**
 * @file Responses.js
 * @description Standardized response models for AI pipelines.
 */

export class AIResponse {
    constructor({ userFacing, metadata, structuredData = null }) {
        this.userFacing = userFacing; // Markdown string for UI
        this.metadata = metadata;     // Diagnostic metadata
        if (structuredData) {
            this.structuredData = structuredData; // Optional JSON for Document Vault
        }
    }
}
