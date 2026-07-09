/**
 * @file OCRPipeline.js
 * @description The unified OCR Pipeline.
 * Handles routing between Google Vision (Images) and OCR.Space (PDFs) with automatic fallbacks.
 * Never duplicates OCR logic; this is the single source of truth for text extraction.
 */

import { GoogleVisionProvider } from '../providers/GoogleVisionProvider';
import { OCRSpaceProvider } from '../providers/OCRSpaceProvider';

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
        try {
            if (__DEV__) console.log('OCRPipeline: Starting PDF workflow with OCR.Space');
            const result = await OCRSpaceProvider.executeOCR(fileParams);
            if (result) return result;
            throw new Error('OCR.Space returned empty result.');
        } catch (error) {
            if (__DEV__) console.warn('OCRPipeline: OCR.Space failed, falling back to Google Vision.', error.message);
            // Note: Google Vision requires base64. If base64 is missing, fallback cannot proceed.
            if (!fileParams.base64) {
                 throw new Error('OCRPipeline: Fallback to Google Vision failed. Base64 data missing.');
            }
            return await GoogleVisionProvider.executeOCR(fileParams.base64);
        }
    }

    /**
     * Image Workflow: Primary = Google Vision, Fallback = OCR.Space.
     */
    static async _executeImageWorkflow(fileParams) {
        try {
             if (__DEV__) console.log('OCRPipeline: Starting Image workflow with Google Vision');
             if (!fileParams.base64) {
                 throw new Error('Google Vision requires base64 data.');
             }
             const result = await GoogleVisionProvider.executeOCR(fileParams.base64);
             if (result) return result;
             throw new Error('Google Vision returned empty result.');
        } catch (error) {
             if (__DEV__) console.warn('OCRPipeline: Google Vision failed, falling back to OCR.Space.', error.message);
             return await OCRSpaceProvider.executeOCR(fileParams);
        }
    }
}
