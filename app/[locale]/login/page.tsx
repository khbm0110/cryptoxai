import LoginForm from '@/components/auth/LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  return (
    <main style={{ padding: '80px 24px' }}>
      <LoginForm locale={locale} />
    </main>
  );
}
