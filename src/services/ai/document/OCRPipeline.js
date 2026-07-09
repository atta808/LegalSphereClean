/**
 * @file OCRPipeline.js
 * @description The unified OCR Pipeline.
 * Handles routing between Google Vision (Images) and OCR.Space (PDFs) with automatic fallbacks.
 * Never duplicates OCR logic; this is the single source of truth for text extraction.
 */

import { ProviderRegistry } from '../core/ProviderRegistry';

/**
 * Unified OCR Pipeline
 */
export class OCRPipeline {
    /**
     * Executes the OCR process with automatic fallback strategy based on file type.
     *
     * @param {Object} fileParams - The file details (uri, name, type, base64 for images).
     * @returns {Promise<string>} The extracted text.
     * @throws {Error} If both primary and fallback OCR methods fail.
     */
    static async execute(fileParams) {
        if (!fileParams) throw new Error('OCRPipeline: Missing file parameters.');

        const isPdf = fileParams.type === 'application/pdf' || (fileParams.name && fileParams.name.toLowerCase().endsWith('.pdf'));

        if (isPdf) {
            return await this._executePdfWorkflow(fileParams);
        } else {
            return await this._executeImageWorkflow(fileParams);
        }
    }

    /**
     * PDF Workflow: Primary = OCR.Space, Fallback = Google Vision.
     */
    static async _executePdfWorkflow(fileParams) {
        const primary = ProviderRegistry.getPdfOCRProvider();
        const fallback = ProviderRegistry.getImageOCRProvider();

        try {
            if (__DEV__) console.log('OCRPipeline: Starting PDF workflow');
            const result = await primary.executeOCR(fileParams);
            if (result) return result;
            throw new Error('Primary PDF OCR provider returned empty result.');
        } catch (error) {
            if (__DEV__) console.warn('OCRPipeline: Primary PDF OCR failed, falling back.', error.message);
            // Note: Google Vision (fallback here) requires base64. If base64 is missing, fallback cannot proceed.
            if (!fileParams.base64) {
                 throw new Error('OCRPipeline: Fallback OCR failed. Base64 data missing.');
            }
            return await fallback.executeOCR(fileParams.base64);
        }
    }

    /**
     * Image Workflow: Primary = Google Vision, Fallback = OCR.Space.
     */
    static async _executeImageWorkflow(fileParams) {
        const primary = ProviderRegistry.getImageOCRProvider();
        const fallback = ProviderRegistry.getPdfOCRProvider();

        try {
             if (__DEV__) console.log('OCRPipeline: Starting Image workflow');
             if (!fileParams.base64) {
                 throw new Error('Image OCR primary provider requires base64 data.');
             }
             const result = await primary.executeOCR(fileParams.base64);
             if (result) return result;
             throw new Error('Primary Image OCR provider returned empty result.');
        } catch (error) {
             if (__DEV__) console.warn('OCRPipeline: Primary Image OCR failed, falling back.', error.message);
             return await fallback.executeOCR(fileParams);
        }
    }
}
