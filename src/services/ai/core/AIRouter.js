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
    static async routeLexAI(request) {
        return await OfficeRouter.route(request);
    }

    static async routeCaseAI(request) {
        return await CaseRouter.route(request);
    }

    static async routeDocumentVault(request) {
        return await DocumentRouter.route(request);
    }
}
