/**
 * @file OCRSpaceProvider.js
 * @description Provides the interface for communicating with the OCR.Space API.
 * Responsible for handling PDF and Image OCR using OCR.Space.
 */

import { CONFIG } from '../../../../config';

/**
 * OCR.Space API Provider
 */
export class OCRSpaceProvider {
    /**
     * Executes an OCR request against the OCR.Space API with retry and timeout support.
     * Uses FormData to support file URIs without loading into memory (important for RN/Expo).
     *
     * @param {Object} fileParams - File parameters.
     * @param {string} fileParams.uri - The local file URI.
     * @param {string} fileParams.name - The file name.
     * @param {string} fileParams.type - The MIME type of the file.
     * @param {Object} [options={}] - Options like retries and timeout.
     * @returns {Promise<string>} The extracted text.
     * @throws {Error} If the API request fails.
     */
    static async executeOCR(fileParams, options = {}) {
        const { retries = 1, timeout = 45000 } = options; // OCR can take longer for PDFs
        let attempt = 0;
        let lastError = null;

        while (attempt <= retries) {
            try {
                const formData = new FormData();

                // Append file
                formData.append('file', {
                    uri: fileParams.uri,
                    name: fileParams.name || 'document.pdf',
                    type: fileParams.type || 'application/pdf'
                });

                // Append settings
                formData.append('apikey', CONFIG.OCR_SPACE_API_KEY);
                formData.append('language', 'eng'); // Default to English, could be made configurable
                formData.append('isOverlayRequired', 'false');
                formData.append('detectOrientation', 'true');
                formData.append('scale', 'true');
                formData.append('OCREngine', '2'); // Engine 2 is better for PDFs and receipts

                const url = 'https://api.ocr.space/parse/image';

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        // React Native's fetch will automatically set Content-Type to multipart/form-data with the correct boundary
                        'Accept': 'application/json',
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`OCR.Space API error (${response.status}): ${errorData}`);
                }

                const data = await response.json();

                if (data.IsErroredOnProcessing) {
                    const errorMsg = data.ErrorMessage ? data.ErrorMessage.join(', ') : 'Unknown processing error';
                    throw new Error(`OCR.Space processing error: ${errorMsg}`);
                }

                if (!data.ParsedResults || !data.ParsedResults.length) {
                    return ''; // No text found
                }

                // Combine text from all pages
                const combinedText = data.ParsedResults
                    .map(result => result.ParsedText)
                    .join('\n\n')
                    .trim();

                return combinedText;
            } catch (error) {
                lastError = error;
                attempt++;
                if (attempt <= retries) {
                    if (__DEV__) console.warn(`OCRSpaceProvider retry ${attempt}/${retries} after error:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                }
            }
        }

        if (__DEV__) {
            console.error('OCRSpaceProvider Error (all retries failed):', lastError.message);
        }
        throw new Error(`Failed to execute OCR.Space request: ${lastError.message}`);
    }
}
