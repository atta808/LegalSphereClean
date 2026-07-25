/**
 * @file CaseContext.js
 * @description Builds the context object for a specific case, used by AI ChatRoom.
 * Includes case details, hearings, notes, citations, document vault summaries, and timeline.
 * Returns concise summaries to avoid prompt bloat.
 */

import {
  getCaseById,
  getHearingsByCaseId,
  getCaseNotesByCaseId,
  getCitationsByCaseId,
  getDocumentsByCaseId,
  getTimelineByCaseId,
  getHearingsCount,
  getNotesCount,
  getDocumentsCount,
  getCitationsCount,
  getAllClients,
  getProfile,
} from "../../sqliteService";

export class CaseContext {
  /**
   * Builds a comprehensive but concise context object for a given case.
   *
   * @param {string} caseId - The case ID.
   * @returns {Promise<Object>} The context object.
   */
  static async build(caseId) {
    if (!caseId) {
      throw new Error("CaseContext: caseId is required");
    }

    try {
      // Fetch all relevant data in parallel with limits
      const [
        caseInfo,
        hearings,
        notes,
        citations,
        documents,
        timeline,
        hearingsCount,
        notesCount,
        documentsCount,
        citationsCount,
        clients,
        officeProfile,
      ] = await Promise.all([
        getCaseById(caseId),
        getHearingsByCaseId(caseId, { limit: 5, orderBy: "hearingDate DESC" }),
        getCaseNotesByCaseId(caseId, { limit: 5 }),
        getCitationsByCaseId(caseId),
        getDocumentsByCaseId(caseId, { limit: 5 }),
        getTimelineByCaseId(caseId, { limit: 5 }),
        getHearingsCount(caseId),
        getNotesCount(caseId),
        getDocumentsCount(caseId),
        getCitationsCount(caseId),
        getAllClients(),
        getProfile(),
      ]);

      if (!caseInfo) throw new Error(`CaseContext: case ${caseId} was not found`);
      const client = clients?.find((item) => String(item.id) === String(caseInfo.clientId));

      // Build concise summaries
      const context = {
        case: {
          id: caseInfo?.id,
          title: caseInfo?.title || "",
          court: caseInfo?.court || "",
          caseNo: caseInfo?.caseNo || "",
          status: caseInfo?.status || "",
          stage: caseInfo?.stage || "",
          judge: caseInfo?.judge || "",
          clientName: caseInfo?.clientName || "",
          client: client ? {
            id: client.id,
            name: client.name || "",
            mobile: client.mobile || "",
            email: client.email || "",
          } : null,
          opponent: caseInfo?.opponent || "",
          representingSide: caseInfo?.representingSide || "",
          litigationDomain: caseInfo?.litigationDomain || "",
          // Include counts for reference
          hearingsCount: hearingsCount,
          notesCount: notesCount,
          documentsCount: documentsCount,
          citationsCount: citationsCount,
        },
        recentHearings:
          hearings
            .map(
              (h) =>
                `${h.hearingDate}: ${h.stage} - ${h.court}${h.judge ? ` (Judge: ${h.judge})` : ""}`,
            )
            .join("\n") || "No recent hearings.",
        recentNotes:
          notes.map((n) => n.text).join("\n") || "No notes available.",
        citations:
          citations.map((c) => c.citation).join("\n") || "No citations.",
        documentSummaries:
          documents
            .map((d) => `${d.name}: ${d.aiSummary || "No summary"}`)
            .join("\n") || "No documents.",
        timeline:
          timeline
            .map(
              (t) =>
                `${t.hearingDate}: ${t.description}${t.remarks ? ` (${t.remarks})` : ""}`,
            )
            .join("\n") || "No timeline events.",
        officeProfile: officeProfile ? {
          name: officeProfile.name || "",
          court: officeProfile.court || "",
          jurisdiction: officeProfile.jurisdiction || "",
          email: officeProfile.email || "",
        } : null,
      };

      if (__DEV__) {
        console.log(
          `CaseContext built for case ${caseId}: ${hearingsCount} hearings, ${notesCount} notes, ${documentsCount} documents, ${citationsCount} citations`,
        );
      }

      return context;
    } catch (error) {
      console.error("CaseContext build error:", error);
      throw error;
    }
  }
}
