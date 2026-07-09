// src/services/ai/intentDetector.js

/**
 * Deterministic, offline, rule-based intent detector for LegalSphere AI.
 * No AI calls, no database queries. Fast, synchronous string matching.
 */

const OFFICE_KEYWORDS = [
  "hearing",
  "hearings",
  "case",
  "cases",
  "client",
  "clients",
  "fee",
  "fees",
  "balance",
  "balances",
  "outstanding",
  "judge",
  "judges",
  "court",
  "courts",
  "diary",
  "dashboard",
  "timeline",
  "urgent",
  "archived",
  "pipeline",
  "overdue",
  "active",
  "note",
  "notes",
  "citation",
  "citations",
  "document",
  "documents",
  "statistic",
  "statistics",
  "office",
  "practice",
  "stage",
  "stages",
  "process fee",
  "process fees",
  "peshi",       // Urdu for hearing
  "taareekh",    // Urdu for date/hearing
  "tareekh",
  "muwakkil",    // Urdu for client
  "muqadma",     // Urdu for case
  "muqadmaat",
  "kharcha",     // Urdu for fee/expense
  "adawlat",     // Urdu for court
  "adalat",
  "faisla",      // Urdu for decision/judgment
  "aj ki",       // Urdu for today's (e.g., today's cases)
  "kal ki",      // Urdu for tomorrow's
];

const OFFICE_REGEX_PATTERNS = [
  /how many (cases|clients|hearings)/i,
  /list (my|all) (cases|clients|hearings|fees|documents|notes)/i,
  /show (me|all) (cases|clients|hearings|fees|documents|notes)/i,
  /what( are|'s| is) (my|the) (urgent|active|pipeline|archived) (cases|clients)/i,
  /what( are|'s| is) (my|the) (outstanding|pending|total) (fee|fees|balance)/i,
  /search (for )?(case|client|judge|court)s?/i,
  /today'?s (hearings|cases|diary)/i,
  /tomorrow'?s (hearings|cases|diary)/i,
  /this (week|month)'?s (hearings|cases|diary)/i,
  /next (week|month)'?s (hearings|cases|diary)/i,
  /upcoming (hearings|cases)/i,
  /find (case|client|judge|court)/i,
  /who is the judge/i,
  /what court/i,
  /which court/i,
];

/**
 * Determines if a given prompt is querying the advocate's office context/database.
 *
 * @param {string} prompt - The user's input text
 * @returns {boolean} True if office intent detected, false otherwise.
 */
export const isOfficeQuery = (prompt) => {
  if (!prompt || typeof prompt !== "string") return false;

  const lowerPrompt = prompt.toLowerCase().trim();

  // 1. Check Regex Patterns first (more specific multi-word matches)
  for (const pattern of OFFICE_REGEX_PATTERNS) {
    if (pattern.test(lowerPrompt)) {
      return true;
    }
  }

  // 2. Fallback to Keyword occurrence checking
  // We don't just want a single keyword match as it could trigger false positives
  // in general queries like "What is a case law?". We check if the prompt seems
  // predominantly office-focused or uses specific combinations.
  // A simple strategy is to check if it contains "my X" or "our X" where X is a keyword.
  for (const kw of OFFICE_KEYWORDS) {
    if (lowerPrompt.includes(`my ${kw}`) || lowerPrompt.includes(`our ${kw}`) || lowerPrompt.includes(`all ${kw}`)) {
      return true;
    }
  }

  // Allow single keyword matches if the prompt is very short (e.g., just "cases", "today hearings")
  const wordCount = lowerPrompt.split(/\s+/).length;
  if (wordCount <= 4) {
    for (const kw of OFFICE_KEYWORDS) {
      // Create word boundary check
      const wordRegex = new RegExp(`\\b${kw}\\b`, "i");
      if (wordRegex.test(lowerPrompt)) {
        return true;
      }
    }
  }

  return false;
};
