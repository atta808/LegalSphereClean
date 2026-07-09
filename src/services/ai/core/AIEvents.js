/**
 * @file AIEvents.js
 * @description Optional lifecycle hooks for AI operations.
 * Allows UI or analytics to hook into AI progress without changing the core.
 */

export class AIEvents {
    static _listeners = new Set();

    static subscribe(callback) {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    static _emit(eventType, payload) {
        for (const listener of this._listeners) {
            try {
                listener({ type: eventType, timestamp: new Date().toISOString(), ...payload });
            } catch (e) {
                if (__DEV__) console.warn('AIEvents listener error:', e);
            }
        }
    }

    static emitRequestStarted(requestType) {
        this._emit('REQUEST_STARTED', { requestType });
    }

    static emitOCRStarted() {
        this._emit('OCR_STARTED', {});
    }

    static emitOCRCompleted() {
        this._emit('OCR_COMPLETED', {});
    }

    static emitAIRequestStarted() {
        this._emit('AI_REQUEST_STARTED', {});
    }

    static emitAIRequestCompleted() {
        this._emit('AI_REQUEST_COMPLETED', {});
    }

    static emitAnalysisCompleted() {
        this._emit('ANALYSIS_COMPLETED', {});
    }

    static emitError(aiError) {
        this._emit('ERROR_OCCURRED', { error: aiError.toJSON ? aiError.toJSON() : aiError });
    }
}
