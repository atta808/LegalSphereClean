/**
 * @file DocumentContext.js
 * @description Builds metadata context for Document Vault AI (Product 3).
 * Provides file-level metadata rather than business logic.
 */

/**
 * Document Context Builder
 */
export class DocumentContext {
    /**
     * Extracts and structures metadata for a specific document file.
     *
     * @param {Object} fileParams - The file parameters (uri, name, type, size).
     * @returns {Object} The structured document metadata context.
     */
    static build(fileParams) {
        if (!fileParams) return {};

        return {
            contextType: 'DocumentMetadata',
            timestamp: new Date().toISOString(),
            fileName: fileParams.name || 'Unknown',
            fileType: fileParams.type || 'Unknown',
            fileSize: fileParams.size || 'Unknown',
            sourceUri: fileParams.uri || 'Unknown' // Useful for debugging or logging
        };
    }
}
