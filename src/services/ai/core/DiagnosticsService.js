/**
 * @file DiagnosticsService.js
 * @description Lightweight service to report the health and configuration of the AI Core.
 */

import { ProviderRegistry } from './ProviderRegistry';
import { FeatureFlags } from '../../../config/FeatureFlags';

export class DiagnosticsService {
    /**
     * Generates a comprehensive health and configuration report of the AI Core.
     * @returns {Object} System report
     */
    static generateReport() {
        return {
            aiCoreVersion: '4.0.0-rc1',
            timestamp: new Date().toISOString(),
            engineStatus: 'ACTIVE',
            featureFlags: { ...FeatureFlags },
            providers: ProviderRegistry.getHealthReport(),
            configurationStatus: {
                // We do NOT expose actual keys, only whether they appear configured
                deepSeekConfigured: this._isConfigured('DeepSeek'),
                googleVisionConfigured: this._isConfigured('GoogleVision'),
                ocrSpaceConfigured: this._isConfigured('OCRSpace')
            }
        };
    }

    /**
     * Simple mock check for configuration presence.
     * In a real system, this might check if AIConfig functions return truthy strings.
     */
    static _isConfigured(providerName) {
         // Placeholder for actual config validation logic
         return false;
    }
}
