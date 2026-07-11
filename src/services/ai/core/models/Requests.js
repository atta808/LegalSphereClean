/**
 * @file Requests.js
 * @description Standardized request models for AI pipelines.
 */

export class LexAIRequest {
    constructor({ message, query, history = [], attachment = null, fileParams = null, sessionId = null, timestamp = null }) {
        this.query = message || query; // backward compatibility for internal use
        this.attachment = attachment || fileParams;
        this.history = history;
        this.sessionId = sessionId;
        const { toISO } = require('../../../../utils/date');
        this.timestamp = timestamp || toISO(new Date());
    }
}

export class CaseAIRequest {
    constructor({ caseId, message, query, history = [], attachment = null, fileParams = null, sessionId = null, timestamp = null }) {
        if (!caseId) throw new Error('CaseAIRequest requires caseId');
        this.caseId = caseId;
        this.query = message || query;
        this.attachment = attachment || fileParams;
        this.history = history;
        this.sessionId = sessionId;
        const { toISO } = require('../../../../utils/date');
        this.timestamp = timestamp || toISO(new Date());
    }
}

export class DocumentVaultRequest {
    constructor({ attachment, fileParams, sessionId = null, timestamp = null }) {
        const file = attachment || fileParams;
        if (!file) throw new Error('DocumentVaultRequest requires attachment or fileParams');
        this.attachment = file;
        this.sessionId = sessionId;
        const { toISO } = require('../../../../utils/date');
        this.timestamp = timestamp || toISO(new Date());
    }
}
