// English is the official/default language. Arabic is the secondary locale.
// Order matters: 'en' first = default locale used when no prefix matches.
export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeConfig: Record<Locale, { dir: 'ltr' | 'rtl'; label: string }> = {
  en: { dir: 'ltr', label: 'English' },
  ar: { dir: 'rtl', label: 'العربية' },
};
