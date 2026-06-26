// ============================================
// LEGALSPHERE — MASTER TAXONOMY ENGINE
// ============================================

export const mapLitigationTaxonomy = (category = "", courtType = "") => {
  const text = `${category} ${courtType}`.toLowerCase();

  // =========================================
  // DEFAULT
  // =========================================

  let result = {
    litigationDomain: "civil",
    workflowType: "general",
    procedureFamily: "CPC",
    normalizedCategory: category || "General",
    courtGroup: "Civil",
  };

  // =========================================
  // CRIMINAL
  // =========================================

  if (
    text.includes("criminal") ||
    text.includes("fir") ||
    text.includes("murder") ||
    text.includes("302") ||
    text.includes("narcotics") ||
    text.includes("hudood") ||
    text.includes("peca") ||
    text.includes("anti-rape") ||
    text.includes("money laundering") ||
    text.includes("electricity criminal") ||
    text.includes("special & local law") ||
    text.includes("illegal dispossession") ||
    text.includes("criminal appeal") ||
    text.includes("criminal revision")
  ) {
    result = {
      litigationDomain: "criminal",
      workflowType: "criminal_trial",
      procedureFamily: "CrPC",
      normalizedCategory: "Criminal Litigation",
      courtGroup: "Sessions",
    };
  }

  // =========================================
  // BAIL
  // =========================================

  if (text.includes("bail")) {
    result = {
      litigationDomain: "criminal",
      workflowType: "bail",
      procedureFamily: "CrPC",
      normalizedCategory: "Bail",
      courtGroup: "Sessions",
    };
  }
  // =========================================
  // CRIMINAL APPEAL
  // =========================================

  if (
    text.includes("criminal appeal") ||
    text.includes("appeals against judgement") ||
    text.includes("appeals against order")
  ) {
    result = {
      litigationDomain: "criminal",
      workflowType: "criminal_appeal",
      procedureFamily: "CrPC",
      normalizedCategory: "Criminal Appeal",
      courtGroup: "Sessions",
    };
  }

  // =========================================
  // CRIMINAL REVISION
  // =========================================

  if (text.includes("criminal revision")) {
    result = {
      litigationDomain: "criminal",
      workflowType: "criminal_revision",
      procedureFamily: "CrPC",
      normalizedCategory: "Criminal Revision",
      courtGroup: "Sessions",
    };
  }

  // =========================================
  // PECA
  // =========================================

  if (text.includes("peca")) {
    result = {
      litigationDomain: "criminal",
      workflowType: "cyber_crime",
      procedureFamily: "PECA",
      normalizedCategory: "Cyber Crime",
      courtGroup: "Special Court",
    };
  }

  // =========================================
  // NARCOTICS
  // =========================================

  if (text.includes("narcotics")) {
    result = {
      litigationDomain: "criminal",
      workflowType: "narcotics_trial",
      procedureFamily: "CNSA",
      normalizedCategory: "Narcotics",
      courtGroup: "Special Court",
    };
  }

  // =========================================
  // SUPERDARI
  // =========================================

  if (text.includes("superdari")) {
    result = {
      litigationDomain: "criminal",
      workflowType: "custody_release",
      procedureFamily: "CrPC",
      normalizedCategory: "Superdari",
      courtGroup: "Magistrate",
    };
  }

  // =========================================
  // TRAFFIC
  // =========================================

  if (text.includes("traffic challan")) {
    result = {
      litigationDomain: "criminal",
      workflowType: "traffic",
      procedureFamily: "Traffic Laws",
      normalizedCategory: "Traffic Challan",
      courtGroup: "Magistrate",
    };
  }

  // =========================================
  // QALANDRA
  // =========================================

  if (text.includes("qalandra")) {
    result = {
      litigationDomain: "criminal",
      workflowType: "preventive_proceeding",
      procedureFamily: "CrPC",
      normalizedCategory: "Qalandra",
      courtGroup: "Magistrate",
    };
  }

  // =========================================
  // WILDLIFE
  // =========================================

  if (text.includes("wildlife")) {
    result = {
      litigationDomain: "criminal",
      workflowType: "environmental",
      procedureFamily: "Wildlife Laws",
      normalizedCategory: "Wildlife Offence",
      courtGroup: "Magistrate",
    };
  }
  // =========================================
  // FAMILY
  // =========================================

  if (
    text.includes("family") ||
    text.includes("maintenance") ||
    text.includes("guardian") ||
    text.includes("custody") ||
    text.includes("dower")
  ) {
    result = {
      litigationDomain: "family",
      workflowType: "family_petition",
      procedureFamily: "Family Laws",
      normalizedCategory: "Family Litigation",
      courtGroup: "Family",
    };
  }

  // =========================================
  // RENT
  // =========================================

  if (text.includes("rent")) {
    result = {
      litigationDomain: "civil",
      workflowType: "rent",
      procedureFamily: "Rent Laws",
      normalizedCategory: "Rent Matter",
      courtGroup: "Civil",
    };
  }

  // =========================================
  // SUCCESSION
  // =========================================

  if (text.includes("succession") || text.includes("inheritance")) {
    result = {
      litigationDomain: "civil",
      workflowType: "succession",
      procedureFamily: "Succession Laws",
      normalizedCategory: "Succession",
      courtGroup: "Civil",
    };
  }

  // =========================================
  // SERVICE / LABOUR
  // =========================================

  if (text.includes("service") || text.includes("labour")) {
    result = {
      litigationDomain: "service",
      workflowType: "service_matter",
      procedureFamily: "Service Laws",
      normalizedCategory: "Service Matter",
      courtGroup: "Tribunal",
    };
  }

  // =========================================
  // BANKING
  // =========================================

  if (
    text.includes("bank") ||
    text.includes("finance") ||
    text.includes("loan")
  ) {
    result = {
      litigationDomain: "banking",
      workflowType: "banking_litigation",
      procedureFamily: "Banking Laws",
      normalizedCategory: "Banking Matter",
      courtGroup: "Banking Court",
    };
  }

  // =========================================
  // REVENUE
  // =========================================

  if (text.includes("revenue") || text.includes("land acquisition")) {
    result = {
      litigationDomain: "revenue",
      workflowType: "revenue_matter",
      procedureFamily: "Revenue Laws",
      normalizedCategory: "Revenue Matter",
      courtGroup: "Revenue",
    };
  }
  // =========================================
  // EXECUTION
  // =========================================

  if (text.includes("execution")) {
    result = {
      litigationDomain: "civil",
      workflowType: "execution",
      procedureFamily: "CPC",
      normalizedCategory: "Execution Proceedings",
      courtGroup: "Civil",
    };
  }

  // =========================================
  // RESTORATION
  // =========================================

  if (text.includes("restoration") || text.includes("setting aside ex-parte")) {
    result = {
      litigationDomain: "civil",
      workflowType: "restoration",
      procedureFamily: "CPC",
      normalizedCategory: "Restoration Application",
      courtGroup: "Civil",
    };
  }

  // =========================================
  // CONTEMPT
  // =========================================

  if (text.includes("contempt")) {
    result = {
      litigationDomain: "civil",
      workflowType: "contempt",
      procedureFamily: "Contempt Laws",
      normalizedCategory: "Contempt Proceedings",
      courtGroup: "Civil",
    };
  }
  // =========================================
  // CIVIL APPEAL
  // =========================================

  if (
    text.includes("civil appeal") ||
    text.includes("appeal against judgement") ||
    text.includes("appeal against order")
  ) {
    result = {
      litigationDomain: "civil",
      workflowType: "civil_appeal",
      procedureFamily: "CPC",
      normalizedCategory: "Civil Appeal",
      courtGroup: "Appellate Court",
    };
  }

  // =========================================
  // FAMILY APPEAL
  // =========================================

  if (text.includes("family appeal")) {
    result = {
      litigationDomain: "family",
      workflowType: "family_appeal",
      procedureFamily: "Family Laws",
      normalizedCategory: "Family Appeal",
      courtGroup: "Family Appellate",
    };
  }

  // =========================================
  // RENT APPEAL
  // =========================================

  if (text.includes("rent appeal")) {
    result = {
      litigationDomain: "civil",
      workflowType: "rent_appeal",
      procedureFamily: "Rent Laws",
      normalizedCategory: "Rent Appeal",
      courtGroup: "Rent Tribunal",
    };
  }

  // =========================================
  // CIVIL REVISION
  // =========================================

  if (text.includes("civil revision")) {
    result = {
      litigationDomain: "civil",
      workflowType: "civil_revision",
      procedureFamily: "CPC",
      normalizedCategory: "Civil Revision",
      courtGroup: "Appellate Court",
    };
  }
  // =========================================
  // COMMERCIAL
  // =========================================

  if (text.includes("commercial")) {
    result = {
      litigationDomain: "commercial",
      workflowType: "commercial_litigation",
      procedureFamily: "Commercial Laws",
      normalizedCategory: "Commercial Dispute",
      courtGroup: "Commercial Court",
    };
  }

  // =========================================
  // ELECTION
  // =========================================

  if (text.includes("election")) {
    result = {
      litigationDomain: "constitutional",
      workflowType: "election_dispute",
      procedureFamily: "Election Laws",
      normalizedCategory: "Election Petition",
      courtGroup: "Tribunal",
    };
  }

  // =========================================
  // GUARDIAN
  // =========================================

  if (text.includes("guardian")) {
    result = {
      litigationDomain: "family",
      workflowType: "child_guardianship",
      procedureFamily: "Guardian Laws",
      normalizedCategory: "Guardian Petition",
      courtGroup: "Family",
    };
  }

  // =========================================
  // INSOLVENCY
  // =========================================

  if (text.includes("insolvency")) {
    result = {
      litigationDomain: "civil",
      workflowType: "bankruptcy",
      procedureFamily: "Insolvency Laws",
      normalizedCategory: "Insolvency",
      courtGroup: "Civil",
    };
  }

  // =========================================
  // SMALL CLAIM
  // =========================================

  if (text.includes("small claim")) {
    result = {
      litigationDomain: "civil",
      workflowType: "small_claim",
      procedureFamily: "Small Claims",
      normalizedCategory: "Small Claim",
      courtGroup: "Civil",
    };
  }

  // =========================================
  // SUCCESSION
  // =========================================

  if (text.includes("succession") || text.includes("inheritance")) {
    result = {
      litigationDomain: "civil",
      workflowType: "inheritance",
      procedureFamily: "Succession Laws",
      normalizedCategory: "Succession",
      courtGroup: "Civil",
    };
  }
  // =========================================
  // COURT GROUP NORMALIZATION
  // =========================================

  if (
    text.includes("magistrate") ||
    text.includes("traffic") ||
    text.includes("qalandra") ||
    text.includes("minor offence")
  ) {
    result.courtGroup = "Magistrate";
  }

  if (
    text.includes("sessions") ||
    text.includes("murder") ||
    text.includes("bail") ||
    text.includes("criminal trial")
  ) {
    result.courtGroup = "Sessions";
  }

  if (
    text.includes("family") ||
    text.includes("guardian") ||
    text.includes("custody") ||
    text.includes("maintenance")
  ) {
    result.courtGroup = "Family";
  }

  if (text.includes("commercial") || text.includes("banking")) {
    result.courtGroup = "Tribunal";
  }

  if (text.includes("revenue") || text.includes("land acquisition")) {
    result.courtGroup = "Revenue";
  }

  if (text.includes("appeal") || text.includes("revision")) {
    result.courtGroup = "Appellate Court";
  }
  return result;
};
