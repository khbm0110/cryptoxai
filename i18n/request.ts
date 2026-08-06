import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, Locale } from '../i18n.config';

export default getRequestConfig(async ({ locale }) => {
  const resolved = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  return {
    locale: resolved,
    messages: (await import(`../messages/${resolved}.json`)).default,
  };
});
