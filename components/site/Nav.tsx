import { getTranslations } from 'next-intl/server';

export default async function Nav({ locale }: { locale: 'en' | 'ar' }) {
  const t = await getTranslations('nav');
  return (
    <nav className="site-nav">
      <div className="wrap inner">
        <div className="site-logo"><div className="site-logo-mark" />{locale === 'ar' ? 'مرآة' : "Mir'aa"}</div>
        <div className="site-nav-links">
          <a href="#how">{t('howItWorks')}</a>
          <a href="#features">{t('features')}</a>
          <a href="#security">{t('security')}</a>
          <a href={`/${locale}/plans`}>{t('plans')}</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href={`/${locale}/login`} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--hair)', color: 'var(--ink)' }}>
            {t('login')}
          </a>
          <a href={`/${locale}/register`} style={{ padding: '10px 18px', borderRadius: 9, background: 'var(--ink)', color: '#fff' }}>
            {t('start')}
          </a>
        </div>
      </div>
    </nav>
  );
}
