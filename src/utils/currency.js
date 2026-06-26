import { countryCurrencyMap } from "../constants/currencyMap";

// 🧠 Get currency from profile or fallback
export const getCurrency = (profile) => {
  return (
    profile?.currency ||
    countryCurrencyMap[profile?.countryCode] ||
    "PKR"
  );
};

// 🌍 Get locale from profile
export const getLocale = (profile) => {
  return profile?.locale || "en-PK";
};

// 💰 Global currency formatter (PRO VERSION)
export const formatMoney = (
  amount,
  currency = "PKR",
  locale = "en-PK"
) => {
  if (amount === null || amount === undefined) return "";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch (_e) {
    return `${amount} ${currency}`;
  }
};

// ⚡ Compact version (for dashboard cards)
export const formatMoneyCompact = (
  amount,
  currency = "PKR",
  locale = "en-PK"
) => {
  if (amount === null || amount === undefined) return "";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      notation: "compact",
    }).format(amount);
  } catch (_e) {
    return `${amount} ${currency}`;
  }
};