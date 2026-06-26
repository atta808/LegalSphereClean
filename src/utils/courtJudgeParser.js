const COURT_START_PATTERNS = [
  String.raw`Additional\s+District\s+Judge`,
  String.raw`District\s+Judge`,
  String.raw`Additional\s+Sessions\s+Judge`,
  String.raw`Sessions\s+Judge`,
  String.raw`Senior\s+Civil\s+Judge`,
  String.raw`Civil\s+Judge`,
  String.raw`Additional\s+Judicial\s+Magistrate`,
  String.raw`Judicial\s+Magistrate`,
  String.raw`Special\s+Judge`,
  String.raw`Family\s+Judge`,
  String.raw`Judge\s+Family\s+Court`,
  String.raw`Banking\s+Court`,
  String.raw`Labou?r\s+Court`,
  String.raw`Anti[-\s]*Corruption\s+Court`,
  String.raw`Accountability\s+Court`,
  String.raw`Consumer\s+Court`,
  String.raw`Magistrate`,
];

const COURT_START_RE = new RegExp(
  String.raw`\b(?:${COURT_START_PATTERNS.join("|")})\b`,
  "i",
);

const COURT_STRUCTURE_RE =
  /\b(?:court|judge|magistrate|sessions|district|division|section|class|banking|labou?r|consumer|accountability|anti[-\s]*corruption)\b/i;

const JUDGE_START_RE = /\b(?:Justice|Mr|Ms|Mrs)\.?\s+/i;

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/([(])\s+/g, "$1")
    .trim();

const normalizeInline = (value = "") =>
  normalizeWhitespace(value)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/,{2,}/g, ",")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+\/\s+/g, "/")
    .trim();

const splitLines = (value = "") =>
  normalizeWhitespace(value)
    .split("\n")
    .map(normalizeInline)
    .filter(Boolean);

const trimDuplicateWords = (value = "") => {
  const words = normalizeInline(value).split(" ").filter(Boolean);

  return words
    .filter((word, index) => {
      if (index === 0) return true;
      const previous = words[index - 1].replace(/[,.]$/g, "").toLowerCase();
      const current = word.replace(/[,.]$/g, "").toLowerCase();
      return current !== previous;
    })
    .join(" ");
};

const cleanCommas = (value = "") =>
  trimDuplicateWords(value)
    .replace(/,{2,}/g, ",")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,+\s*/g, "")
    .replace(/\s*,+\s*$/g, "")
    .trim();

const hasCourtStructure = (value = "") => COURT_STRUCTURE_RE.test(value);

const hasCourtStart = (value = "") => COURT_START_RE.test(value);

const findCourtStartIndex = (value = "") => {
  const match = normalizeInline(value).match(COURT_START_RE);
  return match ? match.index : -1;
};

const stripLeadingJudge = (value = "") => {
  const text = normalizeInline(value);
  const courtIndex = findCourtStartIndex(text);

  if (courtIndex > 0 && JUDGE_START_RE.test(text.slice(0, courtIndex))) {
    return text.slice(courtIndex).trim();
  }

  return text;
};

const removeTrailingJudge = (value = "") => {
  let text = normalizeInline(value);

  text = text.replace(
    /\s+\b(?:Justice|Mr|Ms|Mrs)\.?\s+[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*\s*$/i,
    "",
  );

  text = text.replace(
    /\s+\bJudge\s+(?!Family\s+Court\b)([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*)\s*$/i,
    "",
  );

  return cleanCommas(text);
};

const extractCourtCandidate = (...values) => {
  const candidates = values.flatMap(splitLines);
  const structured = candidates.find(hasCourtStart) || candidates.find(hasCourtStructure);

  if (!structured) return "";

  const withoutLeadingJudge = stripLeadingJudge(structured);
  const courtIndex = findCourtStartIndex(withoutLeadingJudge);
  const courtText =
    courtIndex >= 0 ? withoutLeadingJudge.slice(courtIndex) : withoutLeadingJudge;

  return removeTrailingJudge(courtText);
};

const removeCourtText = (value = "", court = "") => {
  const text = normalizeInline(value);
  const courtText = normalizeInline(court);

  if (!text || !courtText) return text;

  return normalizeInline(text.replace(courtText, " "));
};

const removeCourtStructureFromJudge = (value = "") => {
  let text = normalizeInline(value);
  const courtIndex = findCourtStartIndex(text);

  if (courtIndex >= 0) {
    text = text.slice(0, courtIndex).trim();
  }

  text = text
    .replace(/\b(?:Civil|Senior|Additional|District|Sessions|Judicial|Special|Family|Banking|Labou?r|Consumer|Accountability|Anti[-\s]*Corruption)\b/gi, " ")
    .replace(/\b(?:Judge|Court|Magistrate|Division|Section[-\s]*\d+[A-Z]?|Class[-\s]*(?:I{1,3}|1|2|3)|Ist\s+Class)\b/gi, " ");

  return normalizeInline(text);
};

const extractJudgeFromLine = (value = "") => {
  const text = normalizeInline(value);
  if (!text) return "";

  const trailingJudgeMarker = text.match(
    /\bJudge\s+(?!Family\s+Court\b)([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*)\s*$/i,
  );
  if (trailingJudgeMarker && !hasCourtStructure(trailingJudgeMarker[1])) {
    return cleanCommas(trailingJudgeMarker[1]);
  }

  const justice = text.match(/\bJustice\s+[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*/i);
  if (justice) return cleanCommas(justice[0]);

  const honorific = text.match(/\b(?:Mr|Ms|Mrs)\.?\s+[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*/i);
  if (honorific) return cleanCommas(honorific[0]);

  const judgeMarker = text.match(
    /\bJudge\s+(?!Family\s+Court\b)([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*)/i,
  );
  if (judgeMarker && !hasCourtStructure(judgeMarker[1])) {
    return cleanCommas(judgeMarker[1]);
  }

  return "";
};

const extractJudgeCandidate = (court = "", ...values) => {
  const candidates = values.flatMap(splitLines);

  for (const candidate of candidates) {
    const withoutCourt = removeCourtText(candidate, court);
    const cleaned = removeCourtStructureFromJudge(withoutCourt);
    const judge = extractJudgeFromLine(cleaned) || extractJudgeFromLine(candidate);
    if (judge && !hasCourtStructure(judge)) return judge;
  }

  return "";
};

const validateJudge = (judge = "", court = "") => {
  const cleaned = cleanCommas(removeCourtStructureFromJudge(removeCourtText(judge, court)));

  if (!cleaned || hasCourtStructure(cleaned)) return "";
  if (court && cleaned.toLowerCase() === normalizeInline(court).toLowerCase()) return "";

  return cleaned;
};

const validateCourt = (court = "", judge = "") => {
  let cleaned = cleanCommas(stripLeadingJudge(court));
  const officer = normalizeInline(judge);

  if (officer) {
    cleaned = cleanCommas(cleaned.replace(officer, " "));
  }

  cleaned = removeTrailingJudge(cleaned);

  if (!hasCourtStructure(cleaned)) return cleanCommas(court);

  return cleaned;
};

export const normalizeCourtJudgeFields = (data = {}, metadata = {}) => {
  const originalCourt = normalizeWhitespace(data.court || "");
  const originalJudge = normalizeWhitespace(data.judge || "");
  const combinedText = normalizeWhitespace(`${originalJudge}\n${originalCourt}`);

  const extractedCourt = extractCourtCandidate(originalCourt, originalJudge, combinedText);
  const extractedJudge = extractJudgeCandidate(
    extractedCourt,
    originalJudge,
    originalCourt,
    combinedText,
  );

  const court = validateCourt(extractedCourt || originalCourt, extractedJudge);
  const judge = validateJudge(extractedJudge, court);

  return {
    ...data,
    court,
    judge,
    aiRawMetadata: {
      ...metadata,
      originalCourt,
      originalJudge,
      normalizedCourt: court,
      normalizedJudge: judge,
    },
  };
};
