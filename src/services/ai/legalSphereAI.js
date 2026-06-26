import { askDeepSeek } from "../deepseekService";

const analyzeDocument = async ({ question, documentText }) => {
  try {
    const prompt = `
You are Lex AI, the intelligent legal assistant of LegalSphere.

Analyze the following document and provide:

1. SUMMARY
2. PARTIES
3. KEY FACTS
4. LEGAL ISSUES
5. DOCUMENT CATEGORY
6. KEYWORDS (5-15 important legal keywords)
7. RECOMMENDED ACTION

Return the response in this exact format:

SUMMARY:
...

PARTIES:
...

KEY FACTS:
...

LEGAL ISSUES:
...

DOCUMENT CATEGORY:
...

KEYWORDS:
keyword1, keyword2, keyword3

RECOMMENDED ACTION:
...

Keep the response practical and lawyer-friendly.

Document:

${documentText.slice(0, 15000)}
`;

    return await askDeepSeek(prompt);
  } catch (error) {
    console.log("❌ analyzeDocument error:", error);

    return "Failed to analyze document.";
  }
};

const analyzeCase = async ({ question, caseData }) => {
  try {
    const prompt = `
You are Lex AI.

Analyze the following case data and provide:

1. Case Summary
2. Strengths
3. Weaknesses
4. Risks
5. Recommended Next Step

Case Data:

${JSON.stringify(caseData, null, 2)}
`;

    return await askDeepSeek(prompt);
  } catch (error) {
    console.log("❌ analyzeCase error:", error);

    return "Failed to analyze case.";
  }
};

const analyzeDashboard = async ({ dashboardData }) => {
  try {
    const prompt = `
You are Lex AI.

Review this lawyer dashboard data and provide:

1. Performance Summary
2. Important Trends
3. Upcoming Risks
4. Recommendations

Dashboard Data:

${JSON.stringify(dashboardData, null, 2)}
`;

    return await askDeepSeek(prompt);
  } catch (error) {
    console.log("❌ analyzeDashboard error:", error);

    return "Failed to analyze dashboard.";
  }
};

const generalAssistant = async ({ question }) => {
  try {
    return await askDeepSeek(question);
  } catch (error) {
    console.log("❌ generalAssistant error:", error);

    return "Failed to get response.";
  }
};

export const askLegalSphereAI = async ({
  mode,
  question,
  documentText = "",
  caseData = null,
  hearingData = null,
  dashboardData = null,
}) => {
  switch (mode) {
    case "document":
      return await analyzeDocument({
        question,
        documentText,
      });

    case "case":
      return await analyzeCase({
        question,
        caseData,
      });

    case "dashboard":
      return await analyzeDashboard({
        dashboardData,
      });

    default:
      return await generalAssistant({
        question,
      });
  }
};
