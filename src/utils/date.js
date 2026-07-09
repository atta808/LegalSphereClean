// utils/date.js

const pad2 = (value) => String(value).padStart(2, "0");

const isValidDateParts = (year, month, day) => {
  if (!year || !month || !day) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
};

const getDateParts = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    return isValidDateParts(year, month, day) ? { year, month, day } : null;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    if (isNaN(date)) return null;
    return getDateParts(date);
  }

  const text = String(value).trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return isValidDateParts(year, month, day) ? { year, month, day } : null;
  }

  match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    return isValidDateParts(year, month, day) ? { year, month, day } : null;
  }

  const parsed = new Date(text);
  if (isNaN(parsed)) return null;

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
};

export const normalizeDateInput = (value) => {
  const parts = getDateParts(value);
  if (!parts) return "";

  return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
};

export const toDatePickerDate = (value) => {
  const parts = getDateParts(value);
  if (!parts) return new Date();

  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
};

// Convert date-only values to stable UTC-noon ISO storage.
export const toISO = (date) => {
  const parts = getDateParts(date);
  if (!parts) return null;

  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0),
  ).toISOString();
};

// Convert stored date-only values to display without device timezone drift.
export const toDisplay = (date, locale = "en-PK") => {
  const parts = getDateParts(date);
  if (!parts) return "";

  try {
    return new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0),
    ).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
  }
};

export const isToday = (date) => {
  const parts = getDateParts(date);
  if (!parts) return false;

  const today = new Date();
  return (
    parts.day === today.getDate() &&
    parts.month === today.getMonth() + 1 &&
    parts.year === today.getFullYear()
  );
};

export const isPast = (date) => {
  const parts = getDateParts(date);
  if (!parts) return false;

  const today = new Date();
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const valueUTC = Date.UTC(parts.year, parts.month - 1, parts.day);

  return valueUTC < todayUTC;
};

// Convert date to YYYY-MM-DD for calendar keys.
export const toYMD = (date) => {
  const parts = getDateParts(date);
  if (!parts) return "";

  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
};
