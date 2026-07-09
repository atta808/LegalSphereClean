/**
 * @file DeepSeekProvider.js
 * @description Provides the interface for communicating with the DeepSeek API.
 * Responsible only for making requests to DeepSeek and handling basic API errors.
 */

import { CONFIG } from '../../../../config';

/**
 * DeepSeek AI Provider
 */
export class DeepSeekProvider {
    /**
     * Executes a prompt against the DeepSeek API with retry and timeout support.
     *
     * @param {string} prompt - The final compiled prompt string.
     * @param {Object} [options] - Optional parameters.
     * @param {number} [options.temperature=0.7] - The sampling temperature.
     * @param {number} [options.maxTokens=4000] - The maximum number of tokens to generate.
     * @param {number} [options.retries=2] - The number of times to retry on failure.
     * @param {number} [options.timeout=30000] - Timeout in milliseconds.
     * @returns {Promise<string>} The response text from DeepSeek.
     * @throws {Error} If the API request fails.
     */
    static async execute(prompt, options = {}) {
        const {
            temperature = 0.7,
            maxTokens = 4000,
            retries = 2,
            timeout = 30000
        } = options;

        let attempt = 0;
        let lastError = null;

        while (attempt <= retries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(CONFIG.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'user', content: prompt }
                        ],
                        temperature,
                        max_tokens: maxTokens
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`DeepSeek API error (${response.status}): ${errorData}`);
                }

                const data = await response.json();

                if (!data.choices || !data.choices.length || !data.choices[0].message) {
                    throw new Error('Invalid response format from DeepSeek API.');
                }

                return data.choices[0].message.content;
            } catch (error) {
                lastError = error;
                attempt++;
                if (attempt <= retries) {
                    if (__DEV__) console.warn(`DeepSeekProvider retry ${attempt}/${retries} after error:`, error.message);
                    // Simple exponential backoff
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }

        if (__DEV__) {
            console.error('DeepSeekProvider Error (all retries failed):', lastError.message);
        }
        throw new Error(`Failed to execute DeepSeek request: ${lastError.message}`);
    }
}
