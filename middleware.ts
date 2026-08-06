import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n.config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // /en/... and /ar/... both explicit, no ambiguity
});

export const config = {
  // run on every route except static assets and API routes
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
