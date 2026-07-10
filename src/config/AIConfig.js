/**
 * @file AIConfig.js
 * @description Centralized configuration for AI provider credentials and URLs.
 * Reads configurations from Expo environment variables.
 */

export const AIConfig = {
    getDeepSeekKey: () => process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
    getDeepSeekUrl: () => 'https://api.deepseek.com/v1/chat/completions',
    getGoogleVisionKey: () => process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY,
    getOCRSpaceKey: () => process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY,
};
