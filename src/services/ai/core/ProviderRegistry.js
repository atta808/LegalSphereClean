/**
 * @file ProviderRegistry.js
 * @description Decouples AI implementations from the business logic.
 * Allows plug-and-play swapping of providers (e.g., DeepSeek -> OpenAI) without
 * altering the Routers or Engine.
 */

import { DeepSeekProvider } from '../providers/DeepSeekProvider';
import { GoogleVisionProvider } from '../providers/GoogleVisionProvider';
import { OCRSpaceProvider } from '../providers/OCRSpaceProvider';

export class ProviderRegistry {
    static _providers = {
        llm: DeepSeekProvider, // Default LLM
        ocrImage: GoogleVisionProvider, // Primary for images
        ocrPdf: OCRSpaceProvider // Primary for PDFs
    };

    /**
     * Registers a new provider dynamically.
     * @param {string} role - e.g., 'llm', 'ocrImage', 'ocrPdf'
     * @param {Object} providerClass - The provider implementation
     */
    static register(role, providerClass) {
        this._providers[role] = providerClass;
    }

    /**
     * Resolves the current LLM provider.
     */
    static getLLMProvider() {
        return this._providers.llm;
    }

    /**
     * Resolves the primary Image OCR provider.
     */
    static getImageOCRProvider() {
        return this._providers.ocrImage;
    }

    /**
     * Resolves the primary PDF OCR provider.
     */
    static getPdfOCRProvider() {
        return this._providers.ocrPdf;
    }
}
