/**
 * @file ContextManager.js
 * @description Provides a centralized access point for context generation.
 * Avoids direct imports of specific contexts across the application.
 */

import { OfficeContext } from '../context/OfficeContext';
import { CaseContext } from '../context/CaseContext';
import { DocumentContext } from '../context/DocumentContext';

export class ContextManager {
    static async getOfficeContext() {
        return await OfficeContext.build();
    }

    static async getCaseContext(caseId) {
        return await CaseContext.build(caseId);
    }

    static getDocumentContext(fileParams) {
        return DocumentContext.build(fileParams);
    }
}
