import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n.config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // /en/... and /ar/... both explicit, no ambiguity
});

export const config = {
  // run on every route except static assets, API routes, and the Supabase
  // auth callback (which lives outside [locale] and must not be locale-prefixed)
  matcher: ['/((?!api|auth/callback|_next|.*\\..*).*)'],
};
