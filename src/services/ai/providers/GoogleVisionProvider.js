/**
 * @file GoogleVisionProvider.js
 * @description Provides the interface for communicating with the Google Cloud Vision API.
 * Responsible only for making requests to Google Vision for image OCR.
 */

import { AIConfig } from '../../../config/AIConfig';

/**
 * Google Cloud Vision API Provider
 */
export class GoogleVisionProvider {
    static METADATA = {
        name: 'GoogleVision',
        version: '1.0',
        capabilities: ['OCR', 'Vision']
    };

    /**
     * Executes an OCR request against the Google Vision API for an image with retry and timeout.
     *
     * @param {string} base64Image - The base64 encoded image string.
     * @param {Object} [options={}] - Options like retries and timeout.
     * @returns {Promise<string>} The extracted text from the image.
     * @throws {Error} If the API request fails.
     */
    static async executeOCR(base64Image, options = {}) {
        const { retries = 1, timeout = 25000 } = options;
        let attempt = 0;
        let lastError = null;

        while (attempt <= retries) {
            try {
                // Google Vision API requires just the base64 data, strip prefix if present
                const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

                const requestBody = {
                    requests: [
                        {
                            image: {
                                content: cleanBase64
                            },
                            features: [
                                {
                                    type: 'DOCUMENT_TEXT_DETECTION'
                                }
                            ]
                        }
                    ]
                };

                const url = `https://vision.googleapis.com/v1/images:annotate?key=${AIConfig.getGoogleVisionKey()}`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Google Vision API error (${response.status}): ${errorData}`);
                }

                const data = await response.json();

                if (data.responses && data.responses.length > 0 && data.responses[0].error) {
                     throw new Error(`Google Vision API internal error: ${data.responses[0].error.message}`);
                }

                if (!data.responses || !data.responses.length || !data.responses[0].fullTextAnnotation) {
                    return ''; // No text found
                }

                return data.responses[0].fullTextAnnotation.text;
            } catch (error) {
                lastError = error;
                attempt++;
                if (attempt <= retries) {
                    if (__DEV__) console.warn(`GoogleVisionProvider retry ${attempt}/${retries} after error:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }

        if (__DEV__) {
            console.error('GoogleVisionProvider Error (all retries failed):', lastError.message);
        }
        throw new Error(`Failed to execute Google Vision OCR request: ${lastError.message}`);
    }
}
