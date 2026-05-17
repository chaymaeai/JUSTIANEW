// Shared footer strings for all pages
export const FOOTER_STRINGS = {
  fr: {
    about: "À propos",
    legal: "Mentions légales",
    rgpd: "RGPD",
    cookies: "Cookies",
    newsletterTitle: "Newsletter",
    newsletterDesc: "Recevez nos analyses et actualités (1×/mois).",
    emailPlaceholder: "Votre e‑mail",
    subscribe: "S'abonner",
    rights: "Tous droits réservés",
  },
  en: {
    about: "About",
    legal: "Legal Notice",
    rgpd: "GDPR",
    cookies: "Cookies",
    newsletterTitle: "Newsletter",
    newsletterDesc: "Monthly insights and updates.",
    emailPlaceholder: "Your email",
    subscribe: "Subscribe",
    rights: "All rights reserved",
  },
  ar: {
    about: "من نحن",
    legal: "إشعار قانوني",
    rgpd: "GDPR",
    cookies: "الكوكيز",
    newsletterTitle: "النشرة البريدية",
    newsletterDesc: "مقالات وتحديثات شهرية.",
    emailPlaceholder: "بريدك الإلكتروني",
    subscribe: "اشترك",
    rights: "جميع الحقوق محفوظة",
  },
} as const;

export type FooterLang = keyof typeof FOOTER_STRINGS;

