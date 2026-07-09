/**
 * @file Requests.js
 * @description Standardized request models for AI pipelines.
 */

export class LexAIRequest {
    constructor({ query, fileParams = null }) {
        this.query = query;
        this.fileParams = fileParams;
    }
}

export class CaseAIRequest {
    constructor({ caseId, query, fileParams = null }) {
        if (!caseId) throw new Error('CaseAIRequest requires caseId');
        this.caseId = caseId;
        this.query = query;
        this.fileParams = fileParams;
    }
}

export class DocumentVaultRequest {
    constructor({ fileParams }) {
        if (!fileParams) throw new Error('DocumentVaultRequest requires fileParams');
        this.fileParams = fileParams;
    }
}
