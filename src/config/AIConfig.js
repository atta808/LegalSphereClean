/**
 * @file AIConfig.js
 * @description Centralized configuration for AI provider credentials and URLs.
 * Expects environment variables to be mapped here in a future milestone.
 */

export const AIConfig = {
    getDeepSeekKey: () => undefined, // Placeholder for process.env mapping
    getDeepSeekUrl: () => 'https://api.deepseek.com/v1/chat/completions',
    getGoogleVisionKey: () => undefined,
    getOCRSpaceKey: () => undefined,
};
