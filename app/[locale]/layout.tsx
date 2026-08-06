import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales, localeConfig, Locale } from '@/i18n.config';
import { notFound } from 'next/navigation';
import { Tajawal, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/Toast';
import '../globals.css';

const display = Tajawal({ subsets: ['arabic', 'latin'], weight: ['700', '800', '900'], variable: '--font-display' });
const body = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-mono' });

// next-intl's server APIs (getMessages, getTranslations) read headers() internally,
// which makes every page under this layout dynamic regardless of its own code.
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();
  const { dir } = localeConfig[locale as Locale];

  return (
    <html lang={locale} dir={dir} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
