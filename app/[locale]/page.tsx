import { getTranslations } from 'next-intl/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import Nav from '@/components/site/Nav';
import PlanCard from '@/components/plans/PlanCard';
import MirrorStageMotion from '@/components/site/MirrorStageMotion';

export default async function HomePage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  const t = await getTranslations('home');
  const tp = await getTranslations('plans');

  const admin = createAdminSupabase();
  const { data: plans } = await admin.from('plans').select('*').eq('is_active', true).order('sort_order');

  return (
    <>
      <MirrorStageMotion />
      <Nav locale={locale} />

      <section className="hero">
        <div className="wrap">
          <div className="eyebrow"><span className="dot" /> {t('eyebrow')}</div>
          <h1 className="hero-title">
            {t('heroTitle1')} <span className="mir">{t('heroTitleMirror')}</span> {t('heroTitle2')}
          </h1>
          <p className="hero-sub">{t('heroSubtitle')}</p>
          <div className="hero-cta">
            <a href={`/${locale}/register`} style={{ padding: '15px 30px', borderRadius: 11, background: 'var(--ink)', color: '#fff', fontWeight: 600 }}>
              {t('ctaStart')}
            </a>
            <a href="#how" style={{ padding: '15px 30px', borderRadius: 11, border: '1px solid var(--hair)', color: 'var(--ink)', fontWeight: 600 }}>
              {t('ctaHow')}
            </a>
          </div>

          <div className="mirror-stage" id="mirror-stage">
            <div className="mirror-axis" />
            <div className="mirror-grid">
              <div className="m-side">
                <div className="m-label"><b>{t('expertLabel')}</b></div>
                <div className="feed-line"><span>BTC/USDT</span><span className="feed-side buy">BUY</span><span className="num">65,140</span></div>
                <div className="feed-line"><span>ETH/USDT</span><span className="feed-side sell">SELL</span><span className="num">3,410</span></div>
                <div className="feed-line"><span>SOL/USDT</span><span className="feed-side buy">BUY</span><span className="num">168.2</span></div>
              </div>
              <div className="m-side">
                <div className="m-label" dangerouslySetInnerHTML={{ __html: `<b>${t('youLabel')}</b>` }} />
                <div className="mirrored-card"><div><div>BTC/USDT · BUY</div><div className="mc-time">now</div></div><div className="mc-val num">+0.024</div></div>
                <div className="mirrored-card"><div><div>ETH/USDT · SELL</div><div className="mc-time">now</div></div><div className="mc-val num">+0.310</div></div>
              </div>
            </div>
            <div className="stats">
              <div className="stat"><div className="n num" data-countto="2400" data-suffix="+">0</div><div className="l">{t('statAccounts')}</div></div>
              <div className="stat"><div className="n num" data-countto="99.94" data-decimals="2" data-suffix="%">0</div><div className="l">{t('statSuccess')}</div></div>
              <div className="stat"><div className="n num">&lt;400ms</div><div className="l">{t('statSpeed')}</div></div>
              <div className="stat"><div className="n num">256</div><div className="l">{t('statEncryption')}</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <div className="section-tag">{t('howTag')}</div>
            <h2>{t('howTitle')}</h2>
          </div>
          <div className="flow">
            {[1, 2, 3].map((n) => (
              <div className="flow-step" data-reveal key={n}>
                <div className="fs-tag">{t(`step${n}Tag` as any)}</div>
                <h3>{t(`step${n}Title` as any)}</h3>
                <p>{t(`step${n}Body` as any)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <div className="section-tag">{t('featTag')}</div>
            <h2>{t('featTitle')}</h2>
          </div>
          <div className="feat-wrap" data-reveal>
            <div className="feat-main">
              <div>
                <div className="tag">{t('featMainTag')}</div>
                <h3>{t('featMainTitle')}</h3>
              </div>
              <p>{t('featMainBody')}</p>
            </div>
            <div className="feat-list">
              {[1, 2, 3, 4].map((n) => (
                <div className="feat-row" key={n}>
                  <div className="fi">0{n}</div>
                  <div>
                    <h4>{t(`feat${n}Title` as any)}</h4>
                    <p>{t(`feat${n}Body` as any)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="security">
        <div className="wrap">
          <div className="security" data-reveal>
            <div>
              <div className="section-tag">{t('secTag')}</div>
              <h2 style={{ fontSize: 28, fontWeight: 800 }}>{t('secTitle')}</h2>
              <ul className="security-list">
                <li><span className="check">✓</span> {t('sec1')}</li>
                <li><span className="check">✓</span> {t('sec2')}</li>
                <li><span className="check">✓</span> {t('sec3')}</li>
              </ul>
            </div>
            <div className="term">
              <div>&gt; POST /api/v1/users/connect-binance</div>
              <div className="l1">&gt; encrypting api_key... AES-256-GCM ✓</div>
              <div className="l1">&gt; encrypting secret_key... AES-256-GCM ✓</div>
              <div className="l2">&gt; permissions: TRADE_ONLY (withdraw: disabled)</div>
              <div>&gt; stored: encrypted_blob, nonce, tag</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <div className="section-tag">{tp('title')}</div>
            <h2>{tp('subtitle')}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
            {plans?.map((plan, i) => (
              <PlanCard key={plan.id} plan={{ ...plan, featured: i === 1 }} locale={locale} />
            ))}
          </div>

          <div className="tg-strip" data-reveal>
            <div className="tg-left">
              <div className="tg-icon">✈</div>
              <div>
                <h3>{t('tgTitle')}</h3>
                <p>{t('tgBody')}</p>
              </div>
            </div>
            <a href="#" className="btn-tg">{t('tgCta')}</a>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta-band" data-reveal>
            <h2>{t('finalCtaTitle')}</h2>
            <p>{t('finalCtaBody')}</p>
            <a href={`/${locale}/register`} style={{ padding: '15px 30px', borderRadius: 11, background: 'var(--signal)', color: '#fff', fontWeight: 600 }}>
              {t('ctaStart')}
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">© 2026 {locale === 'ar' ? 'مرآة' : "Mir'aa"} — {locale === 'ar' ? 'منصة نسخ الصفقات' : 'copy-trading platform'}.</div>
      </footer>
    </>
  );
}
