// =====================================
// 📱 FINAL PHONE UTILS (CLEAN VERSION)
// =====================================

// 🔹 Clean number (remove spaces, dashes etc.)
const cleanNumber = (phone) => {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
};

// 🔹 Ensure + exists
const ensurePlus = (phone) => {
  if (!phone) return "";
  return phone.startsWith("+") ? phone : `+${phone}`;
};

// =====================================
// 📞 CALL
// =====================================
export const getCallLink = (fullNumber) => {
  const clean = ensurePlus(cleanNumber(fullNumber));
  return `tel:${clean}`;
};

// =====================================
// 💬 WHATSAPP
// =====================================
export const getWhatsAppLink = (fullNumber) => {
  const clean = cleanNumber(fullNumber).replace("+", "");
  return `https://wa.me/${clean}`;
};

// =====================================
// 📩 SMS
// =====================================
export const getSMSLink = (fullNumber, message = "") => {
  const clean = ensurePlus(cleanNumber(fullNumber));
  return `sms:${clean}?body=${encodeURIComponent(message)}`;
};
