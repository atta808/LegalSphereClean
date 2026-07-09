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
    static _providers = new Map();
    static _health = new Map();

    static {
        // Initial Registration
        this.register('llm', DeepSeekProvider);
        this.register('ocrImage', GoogleVisionProvider);
        this.register('ocrPdf', OCRSpaceProvider);
    }

    /**
     * Registers a new provider dynamically and initializes health tracking.
     * @param {string} role - e.g., 'llm', 'ocrImage', 'ocrPdf'
     * @param {Object} providerClass - The provider implementation
     */
    static register(role, providerClass) {
        this._providers.set(role, providerClass);

        const name = providerClass.METADATA?.name || providerClass.name || 'Unknown';
        if (!this._health.has(name)) {
            this._health.set(name, {
                name: name,
                version: providerClass.METADATA?.version || 'Unknown',
                capabilities: providerClass.METADATA?.capabilities || [],
                availability: 'UNKNOWN',
                lastSuccess: null,
                failureCount: 0
            });
        }
    }

    /**
     * Resolves a provider by capability rather than strict role if needed,
     * though role-based retrieval is maintained for backward compatibility.
     */
    static getProviderByCapability(capability) {
        for (const [_, providerClass] of this._providers.entries()) {
            if (providerClass.METADATA?.capabilities?.includes(capability)) {
                return providerClass;
            }
        }
        return null;
    }

    static getLLMProvider() {
        return this._providers.get('llm');
    }

    static getImageOCRProvider() {
        return this._providers.get('ocrImage');
    }

    static getPdfOCRProvider() {
        return this._providers.get('ocrPdf');
    }

    // --- Health Monitoring ---

    static reportSuccess(providerClass) {
        const name = providerClass.METADATA?.name || providerClass.name;
        const health = this._health.get(name);
        if (health) {
            health.availability = 'ONLINE';
            health.lastSuccess = new Date().toISOString();
            health.failureCount = 0;
        }
    }

    static reportFailure(providerClass) {
        const name = providerClass.METADATA?.name || providerClass.name;
        const health = this._health.get(name);
        if (health) {
            health.failureCount += 1;
            if (health.failureCount > 3) {
                health.availability = 'OFFLINE_OR_DEGRADED';
            }
        }
    }

    static getHealthReport() {
        return Array.from(this._health.values());
    }
}
