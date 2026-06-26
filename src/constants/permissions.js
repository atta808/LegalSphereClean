// 🔐 DEFAULT PERMISSIONS

export const DEFAULT_ASSOCIATE_PERMISSIONS = {
  canViewOnlyAssignedCases: true,
  canViewAllCases: false,

  canAddCase: true,
  canEditCase: true,
  canDeleteCase: false,

  canViewClientDetails: true,
  canViewClientMobile: false,
  canViewClientEmail: true,

  canViewFinance: false,
  canEditFinance: false,

  canAddHearing: true,
  canEditHearing: true,

  canAddNotes: true,
  canViewPrivateNotes: false,

  canUploadDocuments: true,
};

export const DEFAULT_CLERK_PERMISSIONS = {
  canViewOnlyAssignedCases: true,
  canViewAllCases: false,

  canAddCase: true,
  canEditCase: true,
  canDeleteCase: false,

  canViewClientDetails: true,
  canViewClientMobile: true,
  canViewClientEmail: false,

  canViewFinance: false,
  canEditFinance: false,

  canAddHearing: true,
  canEditHearing: true,
  canManageDiary: true,

  canAddNotes: true,
  canViewPrivateNotes: false,

  canUploadDocuments: false,
};

export const DEFAULT_CLIENT_PERMISSIONS = {
  canViewOwnCases: true,
  canViewCaseStatus: true,
};
