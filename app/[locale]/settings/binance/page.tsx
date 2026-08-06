import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BinanceConnectForm from '@/components/BinanceConnectForm';
export default async function BinanceSettingsPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from('users')
    .select('binance_api_key_enc, binance_verified_capital_usdt, binance_verified_at')
    .eq('id', user.id)
    .single();

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '56px 24px' }}>
      <h1 style={{ fontSize: 26 }}>Connect Binance</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 28 }}>
        Trade-only access. We never request withdrawal permission, and reject any key that has it.
      </p>

      {profile?.binance_verified_capital_usdt != null && (
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 20 }}>
          Last verified balance: <strong className="num">{profile.binance_verified_capital_usdt} USDT</strong>
          {profile.binance_verified_at && ` — ${new Date(profile.binance_verified_at).toLocaleString(locale)}`}
        </p>
      )}

      <BinanceConnectForm alreadyConnected={!!profile?.binance_api_key_enc} />
    </main>
  );
}
