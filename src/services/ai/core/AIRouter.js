/**
 * @file AIRouter.js
 * @description The main router that delegates to specific product routers.
 * Follows the facade pattern to simplify routing from the Engine.
 */

import { OfficeRouter } from '../routing/OfficeRouter';
import { CaseRouter } from '../routing/CaseRouter';
import { DocumentRouter } from '../routing/DocumentRouter';

/**
 * Global AI Router Facade
 */
export class AIRouter {
    static async routeLexAI(query, fileParams) {
        return await OfficeRouter.route(query, fileParams);
    }

    static async routeCaseAI(caseId, query, fileParams) {
        return await CaseRouter.route(caseId, query, fileParams);
    }

    static async routeDocumentVault(fileParams) {
        return await DocumentRouter.route(fileParams);
    }
}
